import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HISTORY_LIMIT = 20

const SYSTEM_PROMPT = `You are the MedPal assistant — a careful, friendly helper inside a medication-management app for patients in Portugal.

You receive the user's current medication list, schedules, today's intake status, and recent check-ins as context. Use them to answer questions about the user's own regimen: what they take, when, whether they took it, refill timing, and general information about their medications.

Hard rules:
- You are not a doctor. Never diagnose, never recommend starting, stopping, or changing a dose — that is the prescriber's call. Say so when asked.
- Never invent medication leaflet content. For official leaflet details, point the user to the "patient leaflet" link on the medication in the app (sourced from INFARMED's Infomed).
- If the user describes symptoms that could be an emergency (chest pain, trouble breathing, stroke signs, severe allergic reaction, overdose, self-harm), tell them to call 112 immediately.
- For anything beyond general information or the user's own data, recommend their doctor or pharmacist.
- Reply in the language the user writes in.
- Be concise: short paragraphs, plain language, no medical jargon without explanation.`

interface ContextMedication {
  id: string
  display_name: string
  dosage: string | null
  schedules: Array<{ time_of_day: string; days_of_week: number[]; with_food: boolean }>
}

function formatContext(
  medications: ContextMedication[],
  todayEvents: Array<{ medication_name: string; scheduled_at: string; status: string }>,
  lastCheckin: { recorded_at: string; mood: number | null; side_effects: string[] | null } | null
): string {
  const meds =
    medications.length > 0
      ? medications
          .map((m) => {
            const times = m.schedules
              .map((s) => `${s.time_of_day}${s.with_food ? ' (with food)' : ''}`)
              .join(', ')
            return `- ${m.display_name}${m.dosage ? ` ${m.dosage}` : ''}${times ? ` — at ${times}` : ''}`
          })
          .join('\n')
      : 'none'

  const today =
    todayEvents.length > 0
      ? todayEvents
          .map((e) => `- ${e.medication_name} at ${e.scheduled_at.slice(11, 16)}: ${e.status}`)
          .join('\n')
      : 'no doses scheduled today'

  const checkin = lastCheckin
    ? `${lastCheckin.recorded_at.slice(0, 10)} — mood ${lastCheckin.mood ?? 'n/a'}/5, side effects: ${
        lastCheckin.side_effects?.length ? lastCheckin.side_effects.join(', ') : 'none'
      }`
    : 'none recorded'

  return `User context (from the app database):

Active medications:
${meds}

Today's doses:
${today}

Most recent check-in: ${checkin}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    // User-scoped client: every query below runs under the caller's JWT,
    // so RLS guarantees we only ever touch this user's rows.
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

    const { conversation_id, message } = await req.json()
    if (typeof message !== 'string' || !message.trim()) {
      return new Response(JSON.stringify({ error: 'message is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Find or create the conversation
    let conversationId: string = conversation_id
    if (conversationId) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .single()
      if (!conv) {
        return new Response(JSON.stringify({ error: 'Conversation not found' }), {
          status: 404,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }
    } else {
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({ user_id: user.id })
        .select('id')
        .single()
      if (convError || !conv) throw new Error('Failed to create conversation')
      conversationId = conv.id
    }

    // Load context: active medications + schedules
    const { data: medications } = await supabase
      .from('user_medications')
      .select('id, display_name, dosage, schedules ( time_of_day, days_of_week, with_food )')
      .eq('is_active', true)

    const contextMeds: ContextMedication[] = (medications ?? []).map((m) => ({
      id: m.id as string,
      display_name: m.display_name as string,
      dosage: m.dosage as string | null,
      schedules: (m.schedules ?? []) as ContextMedication['schedules'],
    }))

    // Today's intake events
    const today = new Date().toISOString().slice(0, 10)
    const { data: events } = await supabase
      .from('intake_events')
      .select('scheduled_at, status, user_medications ( display_name )')
      .gte('scheduled_at', `${today}T00:00:00`)
      .lte('scheduled_at', `${today}T23:59:59`)

    const todayEvents = (events ?? []).map((e) => ({
      medication_name:
        ((e.user_medications as { display_name?: string } | null)?.display_name as string) ??
        'medication',
      scheduled_at: e.scheduled_at as string,
      status: e.status as string,
    }))

    // Most recent check-in
    const { data: checkins } = await supabase
      .from('checkins')
      .select('recorded_at, mood, side_effects')
      .order('recorded_at', { ascending: false })
      .limit(1)

    // Conversation history (oldest first, capped)
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(HISTORY_LIMIT)

    // Persist the user message
    const { error: userMsgError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message.trim(),
    })
    if (userMsgError) throw new Error('Failed to save message')

    const contextBlock = formatContext(
      contextMeds,
      todayEvents,
      (checkins?.[0] as {
        recorded_at: string
        mood: number | null
        side_effects: string[] | null
      } | null) ?? null
    )

    const anthropic = new Anthropic({ apiKey: anthropicKey })
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\n${contextBlock}`,
      messages: [
        ...(history ?? []).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content as string,
        })),
        { role: 'user' as const, content: message.trim() },
      ],
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''
    if (!reply) throw new Error('Empty response from model')

    // Persist the assistant message, recording which rows informed it
    const { error: assistantMsgError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: reply,
      context_refs: { medication_ids: contextMeds.map((m) => m.id) },
    })
    if (assistantMsgError) throw new Error('Failed to save reply')

    return new Response(JSON.stringify({ conversation_id: conversationId, reply }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('chat-agent error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
