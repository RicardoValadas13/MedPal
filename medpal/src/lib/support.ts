import { useEffect, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useAuth } from '../contexts/AuthContext'

// Support messaging helpers (patient <-> MedPal admin), built on the
// existing conversations/messages tables with type = 'support'.

export type SupportMessage = {
  id: string
  conversation_id: string
  sender_type: 'admin' | 'patient' | 'agent'
  content: string
  created_at: string
}

const NOTIF_TITLE = { en: '📩 Message from MedPal', pt: '📩 Mensagem do MedPal' }

/** One support thread per patient — returns its id, creating on demand. */
export async function getOrCreateSupportConversation(userId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('type', 'support')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
  if (existing?.[0]) return existing[0].id as string

  const { data: created } = await supabase
    .from('conversations')
    .insert({ user_id: userId, type: 'support' })
    .select('id')
    .single()
  return (created?.id as string) ?? null
}

/** Marks all unread messages from `sender` in the thread as read. */
export async function markRead(
  conversationId: string,
  sender: 'admin' | 'patient'
): Promise<void> {
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .eq('sender_type', sender)
    .eq('read', false)
}

/**
 * Patient-side inbox state: live unread count for the nav badge, plus a
 * browser notification when an admin message arrives while the user is
 * not looking at the Messages tab.
 */
export function useSupportInbox(): number {
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    let disposed = false
    let convId: string | null = null
    let lang: keyof typeof NOTIF_TITLE = 'en'
    let channel: RealtimeChannel | null = null

    async function findConversation(): Promise<string | null> {
      if (convId) return convId
      const { data } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'support')
        .limit(1)
      convId = (data?.[0]?.id as string) ?? null
      return convId
    }

    async function refresh() {
      const id = await findConversation()
      if (!id || disposed) {
        setUnread(0)
        return
      }
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', id)
        .eq('sender_type', 'admin')
        .eq('read', false)
      if (!disposed) setUnread(count ?? 0)
    }

    async function notify(content: string) {
      if (!('Notification' in window) || Notification.permission !== 'granted') return
      const reg = await navigator.serviceWorker?.getRegistration()
      await reg?.showNotification(NOTIF_TITLE[lang], {
        body: content,
        icon: '/icons/icon-192.png',
        badge: '/favicon-32.png',
        tag: 'medpal-support',
      })
    }

    async function init() {
      const { data: prof } = await supabase.from('profiles').select('locale').maybeSingle()
      lang = prof?.locale?.startsWith('pt') ? 'pt' : 'en'
      await refresh()

      // RLS limits the change feed to the patient's own rows; we filter
      // to the support thread (the AI chat also inserts messages).
      channel = supabase
        .channel('support-inbox')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          payload => {
            const m = payload.new as Partial<SupportMessage>
            void (async () => {
              const id = await findConversation()
              if (!id || m.conversation_id !== id) return
              await refresh()
              if (
                payload.eventType === 'INSERT' &&
                m.sender_type === 'admin' &&
                window.location.pathname !== '/messages'
              ) {
                await notify(m.content ?? '')
              }
            })()
          }
        )
        .subscribe()
    }

    void init()
    return () => {
      disposed = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [user])

  return unread
}
