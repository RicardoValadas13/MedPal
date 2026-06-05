import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Scheduled checker (no user session): scans all users with the service
// role. Deployed with --no-verify-jwt and protected by a shared secret
// header so only the cron job can trigger it.
//
// When a critical dose is unconfirmed for 8 hours, the caregiver gets a
// real phone call: ElevenLabs generates the spoken alert, the clip is
// uploaded to the public call-audio bucket, and Twilio calls the family
// contacts in priority order (escalation handled by call-flow).

const OVERDUE_MS = 8 * 60 * 60 * 1000 // call the contacts after 8 hours
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // ignore events older than a day

const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'

function buildScript(
  locale: string,
  name: string,
  medication: string,
  lastTaken: string
): string {
  if (locale.startsWith('pt')) {
    return (
      `Olá, aqui é o MedPal. ${name} não tomou o medicamento ${medication} ` +
      `nas últimas 8 horas. A última dose confirmada foi às ${lastTaken}. ` +
      `Por favor, verifique o estado do paciente o mais rapidamente possível. ` +
      `Prima 1 para confirmar que recebeu esta mensagem.`
    )
  }
  return (
    `Hello, this is MedPal. ${name} has not taken their ${medication} ` +
    `for the last 8 hours. Their last confirmed dose was at ${lastTaken}. ` +
    `Please check on them as soon as possible. ` +
    `Press 1 to confirm you received this message.`
  )
}

async function generateClip(text: string): Promise<Uint8Array | null> {
  const key = Deno.env.get('ELEVENLABS_API_KEY')!
  const voiceId = Deno.env.get('ELEVENLABS_VOICE_ID') ?? DEFAULT_VOICE_ID
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.6, similarity_boost: 0.75 },
    }),
  })
  if (!res.ok) {
    console.error(`ElevenLabs error ${res.status}: ${await res.text()}`)
    return null
  }
  return new Uint8Array(await res.arrayBuffer())
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
    const cronSecret = Deno.env.get('CRON_SECRET')!
    if (req.headers.get('x-cron-secret') !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }
    const callFlowSecret = Deno.env.get('CALL_FLOW_SECRET')!

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const now = Date.now()
    const overdueBefore = new Date(now - OVERDUE_MS).toISOString()
    const notOlderThan = new Date(now - MAX_AGE_MS).toISOString()

    // Pending doses 8-24h overdue, with their medication and owner
    const { data: events, error: eventsError } = await supabase
      .from('intake_events')
      .select(
        'id, scheduled_at, user_medications!inner ( id, display_name, user_id )'
      )
      .eq('status', 'pending')
      .lte('scheduled_at', overdueBefore)
      .gte('scheduled_at', notOlderThan)

    if (eventsError) throw eventsError
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ checked: 0, calls: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Drop events we already alerted on
    const { data: alreadyAlerted } = await supabase
      .from('missed_med_alerts')
      .select('intake_event_id')
      .in('intake_event_id', events.map(e => e.id))
    const alertedIds = new Set((alreadyAlerted ?? []).map(a => a.intake_event_id))
    const fresh = events.filter(e => !alertedIds.has(e.id))

    let calls = 0
    const processedEventIds: string[] = []

    // Group by user so settings/contacts/profile load once per user
    const byUser = new Map<string, typeof fresh>()
    for (const event of fresh) {
      const med = event.user_medications as unknown as { user_id: string }
      const list = byUser.get(med.user_id) ?? []
      list.push(event)
      byUser.set(med.user_id, list)
    }

    for (const [userId, userEvents] of byUser) {
      const [{ data: settings }, { data: contacts }, { data: profile }, { data: account }] =
        await Promise.all([
          supabase
            .from('caregiver_settings')
            .select('missed_med_alert, critical_med_ids')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('family_contacts')
            .select('name, phone')
            .eq('user_id', userId)
            .eq('notify_missed_meds', true)
            .order('priority', { ascending: true }),
          supabase
            .from('patient_profiles')
            .select('full_name')
            .eq('id', userId)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('locale, timezone')
            .eq('id', userId)
            .maybeSingle(),
        ])

      // Alerts must be enabled and only critical medications qualify
      if (!settings?.missed_med_alert) continue
      const criticalIds = new Set(settings.critical_med_ids ?? [])
      const locale = account?.locale ?? 'en'

      for (const event of userEvents) {
        const med = event.user_medications as unknown as {
          id: string
          display_name: string
        }
        if (!criticalIds.has(med.id)) continue

        // Mark as processed even when there are no contacts, so the
        // event is not rechecked every run.
        processedEventIds.push(event.id as string)
        const first = contacts?.[0]
        if (!first) continue

        const name = profile?.full_name ?? 'The patient'

        // Last confirmed dose of this medication
        const { data: lastDose } = await supabase
          .from('intake_events')
          .select('responded_at')
          .eq('user_medication_id', med.id)
          .eq('status', 'taken')
          .not('responded_at', 'is', null)
          .order('responded_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        const lastTaken = lastDose?.responded_at
          ? new Date(lastDose.responded_at as string).toLocaleTimeString(
              locale.startsWith('pt') ? 'pt-PT' : 'en-GB',
              {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: account?.timezone ?? 'Europe/Lisbon',
              }
            )
          : locale.startsWith('pt')
            ? 'hora desconhecida'
            : 'an unknown time'

        const script = buildScript(locale, name, med.display_name, lastTaken)

        const clip = await generateClip(script)
        if (!clip) continue

        // Create the alert chain row, upload the clip, place call #1
        const { data: callRow } = await supabase
          .from('missed_med_calls')
          .insert({
            user_id: userId,
            intake_event_id: event.id,
            script,
            contact_name: first.name,
            contact_phone: first.phone,
          })
          .select('id')
          .single()
        if (!callRow) continue

        const audioPath = `${userId}/${callRow.id}.mp3`
        const { error: uploadError } = await supabase.storage
          .from('call-audio')
          .upload(audioPath, clip, { contentType: 'audio/mpeg', upsert: true })
        if (uploadError) {
          console.error('audio upload failed:', uploadError)
          await supabase
            .from('missed_med_calls')
            .update({ status: 'failed' })
            .eq('id', callRow.id)
          continue
        }

        const sid = await placeCall(
          first.phone as string,
          callRow.id as string,
          supabaseUrl,
          callFlowSecret
        )
        await supabase
          .from('missed_med_calls')
          .update({
            audio_path: audioPath,
            twilio_call_sid: sid,
            status: sid ? 'calling' : 'failed',
          })
          .eq('id', callRow.id)
        if (sid) calls++
      }
    }

    if (processedEventIds.length > 0) {
      await supabase
        .from('missed_med_alerts')
        .insert(processedEventIds.map(id => ({ intake_event_id: id })))
    }

    return new Response(
      JSON.stringify({ checked: fresh.length, calls, processed: processedEventIds.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('missed-med-checker error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
