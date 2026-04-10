'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AssistantProps {
  ragaContext?: any
  /** Optional: pass serialised sequencer grid state for richer AI context */
  studioContext?: string
}

/** Very light Markdown-to-JSX: bold, italic, inline code, swara blocks. */
function RenderMessage({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // Fenced swara block (``` ... ```)
        if (line.startsWith('```') || line === '```') return null
        return (
          <p key={i} className="leading-relaxed text-sm">
            {parseInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function parseInline(text: string): React.ReactNode[] {
  // Handle `inline code` as swara notation highlight
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="font-mono text-[11px] bg-black/20 px-1.5 py-0.5 rounded-md text-yellow-200">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

function getDynamicChips(ragaContext?: any): string[] {
  if (!ragaContext) {
    return ['What is a Raga?', 'Suggest a morning raga', 'How do I practice Sa Re Ga?']
  }
  const name = ragaContext.name || 'this raga'
  return [
    `What makes ${name} unique?`,
    `Give me a palta for ${name}`,
    `What mood does ${name} evoke?`,
    `Suggest a composition in ${name}`,
  ]
}

const STORAGE_KEY = 'saptaswara_chat_history'

export function Assistant({ ragaContext, studioContext }: AssistantProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
      if (saved) return JSON.parse(saved)
    } catch {}
    return [
      {
        role: 'assistant' as const,
        content: ragaContext
          ? `I am analysing the resonance of **${ragaContext.name}**. Ask me about its grammar, mood, or request a melodic pattern.`
          : 'I am your Raga Assistant. Select a melodic foundation to begin our harmonic dialogue.',
      },
    ]
  })
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isMinimized, setIsMinimized] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [unread, setUnread] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Persist history (capped at 40 messages to avoid quota bloat)
  useEffect(() => {
    try {
      const toSave = messages.slice(-40)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch {}
  }, [messages])

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Count unread while minimized
  useEffect(() => {
    if (isMinimized && messages[messages.length - 1]?.role === 'assistant') {
      setUnread(u => u + 1)
    }
  }, [messages, isMinimized])

  const clearUnread = () => setUnread(0)

  // Focus input when expanding
  useEffect(() => {
    if (!isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300)
      clearUnread()
    }
  }, [isMinimized])

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Please sign in to use the assistant.' }])
        return
      }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          ragaContext,
          studioContext,
        }),
      })

      if (!res.ok) {
        const fallback = res.status === 401
          ? 'Session expired. Please sign in again.'
          : res.status === 429
          ? 'Too many requests — please wait a moment.'
          : 'Assistant unavailable. Please try again.'
        setMessages(prev => [...prev, { role: 'assistant', content: fallback }])
        return
      }

      // Append an empty assistant bubble to stream into
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') break
            assistantMessage += data
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: assistantMessage }
              return updated
            })
          }
        }
      } catch {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: assistantMessage || 'Stream interrupted. Please try again.',
          }
          return updated
        })
      }
    } catch (err) {
      console.error('Assistant error:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setIsTyping(false)
    }
  }, [input, messages, ragaContext, studioContext])

  const chips = getDynamicChips(ragaContext)

  const containerClass = isMinimized
    ? 'w-14 h-14'
    : isExpanded
    ? 'w-[calc(100vw-2rem)] md:w-[560px] h-[85vh] md:h-[700px]'
    : 'w-[calc(100vw-2rem)] md:w-96 h-[520px]'

  return (
    <div className={`fixed right-4 bottom-4 md:right-8 md:bottom-8 z-[200] transition-all duration-500 ease-in-out ${containerClass}`}>
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-glow hover:scale-110 active:scale-95 transition-all group relative"
          title="Open Raga Assistant"
        >
          <span className="material-symbols-outlined text-white !text-2xl animate-pulse group-hover:animate-none">auto_fix_high</span>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-secondary text-on-secondary text-[10px] font-mono font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      ) : (
        <div className="w-full h-full bg-surface-lowest/80 backdrop-blur-3xl rounded-[32px] border border-outline-variant/10 shadow-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-lowest/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-glow shrink-0">
                <span className="material-symbols-outlined text-white !text-lg">auto_fix_high</span>
              </div>
              <div>
                <h4 className="font-display text-base font-light text-on-surface leading-tight">Raga Assistant</h4>
                {ragaContext && (
                  <span className="font-mono text-[9px] uppercase tracking-widest text-primary/70">{ragaContext.name}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Clear conversation */}
              <button
                onClick={() => {
                  const fresh: Message[] = [{
                    role: 'assistant',
                    content: ragaContext
                      ? `Starting fresh. Let's explore **${ragaContext.name}**. What would you like to know?`
                      : 'Conversation cleared. How can I assist you?',
                  }]
                  setMessages(fresh)
                  localStorage.removeItem(STORAGE_KEY)
                }}
                title="Clear conversation"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant/30 hover:text-error hover:bg-error/10 transition-all"
              >
                <span className="material-symbols-outlined !text-lg">delete_sweep</span>
              </button>
              {/* Expand / contract */}
              <button
                onClick={() => setIsExpanded(e => !e)}
                title={isExpanded ? 'Collapse' : 'Expand'}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant/30 hover:text-primary transition-all"
              >
                <span className="material-symbols-outlined !text-lg">{isExpanded ? 'close_fullscreen' : 'open_in_full'}</span>
              </button>
              {/* Minimize */}
              <button
                onClick={() => setIsMinimized(true)}
                title="Minimize"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant/30 hover:text-error transition-all"
              >
                <span className="material-symbols-outlined !text-lg">close</span>
              </button>
            </div>
          </div>

          {/* Chat thread */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-5 scroll-thin">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[88%] px-4 py-3 rounded-2xl ${
                  m.role === 'assistant'
                    ? 'bg-gradient-to-br from-primary to-primary-container text-white shadow-glow'
                    : 'bg-surface-container-high text-on-surface border border-outline-variant/5 shadow-sm'
                }`}>
                  {m.role === 'assistant'
                    ? <RenderMessage content={m.content} />
                    : <p className="text-sm leading-relaxed">{m.content}</p>
                  }
                </div>
                <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/20 mt-1.5 px-1">
                  {m.role === 'assistant' ? 'Saptaswara AI' : 'You'}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-low/40 rounded-full w-fit">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.15s]" />
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            )}
          </div>

          {/* Dynamic suggestion chips */}
          <div className="px-5 py-3 flex gap-2 overflow-x-auto scrollbar-none border-t border-outline-variant/5 shrink-0">
            {chips.map(chip => (
              <button
                key={chip}
                onClick={() => handleSend(chip)}
                className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-surface-container-low/40 border border-outline-variant/5 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant/60 hover:text-primary hover:border-primary/20 transition-all shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-5 pb-5 pt-3 bg-surface-lowest/40 backdrop-blur-md shrink-0">
            <div className="relative">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask about ragas, patterns, theory..."
                className="w-full bg-surface-container-high rounded-2xl py-3.5 pl-5 pr-14 text-sm font-sans placeholder:text-on-surface-variant/20 border border-outline-variant/5 focus:border-primary/40 focus:bg-surface-lowest transition-all outline-none"
              />
              <button
                onClick={() => handleSend()}
                disabled={isTyping || !input.trim()}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
              >
                <span className="material-symbols-outlined !text-lg">send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
