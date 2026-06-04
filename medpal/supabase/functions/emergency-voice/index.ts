import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Premade multilingual ElevenLabs voice; override with ELEVENLABS_VOICE_ID.
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'

// The clip contains the message 5 times with 2s pauses baked in
// (so a 112 operator has time to write the details down) — generated
// server-side because mobile browsers pause/throttle web audio and JS
// timers once the dialer takes the foreground.
const REPEAT_COUNT = 5
const PAUSE_TAG = '<break time="2.0s" />'

function buildMessage(
  locale: string,
  profile: { full_name: string | null; address: string | null; floor: string | null }
): string {
  const name = profile.full_name ?? ''
  const address = profile.address ?? ''
  const floor = profile.floor ?? ''

  if (locale.startsWith('pt')) {
    const floorPart = floor ? `, andar ${floor}` : ''
    return `Chamo-me ${name}. Estou em ${address}${floorPart}. Preciso de ajuda imediata.`
  }
  const floorPart = floor ? `, floor ${floor}` : ''
  return `I am ${name}, located at ${address}${floorPart}. I need immediate help.`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY')!
    const voiceId = Deno.env.get('ELEVENLABS_VOICE_ID') ?? DEFAULT_VOICE_ID

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

    // Respect the caregiver toggle
    const { data: settings } = await supabase
      .from('caregiver_settings')
      .select('emergency_voice')
      .maybeSingle()
    if (settings && !settings.emergency_voice) {
      return new Response(JSON.stringify({ enabled: false }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const [{ data: profile }, { data: account }] = await Promise.all([
      supabase
        .from('patient_profiles')
        .select('full_name, address, floor')
        .maybeSingle(),
      supabase.from('profiles').select('locale').maybeSingle(),
    ])

    if (!profile?.full_name || !profile?.address) {
      // Without name + address the announcement is useless — tell the
      // client to skip it rather than play an empty message.
      return new Response(JSON.stringify({ enabled: false, reason: 'profile_incomplete' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const message = buildMessage(account?.locale ?? 'en', profile)
    const text = Array(REPEAT_COUNT).fill(message).join(` ${PAUSE_TAG} `)

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.6, similarity_boost: 0.75 },
        }),
      }
    )

    if (!ttsResponse.ok) {
      const body = await ttsResponse.text()
      throw new Error(`ElevenLabs API error ${ttsResponse.status}: ${body}`)
    }

    return new Response(ttsResponse.body, {
      headers: { ...CORS_HEADERS, 'Content-Type': 'audio/mpeg' },
    })
  } catch (err) {
    console.error('emergency-voice error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
