'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useGlobalAssistant } from '@/context/GlobalAssistantContext'

// ── Draggable position ────────────────────────────────────────────────────────
const SNAP_MARGIN = 24          // px from edge when snapping
const DEFAULT_POS = { x: -1, y: -1 }  // sentinel → use CSS bottom-right default

function useDraggableButton() {
  const [pos, setPos]       = useState(DEFAULT_POS)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef  = useRef(false)
  const startRef = useRef({ mx: 0, my: 0, bx: 0, by: 0 })

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.detail !== 2) return           // only on double-click
    e.preventDefault()
    dragRef.current = true
    setIsDragging(true)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    startRef.current = { mx: e.clientX, my: e.clientY, bx: rect.left, by: rect.top }

    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return
      const dx = me.clientX - startRef.current.mx
      const dy = me.clientY - startRef.current.my
      const nx = Math.max(SNAP_MARGIN, Math.min(window.innerWidth  - 80 - SNAP_MARGIN, startRef.current.bx + dx))
      const ny = Math.max(SNAP_MARGIN, Math.min(window.innerHeight - 56 - SNAP_MARGIN, startRef.current.by + dy))
      setPos({ x: nx, y: ny })
    }
    const onUp = () => {
      dragRef.current = false
      setIsDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // Build inline style: use fixed coords when dragged, else fall back to default CSS
  const style: React.CSSProperties = pos.x === -1
    ? {}
    : { left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' }

  return { style, isDragging, onMouseDown }
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant'
  content: string
}

// ── Inline markdown renderer (mirrors studio Assistant) ───────────────────────
function parseInline(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="font-mono text-[11px] bg-black/30 px-1.5 py-0.5 rounded text-yellow-200 border border-yellow-400/10">{part.slice(1, -1)}</code>
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} className="text-white/80">{part.slice(1, -1)}</em>
    return part
  })
}

