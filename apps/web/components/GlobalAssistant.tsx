'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useGlobalAssistant } from '@/context/GlobalAssistantContext'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatSession {
  id: string
  name: string
  ragaName: string | null
  messages: Message[]
  createdAt: number
}

type AssistantMode = 'expert' | 'learn'
type PanelView = 'chat' | 'history'

// ── Inline markdown renderer ──────────────────────────────────────────────────
function parseInline(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return <code key={i} className="font-mono text-[11px] bg-black/30 px-1.5 py-0.5 rounded text-yellow-200 border border-yellow-400/10 whitespace-nowrap">{part.slice(1, -1)}</code>
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <strong key={i} className="font-semibold text-on-surface">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <em key={i} className="italic text-on-surface/80">{part.slice(1, -1)}</em>
    return part
  })
}

function RenderMessage({ content }: { content: string }) {
  const lines = content.split('\n')
  const nodes: React.ReactNode[] = []
  let inCodeBlock = false

  lines.forEach((line, i) => {
    if (line.startsWith('```')) { inCodeBlock = !inCodeBlock; return }
    if (inCodeBlock) {
      nodes.push(<code key={i} className="block font-mono text-[11px] bg-black/30 px-2 py-0.5 text-yellow-200">{line}</code>)
      return
    }
    if (line.startsWith('### '))
      return nodes.push(<p key={i} className="font-semibold text-on-surface text-sm mt-1">{parseInline(line.slice(4))}</p>)
    if (line.startsWith('## '))
      return nodes.push(<p key={i} className="font-bold text-on-surface text-sm mt-1">{parseInline(line.slice(3))}</p>)
    if (line.startsWith('- ') || line.startsWith('• '))
      return nodes.push(<p key={i} className="leading-relaxed text-sm text-on-surface/90 pl-3 before:content-['·'] before:mr-2 before:opacity-50">{parseInline(line.slice(2))}</p>)
    if (line.trim() === '---')
      return nodes.push(<hr key={i} className="border-outline-variant/20 my-1" />)
    if (line.trim() === '')
      return nodes.push(<div key={i} className="h-1" />)
    nodes.push(<p key={i} className="leading-relaxed text-sm text-on-surface/90">{parseInline(line)}</p>)
  })

  return <div className="space-y-0.5">{nodes}</div>
}

// ── Quick suggestion chips ────────────────────────────────────────────────────
function getChips(raga: any | null, mode: AssistantMode): string[] {
  if (!raga) return [
    mode === 'learn' ? 'What is a raga? Explain simply.' : 'What raga suits a calm evening?',
    mode === 'learn' ? 'What are the 7 swaras?' : 'Explain Vadi and Samvadi',
    'What is a Pakad?',
    mode === 'learn' ? 'How do I start learning?' : 'Which raga should a beginner start with?',
  ]
  const n = raga.name
  return [
    `What makes ${n} unique?`,
    raga.vadi ? `How do I emphasise the Vadi (${raga.vadi})?` : `Explain the grammar of ${n}`,
    mode === 'learn' ? `Teach me ${n} step by step` : `Give me a practice phrase for ${n}`,
    `What emotion does ${n} evoke?`,
  ]
}

