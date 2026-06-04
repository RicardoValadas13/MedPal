import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendSms(to: string, body: string): Promise<void> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')!
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')!
  const from = Deno.env.get('TWILIO_FROM_NUMBER')!

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${sid}:${token}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    }
  )
  if (!res.ok) {
    throw new Error(`Twilio error ${res.status}: ${await res.text()}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // User-scoped client — RLS restricts all reads to the caller's rows.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const [{ data: profile }, { data: account }, { data: contacts }] = await Promise.all([
      supabase
        .from('patient_profiles')
        .select('full_name, address, floor')
        .maybeSingle(),
      supabase.from('profiles').select('timezone').maybeSingle(),
      supabase
        .from('family_contacts')
        .select('name, phone, priority')
        .eq('notify_emergency', true)
        .order('priority', { ascending: true }),
    ])

    if (!contacts || contacts.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const name = profile?.full_name ?? 'The patient'
    const address = profile?.address ?? 'unknown address'
    const floorPart = profile?.floor ? `, floor ${profile.floor}` : ''
    const time = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: account?.timezone ?? 'Europe/Lisbon',
    })

    const body =
      `EMERGENCY: ${name} pressed the emergency button at ${time}. ` +
      `Address: ${address}${floorPart}. Please check immediately.`

    // All emergency contacts are notified; priority sets the order so
    // contact 1's phone rings/buzzes first.
    const results = await Promise.allSettled(
      contacts.map(
        (c, i) =>
          new Promise<void>((resolve, reject) => {
            setTimeout(() => sendSms(c.phone as string, body).then(resolve, reject), i * 500)
          })
      )
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    const failed = results.length - sent
    if (sent === 0 && failed > 0) {
      throw new Error('All emergency SMS sends failed')
    }

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('emergency-alert error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
