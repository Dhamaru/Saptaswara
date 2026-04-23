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

// ── Markdown renderer ─────────────────────────────────────────────────────────
function RenderMessage({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
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
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="font-mono text-[11px] bg-black/30 px-1.5 py-0.5 rounded-md text-yellow-200 border border-yellow-400/10">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="text-white/80">{part.slice(1, -1)}</em>
    }
    return part
  })
}

// ── Metadata normalization ───────────────────────────────────────────────────
function formatMeta(val: string | undefined | null): string | null {
  if (!val) return null
  const v = val.trim()
  if (v.toLowerCase() === 'unknown' || v.toLowerCase() === 'none' || v === '-') return null
  return v
}

// ── Chip suggestions ──────────────────────────────────────────────────────────
function getChips(ragaContext: any | undefined, learnMode: boolean): string[] {
  if (!ragaContext) {
    return learnMode
      ? ['What is a raga?', 'Explain Vadi and Samvadi', 'Which raga should I start with?', 'What are Swaras?']
      : ['What is a Raga?', 'Suggest a morning raga', 'How do I practice Sa Re Ga?']
  }

  const name = ragaContext.name || 'this raga'
  const vadi = formatMeta(ragaContext.vadi)
  const samvadi = formatMeta(ragaContext.samvadi)
  const time = formatMeta(ragaContext.time_of_day)

  if (learnMode) {
    return [
      `Teach me the basics of ${name}`,
      vadi ? `How do I use the Vadi (${vadi}) in ${name}?` : `What is the Vadi of ${name}?`,
      `Give me a beginner exercise in ${name}`,
      `What emotion does ${name} express?`,
      `Show me a simple Pakad for ${name}`,
      samvadi ? `How do Vadi (${vadi}) and Samvadi (${samvadi}) work together?` : `Explain the mood of ${name}`,
    ]
  }

  const timeQuery = time
    ? (time.toLowerCase() === 'any' ? `Why can ${name} be played at any time?` : `Why is ${name} a ${time} raga?`)
    : `What mood does ${name} evoke?`

  return [
    `What makes ${name} unique?`,
    vadi ? `Phrases centred on Vadi ${vadi} in ${name}` : `Give me a palta for ${name}`,
    `Analyse my composition in ${name}`,
    `Suggest a bandish in ${name}`,
    timeQuery,
    samvadi ? `Vadi–Samvadi interplay in ${name}` : `Characteristic ornaments in ${name}`,
  ]
}

