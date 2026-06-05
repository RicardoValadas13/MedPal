/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

// Offline shell only — precache the built app shell and static assets.
// No runtime caching on purpose: Supabase data, auth and Edge Function
// calls always hit the network.
self.skipWaiting()
clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

// ============================================================
// Web push (server-sent reminders)
// ============================================================
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let payload: { title: string; body: string; url?: string }
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'MedPal', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'medication-reminder',
      data: { url: payload.url ?? '/' },
    } as NotificationOptions)
  )
})

// ============================================================
// Notification clicks
// ============================================================
// Two notification families share this handler:
// - Medication reminders scheduled by the page (src/lib/reminders.ts)
//   carry data.eventId and taken/snooze actions — forwarded to an open
//   window via postMessage, or encoded in the URL of a fresh one (the
//   app owns the Supabase session, so DB writes happen there).
// - Push notifications carry data.url to navigate to.
self.addEventListener('notificationclick', event => {
  const action = event.action // '' | 'taken' | 'snooze'
  const data = (event.notification.data ?? {}) as { eventId?: string; url?: string }
  event.notification.close()

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      if (data.eventId) {
        if (windows.length > 0) {
          windows[0].postMessage({ type: 'reminder-action', action, eventId: data.eventId })
          // Snoozing shouldn't yank the app to the foreground
          if (action !== 'snooze') await windows[0].focus()
          return
        }
        const params = action ? `/?reminderAction=${action}&event=${data.eventId}` : '/'
        await self.clients.openWindow(params)
        return
      }

      const url = data.url ?? '/'
      const existing = windows.find(c => c.url.startsWith(self.location.origin))
      if (existing) {
        await existing.focus()
        await existing.navigate(url)
      } else {
        await self.clients.openWindow(url)
      }
    })()
  )
})
