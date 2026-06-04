import { useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../contexts/AuthContext'

// Medication reminders with browser-native tools only: the page
// schedules setTimeout timers while the app is open and shows
// notifications through the service worker registration, so they
// render even when the app is minimized (as long as the page is
// alive — without Web Push the browser runs no timers for us once
// the page is fully killed; we reschedule on every open/focus).

const SNOOZE_MS = 15 * 60 * 1000
const MISSED_AFTER_MS = 60 * 60 * 1000
const ASKED_KEY = 'medpal-notif-asked'

const STRINGS = {
  en: {
    title: '💊 Time to take your medication',
    missedTitle: '⚠️ Missed medication',
    missedSuffix: 'Not confirmed for 1 hour — your caregiver may be alerted.',
    taken: '✅ I took it',
    snooze: '⏰ Remind me in 15 min',
  },
  pt: {
    title: '💊 Hora de tomar o medicamento',
    missedTitle: '⚠️ Medicamento em falta',
    missedSuffix: 'Não confirmado há 1 hora — o seu cuidador pode ser alertado.',
    taken: '✅ Já tomei',
    snooze: '⏰ Lembrar em 15 min',
  },
}

let lang: keyof typeof STRINGS = 'en'
let timers: ReturnType<typeof setTimeout>[] = []

type ReminderEvent = {
  id: string
  scheduled_at: string
  medication_id: string
  name: string
  dosage: string | null
}

function clearAllTimers() {
  timers.forEach(clearTimeout)
  timers = []
}

async function ensurePermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  // Ask once, on first login — never nag on every open
  if (localStorage.getItem(ASKED_KEY)) return false
  localStorage.setItem(ASKED_KEY, '1')
  return (await Notification.requestPermission()) === 'granted'
}

async function loadLocale(): Promise<void> {
  const { data } = await supabase.from('profiles').select('locale').maybeSingle()
  lang = data?.locale?.startsWith('pt') ? 'pt' : 'en'
}

/** Re-checks the event is still pending, then shows the notification. */
async function showReminder(event: ReminderEvent, missed: boolean): Promise<void> {
  const reg = await navigator.serviceWorker?.getRegistration()
  if (!reg) return // unsupported browser or dev mode

  const { data: current } = await supabase
    .from('intake_events')
    .select('status')
    .eq('id', event.id)
    .maybeSingle()
  if (current?.status !== 'pending') return

  const t = STRINGS[lang]
  const time = event.scheduled_at.slice(11, 16).replace(':', '')
  const body = `${event.name}${event.dosage ? ` - ${event.dosage}` : ''}`

  await reg.showNotification(missed ? t.missedTitle : t.title, {
    body: missed ? `${body}. ${t.missedSuffix}` : body,
    icon: '/icons/icon-192.png',
    badge: '/favicon-32.png',
    // One notification per medication+time; the missed follow-up
    // replaces the original instead of stacking
    tag: `medication-${event.medication_id}-${time}`,
    data: { eventId: event.id },
    actions: [
      { action: 'taken', title: t.taken },
      { action: 'snooze', title: t.snooze },
    ],
  } as NotificationOptions & { actions: { action: string; title: string }[] })
}

async function markTaken(eventId: string): Promise<void> {
  await supabase
    .from('intake_events')
    .update({ status: 'taken', responded_at: new Date().toISOString() })
    .eq('id', eventId)
}

async function snooze(eventId: string): Promise<void> {
  const { data: event } = await supabase
    .from('intake_events')
    .select('id, scheduled_at, user_medications!inner ( id, display_name, dosage )')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) return
  const med = event.user_medications as unknown as {
    id: string
    display_name: string
    dosage: string | null
  }
  timers.push(
    setTimeout(() => {
      void showReminder(
        {
          id: event.id,
          scheduled_at: event.scheduled_at,
          medication_id: med.id,
          name: med.display_name,
          dosage: med.dosage,
        },
        false
      )
    }, SNOOZE_MS)
  )
}

/**
 * Schedules a reminder for every pending dose left today, plus a
 * missed-dose follow-up 1 hour after each. Idempotent: clears previous
 * timers first, and every notification re-checks the event status
 * before showing.
 */
async function scheduleTodayReminders(): Promise<void> {
  clearAllTimers()
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const now = Date.now()
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  // Include events up to 1h in the past so their missed follow-up
  // still fires after an app restart
  const { data: events } = await supabase
    .from('intake_events')
    .select('id, scheduled_at, user_medications!inner ( id, display_name, dosage )')
    .eq('status', 'pending')
    .gte('scheduled_at', new Date(now - MISSED_AFTER_MS).toISOString())
    .lte('scheduled_at', endOfDay.toISOString())

  for (const row of events ?? []) {
    const med = row.user_medications as unknown as {
      id: string
      display_name: string
      dosage: string | null
    }
    const event: ReminderEvent = {
      id: row.id as string,
      scheduled_at: row.scheduled_at as string,
      medication_id: med.id,
      name: med.display_name,
      dosage: med.dosage,
    }
    const fireAt = new Date(event.scheduled_at).getTime()

    if (fireAt > now) {
      timers.push(setTimeout(() => void showReminder(event, false), fireAt - now))
    }
    const missedAt = fireAt + MISSED_AFTER_MS
    if (missedAt > now) {
      timers.push(setTimeout(() => void showReminder(event, true), missedAt - now))
    }
  }

  // Roll over shortly after midnight to pick up the new day's doses
  const midnight = new Date()
  midnight.setHours(24, 0, 5, 0)
  timers.push(setTimeout(() => void scheduleTodayReminders(), midnight.getTime() - now))
}

async function handleReminderAction(action: string, eventId: string): Promise<void> {
  if (action === 'taken') {
    await markTaken(eventId)
  } else if (action === 'snooze') {
    await snooze(eventId)
  }
}

/**
 * Wire up medication reminders for the logged-in session: permission
 * prompt on first login, today's schedule on open, rescheduling on
 * focus and at midnight, and handling of notification action clicks
 * (forwarded by the service worker via postMessage, or via URL params
 * when the action arrived with no window open).
 */
export function useMedicationReminders(): void {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    let disposed = false

    async function init() {
      // Action encoded in the URL (notification clicked with app closed)
      const params = new URLSearchParams(window.location.search)
      const action = params.get('reminderAction')
      const eventId = params.get('event')
      if (action && eventId) {
        await handleReminderAction(action, eventId)
        params.delete('reminderAction')
        params.delete('event')
        const query = params.toString()
        window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''))
      }

      const granted = await ensurePermission()
      if (disposed || !granted) return
      await loadLocale()
      if (disposed) return
      await scheduleTodayReminders()
    }

    function onSwMessage(e: MessageEvent) {
      const msg = e.data as { type?: string; action?: string; eventId?: string }
      if (msg?.type === 'reminder-action' && msg.action && msg.eventId) {
        void handleReminderAction(msg.action, msg.eventId)
      }
    }

    function onVisible() {
      // Timers are throttled/lost while suspended — rebuild when the
      // user comes back (idempotent)
      if (document.visibilityState === 'visible') void scheduleTodayReminders()
    }

    void init()
    navigator.serviceWorker?.addEventListener('message', onSwMessage)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      disposed = true
      clearAllTimers()
      navigator.serviceWorker?.removeEventListener('message', onSwMessage)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user])
}
