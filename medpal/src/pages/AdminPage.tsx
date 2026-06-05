import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Check, RotateCcw, Send, ShieldCheck } from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  getOrCreateSupportConversation,
  markRead,
  type SupportMessage,
} from '../lib/support'
import { pt } from '../i18n/pt'

type InboxRow = {
  userId: string
  name: string
  conversationId: string | null
  resolved: boolean
  lastMessage: string | null
  lastAt: string | null
  unread: number
}

export function AdminPage() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [rows, setRows] = useState<InboxRow[]>([])
  const [selected, setSelected] = useState<InboxRow | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(data?.is_admin ?? false))
  }, [user])

  const loadInbox = useCallback(async () => {
    const [{ data: profiles }, { data: convos }] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('is_admin', false),
      supabase.from('conversations').select('id, user_id, resolved').eq('type', 'support'),
    ])

    const convByUser = new Map(
      (convos ?? []).map(c => [c.user_id as string, c as { id: string; resolved: boolean }])
    )

    const convIds = (convos ?? []).map(c => c.id as string)
    const { data: msgs } = convIds.length
      ? await supabase
          .from('messages')
          .select('conversation_id, content, sender_type, read, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false })
      : { data: [] }

    const lastByConv = new Map<string, { content: string; created_at: string }>()
    const unreadByConv = new Map<string, number>()
    for (const m of msgs ?? []) {
      const cid = m.conversation_id as string
      if (!lastByConv.has(cid)) {
        lastByConv.set(cid, { content: m.content as string, created_at: m.created_at as string })
      }
      if (m.sender_type === 'patient' && !m.read) {
        unreadByConv.set(cid, (unreadByConv.get(cid) ?? 0) + 1)
      }
    }

    const inbox: InboxRow[] = (profiles ?? []).map(p => {
      const conv = convByUser.get(p.id as string)
      const last = conv ? lastByConv.get(conv.id) : undefined
      return {
        userId: p.id as string,
        name: (p.full_name as string | null) ?? 'Unnamed patient',
        conversationId: conv?.id ?? null,
        resolved: conv?.resolved ?? false,
        lastMessage: last?.content ?? null,
        lastAt: last?.created_at ?? null,
        unread: conv ? (unreadByConv.get(conv.id) ?? 0) : 0,
      }
    })
    inbox.sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''))
    setRows(inbox)
  }, [])

  // Live inbox: initial load once subscribed (no gap where an insert
  // could be missed), then any message insert/update refreshes the table
  useEffect(() => {
    if (!isAdmin) return
    const channel = supabase
      .channel('admin-inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        void loadInbox()
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') void loadInbox()
      })
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [isAdmin, loadInbox])

  if (isAdmin === null) {
    return <p className="px-5 py-10 text-center text-sm text-[#73787b]">{pt.common.loading}</p>
  }
  if (!isAdmin) {
    return (
      <p className="px-5 py-10 text-center text-sm font-medium text-[#ba1a1a]">
        {pt.admin.notAdmin}
      </p>
    )
  }

  if (selected) {
    return (
      <AdminThread
        row={selected}
        onBack={() => {
          setSelected(null)
          void loadInbox()
        }}
      />
    )
  }

  return (
    <div className="px-5 py-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={24} className="text-[#49654d]" />
        <h1 className="text-2xl font-semibold text-[#192830]">{pt.admin.title}</h1>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#73787b]">{pt.admin.noUsers}</p>
      ) : (
        <div className="bg-white rounded-2xl border border-[#c3c7ca]/40 divide-y divide-[#efeeea] overflow-hidden">
          {rows.map(row => (
            <button
              key={row.userId}
              onClick={() => setSelected(row)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#faf9f5] transition"
            >
              <div className="w-10 h-10 rounded-full bg-[#cbebcd] flex items-center justify-center text-[#49654d] font-semibold shrink-0">
                {row.name[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-[#192830] truncate">{row.name}</p>
                  {row.resolved && (
                    <span className="text-[11px] font-bold text-[#49654d] bg-[#cbebcd] rounded-full px-2 py-0.5 shrink-0">
                      {pt.admin.resolvedChip}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#73787b] truncate">
                  {row.lastMessage ?? pt.admin.noMessages}
                </p>
              </div>
              {row.unread > 0 && (
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#ba1a1a] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {row.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AdminThread({ row, onBack }: { row: InboxRow; onBack: () => void }) {
  const [conversationId, setConversationId] = useState<string | null>(row.conversationId)
  const [resolved, setResolved] = useState(row.resolved)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    let channel: RealtimeChannel | null = null

    async function load() {
      const convId = row.conversationId ?? (await getOrCreateSupportConversation(row.userId))
      if (!convId || cancelled) return
      setConversationId(convId)

      const { data: history } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_type, content, created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
      if (cancelled) return
      setMessages((history as SupportMessage[]) ?? [])
      await markRead(convId, 'patient')

      channel = supabase
        .channel(`admin-thread-${convId}`)
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
            if (m.sender_type === 'patient') void markRead(convId, 'patient')
          }
        )
        .subscribe()
    }

    void load()
    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [row])

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
        role: 'assistant',
        sender_type: 'admin',
        content: text,
      })
      .select('id, conversation_id, sender_type, content, created_at')
      .single()

    if (inserted) {
      const m = inserted as SupportMessage
      setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]))
    }
    setSending(false)
  }

  async function toggleResolved() {
    if (!conversationId) return
    const next = !resolved
    setResolved(next)
    await supabase.from('conversations').update({ resolved: next }).eq('id', conversationId)
  }

  return (
    <div className="flex flex-col h-[calc(100svh-72px-56px)] px-5 pt-6 pb-4">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onBack}
          aria-label={pt.admin.backToList}
          className="w-9 h-9 flex items-center justify-center rounded-full text-[#192830] hover:bg-[#efeeea] transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-xl font-semibold text-[#192830] truncate">{row.name}</h1>
        <button
          onClick={toggleResolved}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
            resolved
              ? 'bg-[#efeeea] text-[#43474a] hover:bg-[#e9e8e4]'
              : 'bg-[#cbebcd] text-[#192830] hover:bg-[#afceb2]'
          }`}
        >
          {resolved ? <RotateCcw size={15} /> : <Check size={15} />}
          {resolved ? pt.admin.reopen : pt.admin.resolve}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.map(m => (
          <div
            key={m.id}
            className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                m.sender_type === 'admin'
                  ? 'bg-[#49654d] text-white'
                  : m.sender_type === 'agent'
                    ? 'bg-[#efeeea] text-[#43474a]'
                    : 'bg-white border border-[#c3c7ca] text-[#1b1c1a]'
              }`}
            >
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
          placeholder={pt.admin.inputPlaceholder}
          className="flex-1 px-4 py-3 text-base rounded-lg border-[1.5px] border-[#c3c7ca] bg-white text-[#1b1c1a] placeholder:text-[#73787b] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] transition"
        />
        <button
          type="submit"
          disabled={sending || !input.trim() || !conversationId}
          aria-label={pt.admin.send}
          className="px-4 min-h-[48px] bg-[#49654d] text-white rounded-lg hover:opacity-[0.88] active:scale-[0.98] transition disabled:opacity-40 flex items-center justify-center"
        >
          <Send size={20} strokeWidth={2} />
        </button>
      </form>
    </div>
  )
}