// ── Main component ────────────────────────────────────────────────────────────
export function GlobalAssistant() {
  const { ragaContext, isOpen, closeAssistant } = useGlobalAssistant()

  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [isTyping, setIsTyping]     = useState(false)
  const [mode, setMode]             = useState<AssistantMode>('expert')
  const [view, setView]             = useState<PanelView>('chat')
  const [sessions, setSessions]     = useState<ChatSession[]>([])
  const [copiedIdx, setCopiedIdx]   = useState<number | null>(null)

  const bottomRef    = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const prevRagaRef  = useRef<string | null>(null)
  const abortRef     = useRef<AbortController | null>(null)

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('spa-chat-sessions')
      if (stored) setSessions(JSON.parse(stored))
    } catch {}
  }, [])

  // Persist sessions
  useEffect(() => {
    if (sessions.length > 0) {
      try { localStorage.setItem('spa-chat-sessions', JSON.stringify(sessions.slice(0, 10))) } catch {}
    }
  }, [sessions])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  // Abort in-flight stream on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  // Reset conversation when raga context changes
  useEffect(() => {
    const ragaName = ragaContext?.name ?? null
    if (ragaName !== prevRagaRef.current) {
      prevRagaRef.current = ragaName
      setMessages([])
    }
  }, [ragaContext?.name])

  const saveCurrentSession = useCallback(() => {
    if (messages.length < 2) return
    const name = ragaContext?.name
      ? `${ragaContext.name} · ${new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' })}`
      : `Chat · ${new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}`
    const session: ChatSession = {
      id: Date.now().toString(),
      name,
      ragaName: ragaContext?.name ?? null,
      messages: [...messages],
      createdAt: Date.now(),
    }
    setSessions(prev => [session, ...prev].slice(0, 10))
  }, [messages, ragaContext])

  const loadSession = useCallback((session: ChatSession) => {
    setMessages(session.messages)
    setView('chat')
  }, [])

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id)
      try { localStorage.setItem('spa-chat-sessions', JSON.stringify(next.slice(0, 10))) } catch {}
      return next
    })
  }, [])

  const copyMessage = useCallback((content: string, idx: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    }).catch(() => {})
  }, [])

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || isTyping) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

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
          ragaContext: ragaContext ?? undefined,
          mode,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const msg = res.status === 401 ? 'Session expired. Please sign in again.'
          : res.status === 429 ? 'Too many requests — wait a moment.'
          : 'Assistant unavailable. Please try again.'
        setMessages(prev => [...prev, { role: 'assistant', content: msg }])
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
            const data = line.slice(6)
            if (data === '[DONE]') break
            setMessages(prev => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = { role: 'assistant', content: last.content + data }
              }
              return copy
            })
          }
        }
      } finally {
        reader.cancel().catch(() => {})
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      if (abortRef.current === controller) setIsTyping(false)
    }
  }, [input, messages, ragaContext, isTyping, mode])

  const chips = getChips(ragaContext, mode)

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={closeAssistant} />
      )}

      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col md:inset-auto md:bottom-6 md:right-6 md:w-[400px] max-h-[calc(100dvh-4.5rem)] md:max-h-[600px] rounded-t-[28px] md:rounded-[28px] bg-surface border border-outline-variant/15 shadow-2xl animate-slide-up overflow-hidden">

          {/* Mobile drag handle */}
          <div className="flex justify-center pt-3 pb-1 md:hidden flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-outline-variant/30" />
          </div>

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-outline-variant/10 bg-surface-container-low/50 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isTyping ? 'bg-primary/30 animate-pulse' : 'bg-primary/15'}`}>
                <span className="material-symbols-outlined !text-base text-primary">auto_awesome</span>
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-widest text-primary/60 font-bold leading-none mb-0.5">Saptaswara AI</p>
                {ragaContext
                  ? <p className="font-sans text-xs text-on-surface/80 truncate">{ragaContext.name}</p>
                  : <p className="font-sans text-xs text-on-surface-variant/50">Ask anything</p>}
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Learn / Expert mode toggle */}
              <button
                onClick={() => setMode(m => m === 'expert' ? 'learn' : 'expert')}
                title={mode === 'expert' ? 'Switch to Learn mode (beginner explanations)' : 'Switch to Expert mode'}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  mode === 'learn'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-on-surface-variant/50 hover:text-on-surface-variant hover:bg-surface-container-high border border-transparent'
                }`}
              >
                <span className="material-symbols-outlined !text-sm">{mode === 'learn' ? 'school' : 'psychology'}</span>
              </button>

              {/* History / saved sessions */}
              {sessions.length > 0 && (
                <button
                  onClick={() => setView(v => v === 'history' ? 'chat' : 'history')}
                  title="Chat history"
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    view === 'history'
                      ? 'bg-primary/20 text-primary border border-primary/20'
                      : 'text-on-surface-variant/50 hover:text-on-surface-variant hover:bg-surface-container-high border border-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined !text-sm">history</span>
                </button>
              )}

              {/* Save conversation */}
              {messages.length > 1 && view === 'chat' && (
                <button
                  onClick={saveCurrentSession}
                  title="Save this conversation"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 transition-all border border-transparent"
                >
                  <span className="material-symbols-outlined !text-sm">bookmark_add</span>
                </button>
              )}

              {/* New chat */}
              {messages.length > 0 && view === 'chat' && (
                <button
                  onClick={() => setMessages([])}
                  title="New chat"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/50 hover:text-on-surface-variant hover:bg-surface-container-high transition-all border border-transparent"
                >
                  <span className="material-symbols-outlined !text-sm">add_comment</span>
                </button>
              )}

              {/* ── CLOSE BUTTON — always visible ── */}
              <button
                onClick={closeAssistant}
                title="Close assistant"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container-high border border-outline-variant/25 hover:border-outline-variant/50 transition-all ml-0.5"
              >
                <span className="material-symbols-outlined !text-sm">close</span>
              </button>
            </div>
          </div>

          {/* Learn mode badge */}
          {mode === 'learn' && (
            <div className="px-4 py-1.5 bg-amber-500/8 border-b border-amber-500/10 flex items-center gap-2 flex-shrink-0">
              <span className="material-symbols-outlined !text-xs text-amber-400">school</span>
              <span className="font-mono text-[8px] uppercase tracking-widest text-amber-400/70">Learn Mode — simplified, beginner-friendly</span>
            </div>
          )}

          {/* ── History view ── */}
          {view === 'history' ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
              <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40">Saved Conversations</p>
                {sessions.length > 0 && (
                  <button
                    onClick={() => { setSessions([]); try { localStorage.removeItem('spa-chat-sessions') } catch {} }}
                    className="font-mono text-[8px] uppercase tracking-widest text-red-400/50 hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {sessions.length === 0 ? (
                <div className="text-center py-10">
                  <span className="material-symbols-outlined !text-3xl text-on-surface-variant/15 block mb-2">history</span>
                  <p className="text-xs text-on-surface-variant/30">No saved conversations yet</p>
                </div>
              ) : sessions.map(session => (
                <div key={session.id} className="flex items-center gap-2 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/10 hover:border-primary/20 transition-colors group">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => loadSession(session)}>
                    <p className="text-xs text-on-surface font-sans truncate">{session.name}</p>
                    <p className="text-[10px] text-on-surface-variant/40 mt-0.5">{session.messages.length} messages</p>
                  </div>
                  <button
                    onClick={() => deleteSession(session.id)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-on-surface-variant/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <span className="material-symbols-outlined !text-xs">delete</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* ── Messages view ── */
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-thin min-h-0">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-5 py-4">
                  {/* Mode pill */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-mono uppercase tracking-widest font-bold ${
                    mode === 'learn'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      : 'bg-primary/10 border-primary/20 text-primary/60'
                  }`}>
                    <span className="material-symbols-outlined !text-xs">{mode === 'learn' ? 'school' : 'psychology'}</span>
                    {mode === 'learn' ? 'Beginner-Friendly Mode' : 'Expert Mode'}
                  </div>
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
                    <div className={`group relative max-w-[85%] px-4 py-2.5 rounded-2xl break-words overflow-x-hidden ${
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
                      {/* Copy button — appears on hover of assistant messages */}
                      {msg.role === 'assistant' && msg.content && (
                        <button
                          onClick={() => copyMessage(msg.content, i)}
                          title="Copy message"
                          className="absolute -bottom-3.5 right-2 opacity-0 group-hover:opacity-100 transition-all w-6 h-6 rounded-md bg-surface-container border border-outline-variant/20 flex items-center justify-center text-on-surface-variant/50 hover:text-primary hover:border-primary/30"
                        >
                          <span className="material-symbols-outlined !text-[10px]">
                            {copiedIdx === i ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* ── Typing / generating strip ── */}
          {isTyping && view === 'chat' && (
            <div className="px-4 py-2.5 flex items-center justify-between border-t border-outline-variant/10 bg-primary/5 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="flex gap-1 items-center">
                  {[0, 1, 2].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: `${d * 0.18}s` }} />
                  ))}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-primary/60 animate-pulse">Saptaswara AI is generating…</span>
              </div>
              {/* Stop / cancel generation */}
              <button
                onClick={() => abortRef.current?.abort()}
                title="Stop generating"
                className="w-6 h-6 rounded-lg flex items-center justify-center text-on-surface-variant/50 hover:text-red-400 hover:bg-red-500/10 border border-outline-variant/15 transition-all"
              >
                <span className="material-symbols-outlined !text-xs">stop</span>
              </button>
            </div>
          )}

          {/* ── Chip row (in-conversation shortcuts) ── */}
          {messages.length > 0 && !isTyping && view === 'chat' && (
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

          {/* ── Input ── */}
          {view === 'chat' && (
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
          )}

        </div>
      )}
    </>
  )
}
