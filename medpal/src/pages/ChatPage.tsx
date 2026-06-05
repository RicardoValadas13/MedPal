import { useState, useEffect, useRef } from 'react'
import { Send, MessageCirclePlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import type { Message } from '../types/database'

type ChatMessage = Pick<Message, 'role' | 'content'>

export function ChatPage() {
  const { user } = useAuth()
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function loadLatestConversation() {
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)

      const latest = conversations?.[0]
      if (!latest || cancelled) return

      const { data: history } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', latest.id)
        .order('created_at', { ascending: true })

      if (cancelled) return
      setConversationId(latest.id)
      setMessages((history as ChatMessage[]) ?? [])
    }

    loadLatestConversation()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  function startNewConversation() {
    setConversationId(null)
    setMessages([])
    setError(null)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setError(null)
    setSending(true)

    const { data, error: fnError } = await supabase.functions.invoke('chat-agent', {
      body: { conversation_id: conversationId, message: text },
    })

    setSending(false)

    if (fnError || !data?.reply) {
      setError(pt.chat.errorSend)
      return
    }

    setConversationId(data.conversation_id)
    setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
  }

  return (
    <div className="flex flex-col h-[calc(100svh-72px-56px)] px-5 pt-6 pb-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#192830]">
          {pt.chat.title}
        </h1>
        {messages.length > 0 && (
          <button
            onClick={startNewConversation}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#49654d] hover:opacity-[0.88] transition"
          >
            <MessageCirclePlus size={18} strokeWidth={2} />
            {pt.chat.newConversation}
          </button>
        )}
      </div>

      <p className="text-xs font-medium text-[#8a8f93] bg-[#f4f3f0] rounded-xl px-3 py-2.5 mb-4">
        {pt.chat.disclaimer}
      </p>



      <div className="flex-1 overflow-y-auto space-y-3 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <p className="text-lg font-semibold text-[#192830] mb-2">{pt.chat.emptyTitle}</p>
            <p className="text-sm font-medium text-[#73787b]">{pt.chat.emptyHint}</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-[#192830] text-white'
                  : 'bg-white border border-[#e9e8e4] text-[#192830]'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#c3c7ca] rounded-2xl px-4 py-3 text-[15px] text-[#73787b]">
              {pt.chat.thinking}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm font-medium text-[#ba1a1a] mt-2">{error}</p>}

      <form onSubmit={handleSend} className="flex gap-2 mt-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={pt.chat.inputPlaceholder}
          className="flex-1 px-4 py-3 text-base rounded-lg border-[1.5px] border-[#c3c7ca] bg-white text-[#1b1c1a] placeholder:text-[#73787b] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] transition"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          aria-label={pt.chat.send}
          className="px-4 min-h-[48px] bg-[#49654d] text-white rounded-lg hover:opacity-[0.88] active:scale-[0.98] transition disabled:opacity-40 flex items-center justify-center"
        >
          <Send size={20} strokeWidth={2} />
        </button>
      </form>
    </div>
  )
}
