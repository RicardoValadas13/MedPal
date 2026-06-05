import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  getOrCreateSupportConversation,
  markRead,
  type SupportMessage,
} from '../lib/support'
import { pt } from '../i18n/pt'

export function MessagesPage() {
  const { user } = useAuth()
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [resolved, setResolved] = useState(false)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    let channel: RealtimeChannel | null = null

    async function load() {
      const convId = await getOrCreateSupportConversation(user!.id)
      if (!convId || cancelled) return
      setConversationId(convId)

      const [{ data: conv }, { data: history }] = await Promise.all([
        supabase.from('conversations').select('resolved').eq('id', convId).maybeSingle(),
        supabase
          .from('messages')
          .select('id, conversation_id, sender_type, content, created_at')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true }),
      ])
      if (cancelled) return
      setResolved(conv?.resolved ?? false)
      setMessages((history as SupportMessage[]) ?? [])
      await markRead(convId, 'admin')

      channel = supabase
        .channel(`support-thread-${convId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${convId}`,
          },
          payload => {
            const m = payload.new as SupportMessage
            setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]))
            if (m.sender_type === 'admin') {
              setResolved(false)
              void markRead(convId, 'admin')
            }
          }
        )
        .subscribe()
    }

    void load()
    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || !conversationId || sending) return
    setSending(true)
    setInput('')

    const { data: inserted } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        sender_type: 'patient',
        content: text,
      })
      .select('id, conversation_id, sender_type, content, created_at')
      .single()

    if (inserted) {
      const m = inserted as SupportMessage
      setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]))
      // A patient reply reopens a resolved thread
      if (resolved) {
        await supabase.from('conversations').update({ resolved: false }).eq('id', conversationId)
        setResolved(false)
      }
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col h-[calc(100svh-72px-56px)] px-5 pt-6 pb-4">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#192830] mb-1">
        {pt.messages.title}
      </h1>
      <p className="text-sm text-[#43474a] mb-4">{pt.messages.subtitle}</p>

      {resolved && (
        <p className="text-[13px] font-medium text-[#49654d] bg-[#cbebcd]/50 rounded-lg px-3 py-2 mb-3">
          {pt.messages.resolvedNote}
        </p>
      )}

      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-center px-6">
            <p className="text-sm font-medium text-[#73787b]">{pt.messages.empty}</p>
          </div>
        )}
        {messages.map(m => (
          <div
            key={m.id}
            className={`flex ${m.sender_type === 'patient' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                m.sender_type === 'patient'
                  ? 'bg-[#192830] text-white'
                  : 'bg-white border border-[#c3c7ca] text-[#1b1c1a]'
              }`}
            >
              {m.sender_type === 'admin' && (
                <p className="text-xs font-bold text-[#49654d] mb-1">{pt.messages.adminName}</p>
              )}
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 mt-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={pt.messages.inputPlaceholder}
          className="flex-1 px-4 py-3 text-base rounded-lg border-[1.5px] border-[#c3c7ca] bg-white text-[#1b1c1a] placeholder:text-[#73787b] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] transition"
        />
        <button
          type="submit"
          disabled={sending || !input.trim() || !conversationId}
          aria-label={pt.messages.send}
          className="px-4 min-h-[48px] bg-[#49654d] text-white rounded-lg hover:opacity-[0.88] active:scale-[0.98] transition disabled:opacity-40 flex items-center justify-center"
        >
          <Send size={20} strokeWidth={2} />
        </button>
      </form>
    </div>
  )
}
