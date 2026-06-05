import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Twilio webhook endpoints for the missed-medication call chain.
// Deployed with --no-verify-jwt (Twilio cannot send a Supabase JWT);
// every request must carry the CALL_FLOW_SECRET token instead.
//
//   ?step=twiml&call=<id>&token=...   -> TwiML: <Gather><Play>clip</Play></Gather>
//   ?step=confirm&call=<id>&token=... -> Gather action: press 1 logs confirmation
//   ?step=status&call=<id>&token=...  -> StatusCallback: escalate on no answer

function xml(body: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>${body}</Response>`, {
    headers: { 'Content-Type': 'text/xml' },
  })
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

async function placeCall(
  to: string,
  callId: string,
  baseUrl: string,
  token: string
): Promise<string | null> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')!
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
  const from = Deno.env.get('TWILIO_FROM_NUMBER')!
  const flowUrl = `${baseUrl}/functions/v1/call-flow`

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${sid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: to,
      From: from,
      Url: `${flowUrl}?step=twiml&call=${callId}&token=${token}`,
      StatusCallback: `${flowUrl}?step=status&call=${callId}&token=${token}`,
      StatusCallbackEvent: 'completed',
      Timeout: '25',
    }),
  })
  if (!res.ok) {
    console.error(`Twilio call error ${res.status}: ${await res.text()}`)
    return null
  }
  const data = await res.json()
  return (data?.sid as string) ?? null
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    const step = url.searchParams.get('step')
    const callId = url.searchParams.get('call')

    if (token !== Deno.env.get('CALL_FLOW_SECRET')!) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }
    if (!callId) {
      return new Response(JSON.stringify({ error: 'call id required' }), { status: 400 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: call } = await supabase
      .from('missed_med_calls')
      .select('*')
      .eq('id', callId)
      .maybeSingle()
    if (!call) {
      return new Response(JSON.stringify({ error: 'Call not found' }), { status: 404 })
    }

    // --- TwiML for an answered call: play the clip inside a Gather ---
    if (step === 'twiml') {
      const { data: pub } = supabase.storage.from('call-audio').getPublicUrl(call.audio_path)
      const audioUrl = escapeXml(pub.publicUrl)
      return xml(
        `<Gather numDigits="1" timeout="8" action="${escapeXml(
          `${supabaseUrl}/functions/v1/call-flow?step=confirm&call=${callId}&token=${token}`
        )}">` +
          `<Play>${audioUrl}</Play><Play>${audioUrl}</Play>` +
          `</Gather><Hangup/>`
      )
    }

    // --- Gather action: the caregiver pressed a key ---
    if (step === 'confirm') {
      const form = await req.formData()
      const digits = form.get('Digits')?.toString() ?? ''
      if (digits === '1') {
        await supabase
          .from('missed_med_calls')
          .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
          .eq('id', callId)
        return xml(`<Say voice="alice">Thank you. Goodbye.</Say><Hangup/>`)
      }
      return xml(`<Say voice="alice">Goodbye.</Say><Hangup/>`)
    }

    // --- StatusCallback: escalate to the next contact on no answer ---
    if (step === 'status') {
      const form = await req.formData()
      const callStatus = form.get('CallStatus')?.toString() ?? ''

      if (call.status === 'confirmed') {
        return new Response(JSON.stringify({ ok: true }))
      }

      if (callStatus === 'completed') {
        // Answered and played, just no keypress
        await supabase
          .from('missed_med_calls')
          .update({ status: 'delivered' })
          .eq('id', callId)
        return new Response(JSON.stringify({ ok: true }))
      }

      // busy / no-answer / failed / canceled -> next family contact
      const { data: contacts } = await supabase
        .from('family_contacts')
        .select('name, phone')
        .eq('user_id', call.user_id)
        .eq('notify_missed_meds', true)
        .order('priority', { ascending: true })

      const nextAttempt = (call.attempt as number) + 1
      const next = contacts?.[nextAttempt]
      if (!next) {
        await supabase
          .from('missed_med_calls')
          .update({ status: 'exhausted' })
          .eq('id', callId)
        return new Response(JSON.stringify({ ok: true, exhausted: true }))
      }

      const sid = await placeCall(next.phone as string, callId, supabaseUrl, token!)
      await supabase
        .from('missed_med_calls')
        .update({
          attempt: nextAttempt,
          contact_name: next.name,
          contact_phone: next.phone,
          twilio_call_sid: sid,
          status: sid ? 'calling' : 'failed',
        })
        .eq('id', callId)
      return new Response(JSON.stringify({ ok: true, escalated: nextAttempt }))
    }

    return new Response(JSON.stringify({ error: 'Unknown step' }), { status: 400 })
  } catch (err) {
    console.error('call-flow error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
