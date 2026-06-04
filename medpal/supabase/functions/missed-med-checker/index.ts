import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Scheduled checker (no user session): scans all users with the service
// role. Deployed with --no-verify-jwt and protected by a shared secret
// header so only the cron job can trigger it.

const OVERDUE_MS = 2 * 60 * 60 * 1000 // SMS the contacts after 2 hours
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // ignore events older than a day

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
  try {
    const cronSecret = Deno.env.get('CRON_SECRET')!
    if (req.headers.get('x-cron-secret') !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const now = Date.now()
    const overdueBefore = new Date(now - OVERDUE_MS).toISOString()
    const notOlderThan = new Date(now - MAX_AGE_MS).toISOString()

    // Pending doses 2-24h overdue, with their medication and owner
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
      return new Response(JSON.stringify({ checked: 0, alerted: 0 }), {
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

    let alerted = 0
    const processedEventIds: string[] = []

    // Group by user so settings/contacts/profile load once per user
    const byUser = new Map<string, typeof fresh>()
    for (const event of fresh) {
      const med = event.user_medications as unknown as {
        id: string
        display_name: string
        user_id: string
      }
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
            .select('name, phone, priority')
            .eq('user_id', userId)
            .eq('notify_missed_meds', true)
            .order('priority', { ascending: true }),
          supabase
            .from('patient_profiles')
            .select('full_name')
            .eq('id', userId)
            .maybeSingle(),
          supabase.from('profiles').select('timezone').eq('id', userId).maybeSingle(),
        ])

      // Alerts must be enabled and only critical medications qualify
      if (!settings?.missed_med_alert) continue
      const criticalIds = new Set(settings.critical_med_ids ?? [])

      for (const event of userEvents) {
        const med = event.user_medications as unknown as {
          id: string
          display_name: string
        }
        if (!criticalIds.has(med.id)) continue

        // Mark as processed even when there are no contacts, so the
        // event is not rechecked every run.
        processedEventIds.push(event.id as string)
        if (!contacts || contacts.length === 0) continue

        const name = profile?.full_name ?? 'The patient'
        const time = new Date(event.scheduled_at as string).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: account?.timezone ?? 'Europe/Lisbon',
        })
        const body = `${name} has not taken ${med.display_name} at ${time}. Please check.`

        // Priority order: contact 1 first, then 2, etc.
        for (const contact of contacts) {
          try {
            await sendSms(contact.phone as string, body)
            alerted++
          } catch (err) {
            console.error(`SMS to ${contact.name} failed:`, err)
          }
        }
      }
    }

    if (processedEventIds.length > 0) {
      await supabase
        .from('missed_med_alerts')
        .insert(processedEventIds.map(id => ({ intake_event_id: id })))
    }

    return new Response(
      JSON.stringify({ checked: fresh.length, alerted, processed: processedEventIds.length }),
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