function RenderMessage({ content }: { content: string }) {
  return (
    <div className="space-y-1">
      {content.split('\n').map((line, i) => {
        if (line.startsWith('```') || line === '```') return null
        return (
          <p key={i} className="leading-relaxed text-sm text-on-surface/90">
            {parseInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// ── Quick suggestion chips ────────────────────────────────────────────────────
function getChips(raga: any | null): string[] {
  if (!raga) return [
    'What raga suits a calm evening?',
    'Explain Vadi and Samvadi',
    'What is a Pakad?',
    'Which raga should a beginner start with?',
  ]
  const n = raga.name
  return [
    `What makes ${n} unique?`,
    raga.vadi ? `How do I emphasise the Vadi (${raga.vadi})?` : `Explain the grammar of ${n}`,
    `Give me a practice phrase for ${n}`,
    `What emotion does ${n} evoke?`,
  ]
}

// ── Main component ────────────────────────────────────────────────────────────
export function GlobalAssistant() {
  const pathname = usePathname()
  const { ragaContext, isOpen, openAssistant, closeAssistant } = useGlobalAssistant()
  const { style: dragStyle, isDragging, onMouseDown: onDragStart } = useDraggableButton()

  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [isTyping, setIsTyping]   = useState(false)
  const [unread, setUnread]       = useState(0)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const prevRagaRef = useRef<string | null>(null)

  // ── All hooks must come before any conditional return (Rules of Hooks) ─────

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
    else setUnread(0)
  }, [isOpen])

  // Count unread when closed
  useEffect(() => {
    if (!isOpen && messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      setUnread(u => u + 1)
    }
  }, [messages])

  // Reset conversation when raga context changes
  useEffect(() => {
    const ragaName = ragaContext?.name ?? null
    if (ragaName !== prevRagaRef.current) {
      prevRagaRef.current = ragaName
      setMessages([])
    }
  }, [ragaContext?.name])

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || isTyping) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Please sign in to use the assistant.' }])
        setIsTyping(false)
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
          ragaContext: ragaContext ?? undefined,
        }),
      })

      if (!res.ok) {
        const msg = res.status === 401 ? 'Session expired. Please sign in again.'
          : res.status === 429 ? 'Too many requests — wait a moment.'
          : 'Assistant unavailable. Please try again.'
        setMessages(prev => [...prev, { role: 'assistant', content: msg }])
        setIsTyping(false)
        return
      }

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          buf += data
          setMessages(prev => {
            const copy = [...prev]
            copy[copy.length - 1] = { role: 'assistant', content: buf }
            return copy
          })
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setIsTyping(false)
    }
  }, [input, messages, ragaContext, isTyping])

  const chips = getChips(ragaContext)

  // Don't show the global assistant inside the studio - it has its own sidebar assistant
  if (pathname?.startsWith('/studio')) return null

  return (
    <>
      {/* ── Floating trigger button ── */}
      {!isOpen && (
        <button
          onClick={() => openAssistant()}
          onMouseDown={onDragStart}
          style={dragStyle}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface-container-high border border-primary/20 shadow-glow hover:border-primary/50 hover:bg-surface-container-highest transition-all active:scale-95 group select-none${isDragging ? ' cursor-grabbing scale-105' : ' cursor-pointer'}`}
          title="Ask Saptaswara AI · Double-click to move"
        >
          <div className="relative">
            <span className="material-symbols-outlined !text-xl text-primary/80 group-hover:text-primary transition-colors">auto_awesome</span>
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-on-primary text-[9px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-primary/70 font-bold group-hover:text-primary transition-colors">
            Ask AI
          </span>
        </button>
      )}

      {/* ── Chat panel ── */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[560px] flex flex-col rounded-[28px] bg-surface border border-outline-variant/15 shadow-2xl animate-slide-up overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10 bg-surface-container-low/50 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined !text-base text-primary">auto_awesome</span>
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-widest text-primary/60 font-bold leading-none mb-0.5">Saptaswara AI</p>
                {ragaContext ? (
                  <p className="font-sans text-xs text-on-surface/80 truncate">{ragaContext.name}</p>
                ) : (
                  <p className="font-sans text-xs text-on-surface-variant/50">No raga selected</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  title="Clear chat"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/30 hover:text-on-surface-variant hover:bg-surface-container-high transition-all"
                >
                  <span className="material-symbols-outlined !text-sm">restart_alt</span>
                </button>
              )}
              <button
                onClick={closeAssistant}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/30 hover:text-on-surface-variant hover:bg-surface-container-high transition-all"
              >
                <span className="material-symbols-outlined !text-sm">close</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-thin min-h-0">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-5 py-4">
                <p className="font-sans text-xs text-on-surface-variant/40 text-center leading-relaxed px-2">
                  {ragaContext
                    ? `Ask me anything about ${ragaContext.name} — its grammar, mood, practice exercises, or history.`
                    : 'Ask me about ragas, swaras, or Indian classical music theory.'}
                </p>
                <div className="flex flex-col gap-2 w-full">
                  {chips.map(chip => (
                    <button
                      key={chip}
                      onClick={() => handleSend(chip)}
                      className="text-left w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/10 hover:border-primary/25 hover:bg-primary/5 transition-all font-sans text-xs text-on-surface-variant/70 hover:text-on-surface"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-primary/20 border border-primary/20 text-on-surface ml-4 rounded-br-md'
                      : 'bg-surface-container-high border border-outline-variant/10 text-on-surface mr-4 rounded-bl-md'
                  }`}>
                    {msg.content
                      ? <RenderMessage content={msg.content} />
                      : <span className="inline-flex gap-1 py-1">
                          {[0, 1, 2].map(d => (
                            <span key={d} className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                          ))}
                        </span>
                    }
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Chips row when conversation exists */}
          {messages.length > 0 && !isTyping && (
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
              {chips.slice(0, 2).map(chip => (
                <button
                  key={chip}
                  onClick={() => handleSend(chip)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/10 hover:border-primary/25 hover:bg-primary/5 transition-all font-sans text-[10px] text-on-surface-variant/60 hover:text-on-surface whitespace-nowrap"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-outline-variant/10 flex-shrink-0">
            <form
              onSubmit={e => { e.preventDefault(); handleSend() }}
              className="flex items-center gap-2 bg-surface-container-low rounded-2xl border border-outline-variant/10 px-4 py-2.5 focus-within:border-primary/30 transition-colors"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={ragaContext ? `Ask about ${ragaContext.name}…` : 'Ask about ragas…'}
                className="flex-1 bg-transparent text-sm font-sans text-on-surface placeholder:text-on-surface-variant/30 outline-none"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="w-7 h-7 rounded-xl bg-primary/20 hover:bg-primary/30 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
              >
                <span className="material-symbols-outlined !text-sm text-primary">arrow_upward</span>
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  )
}
