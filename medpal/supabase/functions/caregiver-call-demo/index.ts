import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Vibe-o-thon demo: simulates the AI agent calling the caregiver about
// a missed medication and returns the spoken message as audio. No real
// phone call is made — the browser plays the clip.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Same voice as the emergency announcement
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

const FALLBACK_NAME = 'Maria Müller'

function buildScript(locale: string, name: string, lastTaken: string): string {
  if (locale.startsWith('pt')) {
    return (
      `Olá, aqui é o MedPal, o assistente de saúde automático de ${name}. ` +
      `Estou a ligar para informar que ${name} não tomou o seu Ibuprofeno 400mg ` +
      `nas últimas 12 horas. A última dose confirmada foi às ${lastTaken}. ` +
      `Por favor, verifique o estado do paciente o mais rapidamente possível. Obrigado.`
    )
  }
  return (
    `Hello, this is MedPal, the automated health assistant for ${name}. ` +
    `I'm calling to inform you that ${name} has not taken their Ibuprofen 400mg ` +
    `for the last 12 hours. Their last confirmed dose was at ${lastTaken}. ` +
    `Please check on them as soon as possible. Thank you.`
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY')!
    const voiceId = Deno.env.get('ELEVENLABS_VOICE_ID') ?? DEFAULT_VOICE_ID

    // Hybrid auth (same pattern as chat-agent): real session -> RLS
    // client; public demo -> demo user via service role.
    let supabase = createClient(supabaseUrl, supabaseServiceKey)
    let userId = DEMO_USER_ID
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const {
        data: { user },
      } = await userClient.auth.getUser()
      if (user) {
        supabase = userClient
        userId = user.id
      }
    }

    const [{ data: account }, { data: profile }, { data: lastDose }] = await Promise.all([
      supabase.from('profiles').select('locale, timezone').eq('id', userId).maybeSingle(),
      supabase.from('patient_profiles').select('full_name').eq('id', userId).maybeSingle(),
      supabase
        .from('intake_events')
        .select('responded_at, user_medications!inner ( user_id )')
        .eq('user_medications.user_id', userId)
        .eq('status', 'taken')
        .not('responded_at', 'is', null)
        .order('responded_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const locale = account?.locale ?? 'en'
    const name = profile?.full_name?.trim() || FALLBACK_NAME

    // Demo fallback when no confirmed dose exists
    let lastTaken = locale.startsWith('pt') ? 'ontem às 20:00' : 'yesterday at 8:00 PM'
    if (lastDose?.responded_at) {
      lastTaken = new Date(lastDose.responded_at as string).toLocaleTimeString(
        locale.startsWith('pt') ? 'pt-PT' : 'en-GB',
        { hour: '2-digit', minute: '2-digit', timeZone: account?.timezone ?? 'Europe/Lisbon' }
      )
    }

    const text = buildScript(locale, name, lastTaken)

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
      // ElevenLabs unavailable (quota, plan, account flag) — hand the
      // script to the client so it can fall back to the browser's
      // built-in speech synthesis. The demo must never die on stage.
      console.error(`ElevenLabs error ${ttsResponse.status}: ${await ttsResponse.text()}`)
      return new Response(JSON.stringify({ fallback: true, script: text, locale }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(ttsResponse.body, {
      headers: { ...CORS_HEADERS, 'Content-Type': 'audio/mpeg' },
    })
  } catch (err) {
    console.error('caregiver-call-demo error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