// ── Raga summary panel ────────────────────────────────────────────────────────
function RagaSummary({ raga }: { raga: any }) {
  if (!raga) return null

  const aroha  = Array.isArray(raga.aroha)   ? raga.aroha.join(' – ')   : raga.aroha
  const avaroha = Array.isArray(raga.avaroha) ? raga.avaroha.join(' – ') : raga.avaroha

  return (
    <div className="mx-5 mb-4 rounded-2xl bg-surface-container-low/40 border border-outline-variant/10 overflow-hidden">
      {/* Title bar */}
      <div className="px-4 py-2.5 border-b border-outline-variant/8 flex items-center justify-between">
        <span className="font-mono text-[8px] uppercase tracking-widest text-primary/60 font-bold">Active Raga</span>
        {raga.tradition && (
          <span className="font-mono text-[7px] uppercase tracking-widest text-secondary/60 bg-secondary/10 px-2 py-0.5 rounded-full">
            {raga.tradition}
          </span>
        )}
      </div>

      <div className="p-4 space-y-2.5">
        <p className="font-display text-base font-light text-on-surface">{raga.name}</p>

        {/* Vadi / Samvadi */}
        {(() => {
          const vadi = formatMeta(raga.vadi)
          const samvadi = formatMeta(raga.samvadi)
          if (!vadi && !samvadi) return null
          return (
            <div className="flex gap-2">
              {vadi && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-400/10 border border-amber-400/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="font-mono text-[9px] font-bold text-amber-300">Vadi: {vadi}</span>
                </div>
              )}
              {samvadi && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-400/10 border border-sky-400/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span className="font-mono text-[9px] font-bold text-sky-300">Samvadi: {samvadi}</span>
                </div>
              )}
            </div>
          )
        })()}

        {/* Aroha / Avaroha */}
        {aroha && (
          <div>
            <p className="font-mono text-[7px] uppercase tracking-widest text-on-surface-variant/35 mb-1">Aroha ↑</p>
            <p className="font-mono text-[10px] text-primary/80 leading-relaxed">{aroha}</p>
          </div>
        )}
        {avaroha && (
          <div>
            <p className="font-mono text-[7px] uppercase tracking-widest text-on-surface-variant/35 mb-1">Avaroha ↓</p>
            <p className="font-mono text-[10px] text-primary/80 leading-relaxed">{avaroha}</p>
          </div>
        )}

        {/* Time / mood */}
        <div className="flex flex-wrap gap-2 pt-1">
          {raga.time_of_day && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container-high/50 border border-outline-variant/8">
              <span className="material-symbols-outlined !text-[10px] text-on-surface-variant/40">schedule</span>
              <span className="font-mono text-[8px] text-on-surface-variant/50 capitalize">{raga.time_of_day}</span>
            </div>
          )}
          {raga.mood && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container-high/50 border border-outline-variant/8">
              <span className="material-symbols-outlined !text-[10px] text-on-surface-variant/40">psychology</span>
              <span className="font-mono text-[8px] text-on-surface-variant/50 capitalize">{raga.mood}</span>
            </div>
          )}
        </div>

        {/* Pakads preview */}
        {raga.raga_phrases?.length > 0 && (
          <div className="pt-1 border-t border-outline-variant/8">
            <p className="font-mono text-[7px] uppercase tracking-widest text-on-surface-variant/35 mb-1.5">Pakad</p>
            <p className="font-mono text-[9px] text-secondary/70 leading-relaxed">
              {(Array.isArray(raga.raga_phrases[0].sequence)
                ? raga.raga_phrases[0].sequence.join(' ')
                : raga.raga_phrases[0].sequence)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Storage key ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'saptaswara_chat_history'

// ── Main component ────────────────────────────────────────────────────────────
export function Assistant({ ragaContext, studioContext }: AssistantProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
      if (saved) return JSON.parse(saved)
    } catch {}
    
    const vadi = formatMeta(ragaContext?.vadi)
    return [
      {
        role: 'assistant' as const,
        content: ragaContext
          ? `I'm analysing **${ragaContext.name}**${vadi ? ` — a raga whose soul lives in the note **${vadi}** (Vadi)` : ''}. Ask me about its grammar, suggest a practice exercise, or request a melodic pattern.`
          : 'I am your Raga Assistant. Select a raga from the sidebar to begin — I\'ll guide you through its grammar, mood, and characteristic phrases.',
      },
    ]
  })

  const [input, setInput]         = useState('')
  const [isTyping, setIsTyping]   = useState(false)
  const [isMinimized, setIsMinimized] = useState(true)
  const [isExpanded, setIsExpanded]   = useState(false)
  const [learnMode, setLearnMode]     = useState(false)
  const [showRaga, setShowRaga]       = useState(false)
  const [unread, setUnread]           = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const lastNotifiedIndex = useRef<number>(-1)
  // BUG-026: AbortController — cancel previous stream before starting a new one
  const abortRef = useRef<AbortController | null>(null)

  // BUG-026: cancel stream on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  // ── Context Switch Detection ──
  const prevRagaId = useRef<string | null>(ragaContext?.id || null)
  useEffect(() => {
    if (ragaContext && ragaContext.id !== prevRagaId.current) {
      if (prevRagaId.current !== null) {
        const vadi = formatMeta(ragaContext.vadi)
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `Now exploring **${ragaContext.name}**${vadi ? ` — remember, **${vadi}** is the heart of this raga` : ''}. How can I help with this new context?`
          }
        ])
      }
      prevRagaId.current = ragaContext.id
    }
  }, [ragaContext])

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)))
    } catch {}
  }, [messages])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // Unread counter — only increment once per completed assistant message (BUG-029)
  // Check content is non-empty so the empty streaming placeholder doesn't trigger it
  useEffect(() => {
    const lastIdx = messages.length - 1
    if (
      isMinimized &&
      lastIdx > lastNotifiedIndex.current &&
      messages[lastIdx]?.role === 'assistant' &&
      messages[lastIdx]?.content
    ) {
      setUnread(u => u + 1)
      lastNotifiedIndex.current = lastIdx
    }
  }, [messages, isMinimized])

  // Focus on open
  useEffect(() => {
    if (!isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300)
      setUnread(0)
      lastNotifiedIndex.current = messages.length - 1
    }
  }, [isMinimized, messages.length])

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text) return

    // BUG-026: cancel any in-flight stream before starting a new one
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // Prefix with learn mode context if active
    const sendText = learnMode && !overrideText?.includes('student')
      ? `[I am a beginner student] ${text}`
      : text

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
          messages: [...messages, { role: 'user', content: sendText }],
          ragaContext,
          studioContext,
        }),
        signal: controller.signal,
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

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done || controller.signal.aborted) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') break
            // BUG-026: functional setState accumulates without stale closure
            setMessages(prev => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = { role: 'assistant', content: last.content + data }
              }
              return updated
            })
          }
        }
      } catch (streamErr) {
        // BUG-027: don't overwrite content on deliberate abort
        if (streamErr instanceof Error && streamErr.name === 'AbortError') return
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant' && !last.content) {
            updated[updated.length - 1] = { role: 'assistant', content: 'Stream interrupted. Please try again.' }
          }
          return updated
        })
      } finally {
        reader.cancel().catch(() => {})
      }
    } catch (err) {
      // BUG-027: suppress AbortError — caused by deliberate cancellation
      if (err instanceof Error && err.name === 'AbortError') return
      console.error('Assistant error:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      if (abortRef.current === controller) setIsTyping(false)
    }
  }, [input, messages, ragaContext, studioContext, learnMode])

  const chips = getChips(ragaContext, learnMode)

  const containerClass = isMinimized
    ? 'w-14 h-14'
    : isExpanded
    ? 'w-[calc(100vw-2rem)] md:w-[600px] h-[calc(100dvh-5rem)] md:h-[750px]'
    : 'w-[calc(100vw-2rem)] md:w-[400px] h-[calc(100dvh-5rem)] md:h-[560px]'

  return (
    <div className={`fixed right-4 bottom-4 md:right-8 md:bottom-8 z-[200] transition-all duration-500 ease-in-out ${containerClass}`}>
      {isMinimized ? (
        /* ── Minimised FAB ── */
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
        /* ── Expanded chat panel ── */
        <div className="w-full h-full bg-surface-lowest/85 backdrop-blur-3xl rounded-[32px] border border-outline-variant/10 shadow-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-5 py-3.5 border-b border-outline-variant/10 flex items-center justify-between bg-surface-lowest/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-glow shrink-0">
                <span className="material-symbols-outlined text-white !text-lg">auto_fix_high</span>
              </div>
              <div>
                <h4 className="font-display text-base font-light text-on-surface leading-tight">Raga Assistant</h4>
                {ragaContext
                  ? <span className="font-mono text-[9px] uppercase tracking-widest text-primary/70">{ragaContext.name}</span>
                  : <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/30">No raga selected</span>
                }
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Learn mode toggle */}
              <button
                onClick={() => setLearnMode(l => !l)}
                title={learnMode ? 'Switch to Expert mode' : 'Switch to Learn mode (beginner-friendly)'}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono text-[8px] uppercase tracking-widest font-bold transition-all border ${
                  learnMode
                    ? 'bg-secondary/20 text-secondary border-secondary/30'
                    : 'text-on-surface-variant/30 border-outline-variant/5 hover:text-on-surface hover:border-outline-variant/20'
                }`}
              >
                <span className="material-symbols-outlined !text-[11px]">{learnMode ? 'school' : 'science'}</span>
                {learnMode ? 'Learn' : 'Expert'}
              </button>

              {/* Raga info toggle */}
              {ragaContext && (
                <button
                  onClick={() => setShowRaga(r => !r)}
                  title="Show raga summary"
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    showRaga ? 'bg-primary/15 text-primary' : 'text-on-surface-variant/30 hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined !text-lg">menu_book</span>
                </button>
              )}

              {/* Clear */}
              <button
                onClick={() => {
                  const vadi = formatMeta(ragaContext?.vadi)
                  const fresh: Message[] = [{
                    role: 'assistant',
                    content: ragaContext
                      ? `Starting fresh. Let's explore **${ragaContext.name}**${vadi ? ` — remember, **${vadi}** is the heart of this raga` : ''}. What would you like to know?`
                      : 'Conversation cleared. Select a raga and I\'ll guide you through it.',
                  }]
                  setMessages(fresh)
                  try { localStorage.removeItem(STORAGE_KEY) } catch {}
                }}
                title="Clear conversation"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant/30 hover:text-error hover:bg-error/10 transition-all"
              >
                <span className="material-symbols-outlined !text-lg">delete_sweep</span>
              </button>

              {/* Expand */}
              <button
                onClick={() => setIsExpanded(e => !e)}
                title={isExpanded ? 'Collapse' : 'Expand'}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant/30 hover:text-primary transition-all"
              >
                <span className="material-symbols-outlined !text-lg">{isExpanded ? 'close_fullscreen' : 'open_in_full'}</span>
              </button>

              {/* Minimise */}
              <button
                onClick={() => setIsMinimized(true)}
                title="Minimize"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant/30 hover:text-error transition-all"
              >
                <span className="material-symbols-outlined !text-lg">close</span>
              </button>
            </div>
          </div>

          {/* Learn mode banner */}
          {learnMode && (
            <div className="mx-5 mt-3 px-3 py-2 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined !text-sm text-secondary">school</span>
              <p className="font-mono text-[8px] uppercase tracking-widest text-secondary/70">
                Learn mode — beginner-friendly explanations active
              </p>
            </div>
          )}

          {/* Raga summary panel */}
          {showRaga && ragaContext && (
            <div className="shrink-0 mt-3">
              <RagaSummary raga={ragaContext} />
            </div>
          )}

          {/* Chat thread */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4 scroll-thin">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm break-words overflow-hidden ${
                  m.role === 'assistant'
                    ? 'bg-gradient-to-br from-primary/90 to-primary-container text-white shadow-glow'
                    : 'bg-surface-container-high text-on-surface border border-outline-variant/5 shadow-sm'
                }`}>
                  {m.role === 'assistant'
                    ? <RenderMessage content={m.content} />
                    : <p className="leading-relaxed">{m.content}</p>
                  }
                </div>
                <span className="font-mono text-[7px] uppercase tracking-widest text-on-surface-variant/20 mt-1 px-1">
                  {m.role === 'assistant' ? 'Saptaswara AI' : 'You'}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-primary/10 rounded-full w-fit">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.15s]" />
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            )}
          </div>

          {/* Suggestion chips */}
          <div className="px-5 py-3 flex gap-2 overflow-x-auto scrollbar-none border-t border-outline-variant/5 shrink-0">
            {chips.map(chip => (
              <button
                key={chip}
                onClick={() => handleSend(chip)}
                className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-surface-container-low/50 border border-outline-variant/8 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant/55 hover:text-primary hover:border-primary/25 transition-all shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-5 pb-5 pt-2 bg-surface-lowest/50 backdrop-blur-md shrink-0">
            <div className="relative">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={learnMode
                  ? 'Ask anything — I\'ll explain simply...'
                  : 'Ask about ragas, patterns, theory...'
                }
                className="w-full bg-surface-container-high rounded-2xl py-3.5 pl-5 pr-14 text-sm font-sans placeholder:text-on-surface-variant/20 border border-outline-variant/8 focus:border-primary/40 focus:bg-surface-lowest transition-all outline-none"
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
