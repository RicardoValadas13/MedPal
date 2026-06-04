/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
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
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

// ============================================================
// Medication reminder actions
// ============================================================
// Notifications are scheduled by the page (src/lib/reminders.ts) via
// registration.showNotification. Action clicks land here; the actual
// Supabase write happens in the app (it owns the auth session), so we
// forward the action to an open window, or open one with the action
// encoded in the URL.
self.addEventListener('notificationclick', event => {
  const action = event.action // '' | 'taken' | 'snooze'
  const eventId = (event.notification.data as { eventId?: string } | undefined)?.eventId
  event.notification.close()

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      if (windows.length > 0) {
        windows[0].postMessage({ type: 'reminder-action', action, eventId })
        // Snoozing shouldn't yank the app to the foreground
        if (action !== 'snooze') await windows[0].focus()
        return
      }

      const params = action && eventId ? `/?reminderAction=${action}&event=${eventId}` : '/'
      await self.clients.openWindow(params)
    })()
  )
})
