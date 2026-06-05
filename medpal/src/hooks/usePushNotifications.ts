import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export type NotificationState = 'unsupported' | 'default' | 'granted' | 'denied' | 'loading'

export function usePushNotifications() {
  const { user } = useAuth()
  const [state, setState] = useState<NotificationState>('loading')

  const isSupported =
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window

  useEffect(() => {
    if (!isSupported) { setState('unsupported'); return }
    setState(Notification.permission as NotificationState)
  }, [isSupported])

  async function subscribe(): Promise<boolean> {
    if (!isSupported || !user) return false
    setState('loading')

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        return false
      }

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      })

      const subJson = sub.toJSON() as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }

      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      }, { onConflict: 'user_id' })

      setState('granted')
      return true
    } catch (err) {
      console.error('Push subscribe error:', err)
      setState(Notification.permission as NotificationState)
      return false
    }
  }

  async function unsubscribe(): Promise<void> {
    if (!isSupported || !user) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
    await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
    setState('default')
  }

  return { state, subscribe, unsubscribe, isSupported }
}
