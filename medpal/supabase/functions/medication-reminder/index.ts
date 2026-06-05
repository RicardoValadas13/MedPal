import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// Runs every 5 min via cron-job.org. Sends push notifications for
// doses due in the next 15 minutes that haven't been notified yet.

const WINDOW_AHEAD_MIN = 15  // notify up to 15 min before
const WINDOW_BEHIND_MIN = 5  // catch doses missed by up to 5 min

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get('REMINDER_SECRET')!
    if (req.headers.get('x-api-key') !== secret) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }

    webpush.setVapidDetails(
      'mailto:hello@medpal.app',
      Deno.env.get('VAPID_PUBLIC_KEY')!.trim(),
      Deno.env.get('VAPID_PRIVATE_KEY')!.trim(),
    )

    // Test mode: send a ping notification to all subscriptions
    const url = new URL(req.url)
    if (url.searchParams.get('test') === 'true') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )
      const { data: subs } = await supabase.from('push_subscriptions').select('*')
      let sent = 0
      for (const sub of subs ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: '✅ MedPal notifications working!', body: 'You will be notified 15 min before each dose.', url: '/' }),
          )
          sent++
        } catch (err) {
          return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
          })
        }
      }
      return new Response(JSON.stringify({ test: true, sent, subs: subs?.length ?? 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const now = new Date()
    const todayDow = now.getDay()
    const todayDate = now.toISOString().split('T')[0]
    const windowStart = new Date(now.getTime() - WINDOW_BEHIND_MIN * 60 * 1000)
    const windowEnd = new Date(now.getTime() + WINDOW_AHEAD_MIN * 60 * 1000)
    const startHHMM = `${String(windowStart.getHours()).padStart(2, '0')}:${String(windowStart.getMinutes()).padStart(2, '0')}`
    const endHHMM = `${String(windowEnd.getHours()).padStart(2, '0')}:${String(windowEnd.getMinutes()).padStart(2, '0')}`

    // Get all active schedules due in the next 15 min with push subscriptions
    const { data: schedules, error: schedErr } = await supabase
      .from('schedules')
      .select(`
        id,
        time_of_day,
        days_of_week,
        user_medications!inner (
          id,
          display_name,
          dosage,
          is_active,
          user_id
        )
      `)
      .gte('time_of_day', startHHMM)
      .lte('time_of_day', endHHMM)

    if (schedErr) throw schedErr
    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Filter by active med + today's day of week
    const dueTodaySchedules = schedules.filter(sch => {
      const med = sch.user_medications as unknown as {
        is_active: boolean
        user_id: string
      }
      if (!med.is_active) return false
      const days = sch.days_of_week as number[]
      return days.length === 0 || days.includes(todayDow)
    })

    if (dueTodaySchedules.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check which ones we already sent today
    const scheduleIds = dueTodaySchedules.map(s => s.id)
    const { data: alreadySent } = await supabase
      .from('push_sent_log')
      .select('schedule_id')
      .in('schedule_id', scheduleIds)
      .eq('scheduled_date', todayDate)

    const sentIds = new Set((alreadySent ?? []).map(r => r.schedule_id))
    const toNotify = dueTodaySchedules.filter(s => !sentIds.has(s.id))

    if (toNotify.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'already_sent' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Group by user
    const byUser = new Map<string, typeof toNotify>()
    for (const sch of toNotify) {
      const med = sch.user_medications as unknown as { user_id: string }
      const list = byUser.get(med.user_id) ?? []
      list.push(sch)
      byUser.set(med.user_id, list)
    }

    let sent = 0
    const logEntries: { user_id: string; schedule_id: string; scheduled_date: string }[] = []
    const debug: unknown[] = []

    for (const [userId, userSchedules] of byUser) {
      const { data: sub, error: subErr } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', userId)
        .maybeSingle()

      debug.push({ userId, hasSub: !!sub, subErr: subErr?.message ?? null })
      if (!sub) continue

      const meds = userSchedules.map(s => {
        const med = s.user_medications as unknown as {
          display_name: string
          dosage: string | null
        }
        return med.dosage ? `${med.display_name} (${med.dosage})` : med.display_name
      })

      const timeLabel = userSchedules[0].time_of_day.slice(0, 5)
      const title = meds.length === 1 ? '💊 Time to take your medication' : `💊 ${meds.length} medications due`
      const body = meds.length === 1
        ? `${meds[0]} at ${timeLabel}`
        : `${meds.slice(0, 2).join(', ')}${meds.length > 2 ? ` +${meds.length - 2} more` : ''} at ${timeLabel}`

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url: '/' }),
        )
        sent++
        debug.push({ userId, pushResult: 'ok' })
        for (const sch of userSchedules) {
          logEntries.push({ user_id: userId, schedule_id: sch.id, scheduled_date: todayDate })
        }
      } catch (err) {
        const pushErr = err instanceof Error ? err.message : String(err)
        console.error(`Push to ${userId} failed:`, err)
        debug.push({ userId, pushResult: 'error', pushErr })
        if ((err as { statusCode?: number })?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('user_id', userId)
        }
      }
    }

    if (logEntries.length > 0) {
      await supabase.from('push_sent_log').upsert(logEntries, { onConflict: 'user_id,schedule_id,scheduled_date' })
    }

    return new Response(JSON.stringify({ sent, total: toNotify.length, debug }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('medication-reminder error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
