'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AssistantProps {
  ragaContext?: any
}

export function Assistant({ ragaContext }: AssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: ragaContext 
        ? `I am analyzing the resonance of ${ragaContext.name}. How can I assist your composition?`
        : "I am your Raga Assistant. Select a melodic foundation to begin our harmonic dialogue."
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isMinimized, setIsMinimized] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMsg: Message = { role: 'user', content: input }
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
        body: JSON.stringify({ messages: [...messages, userMsg], ragaContext }),
      })

      if (!res.ok) {
        const fallback = res.status === 401 ? 'Session expired. Please sign in again.' : 'Assistant unavailable. Please try again.'
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
          updated[updated.length - 1] = { role: 'assistant', content: assistantMessage || 'Stream interrupted. Please try again.' }
          return updated
        })
      }
    } catch (err) {
      console.error('Assistant error:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className={`fixed right-8 bottom-8 z-[200] transition-all duration-700 ease-in-out ${
      isMinimized ? 'w-16 h-16' : isFocused ? 'w-[500px] h-[700px]' : 'w-96 h-[500px]'
    }`}>
      {isMinimized ? (
        <button 
          onClick={() => setIsMinimized(false)}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-glow hover:scale-110 active:scale-95 transition-all group"
        >
          <span className="material-symbols-outlined text-white !text-2xl animate-pulse group-hover:animate-none">auto_fix_high</span>
        </button>
      ) : (
        <div className="w-full h-full bg-surface-lowest/80 backdrop-blur-3xl rounded-[40px] border border-outline-variant/10 shadow-2xl flex flex-col overflow-hidden group">
        
        {/* Assistant Header */}
        <div className="p-8 border-b border-outline-variant/10 flex items-center justify-between bg-surface-lowest/40">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-glow">
                 <span className="material-symbols-outlined text-white !text-xl">auto_fix_high</span>
              </div>
              <div>
                 <h4 className="font-display text-lg font-light text-on-surface leading-tight">Raga Assistant</h4>
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                    <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60 font-bold">Neural Engine Live</span>
                 </div>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFocused(!isFocused)}
                className="material-symbols-outlined text-on-surface-variant/20 hover:text-primary transition-colors !text-xl"
                title={isFocused ? 'Collapse' : 'Expand'}
              >
                {isFocused ? 'close_fullscreen' : 'open_in_full'}
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="material-symbols-outlined text-on-surface-variant/40 hover:text-error transition-colors !text-xl"
                title="Minimize"
              >
                close
              </button>
           </div>
        </div>

        {/* Chat Thread */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-thin">
           {messages.map((m, i) => (
             <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] p-5 rounded-3xl text-sm leading-relaxed ${
                  m.role === 'assistant' 
                    ? 'bg-gradient-to-br from-primary to-primary-container text-white shadow-glow font-medium' 
                    : 'bg-surface-container-high text-on-surface border border-outline-variant/5 shadow-2xl font-light'
                }`}>
                  {m.content}
                </div>
                <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/20 mt-2 px-2">
                  {m.role === 'assistant' ? 'AI Synthesis' : 'User Prompt'}
                </span>
             </div>
           ))}
           {isTyping && (
             <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-low/40 rounded-full w-fit">
                <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
             </div>
           )}
        </div>

        {/* Suggestion Chips */}
        <div className="px-8 py-4 flex gap-2 overflow-x-auto scroller-none border-t border-outline-variant/5">
           {['Scale Theory', 'Morning Ragas', 'Generate Pattern'].map(chip => (
             <button
               key={chip}
               onClick={() => { setInput(chip); }}
               className="whitespace-nowrap px-4 py-2 rounded-xl bg-surface-container-low/40 border border-outline-variant/5 text-[10px] font-mono uppercase tracking-widest text-on-surface-variant/60 hover:text-primary hover:border-primary/20 transition-all"
             >
                {chip}
             </button>
           ))}
        </div>

        {/* Input Area */}
        <div className="p-8 bg-surface-lowest/40 backdrop-blur-md">
           <div className="relative group">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Talk to your Raga Assistant..."
                className="w-full bg-surface-container-high rounded-2xl py-4 pl-6 pr-14 text-sm font-sans placeholder:text-on-surface-variant/20 border border-outline-variant/5 focus:border-primary/40 focus:bg-surface-lowest transition-all outline-none"
              />
              <button 
                onClick={handleSend}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-glow"
              >
                <span className="material-symbols-outlined !text-xl">send</span>
              </button>
           </div>
        </div>
      </div>
    )}
  </div>
)
}
