'use client'

import React, { useState } from 'react'

interface MoodRaga {
  name: string
  tradition: 'Hindustani' | 'Carnatic'
  rasa: string
  time: string
  reason: string
}

interface MoodPickerProps {
  open: boolean
  onClose: () => void
  onSelectRaga: (ragaName: string) => void
}

const MOOD_CHIPS = [
  { label: 'Peaceful',    icon: 'spa'              },
  { label: 'Devotional',  icon: 'church'           },
  { label: 'Romantic',    icon: 'favorite'         },
  { label: 'Longing',     icon: 'sentiment_sad'    },
  { label: 'Energetic',   icon: 'bolt'             },
  { label: 'Meditative',  icon: 'self_improvement' },
  { label: 'Joyful',      icon: 'celebration'      },
  { label: 'Melancholic', icon: 'water_drop'       },
  { label: 'Courageous',  icon: 'shield'           },
  { label: 'Serene',      icon: 'waves'            },
]

const TRADITION_COLORS: Record<string, string> = {
  Hindustani: 'bg-primary/10 border-primary/25 text-primary',
  Carnatic:   'bg-secondary/10 border-secondary/25 text-secondary',
}

export function MoodPicker({ open, onClose, onSelectRaga }: MoodPickerProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<MoodRaga[]>([])
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleChip = (label: string) => {
    setInput(label)
  }

  const handleSubmit = async () => {
    const mood = input.trim()
    // BUG-023: guard against duplicate submission via Enter key while loading
    if (!mood || loading) return
    setLoading(true)
    setError(null)
    setResults([])
    try {
      const res = await fetch('/api/ai/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setResults(data.ragas)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[350] bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />

      {/* Panel */}
      <div className="fixed inset-0 z-[351] flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-lg bg-[#0b0b16] border border-outline-variant/20 rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[90dvh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-secondary/15 flex items-center justify-center">
                <span className="material-symbols-outlined !text-base text-secondary">mood</span>
              </div>
              <div>
                <h2 className="font-display text-lg font-light text-on-surface">Find a Raga by Mood</h2>
                <p className="font-mono text-[8px] uppercase tracking-widest text-secondary/50">Describe how you feel or what you want to express</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-outline-variant/10 flex items-center justify-center text-on-surface-variant/40 hover:text-on-surface hover:border-outline-variant/30 transition-all"
            >
              <span className="material-symbols-outlined !text-base">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 scroll-thin">

            {/* Mood chips */}
            <div>
              <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 mb-3">Quick select</p>
              <div className="flex flex-wrap gap-2">
                {MOOD_CHIPS.map(c => (
                  <button
                    key={c.label}
                    onClick={() => handleChip(c.label)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono text-[9px] uppercase tracking-widest font-bold transition-all ${
                      input === c.label
                        ? 'bg-secondary/20 border-secondary/50 text-secondary'
                        : 'bg-surface-container-low border-outline-variant/10 text-on-surface-variant/50 hover:text-on-surface hover:border-outline-variant/25'
                    }`}
                  >
                    <span className="material-symbols-outlined !text-sm">{c.icon}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Free-text input */}
            <div>
              <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 mb-2">Or describe in your own words</p>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !loading && input.trim()) handleSubmit() }}
                  placeholder="e.g. I feel hopeful but a little sad at dusk…"
                  className="flex-1 bg-surface-container-low border border-outline-variant/15 rounded-xl px-4 py-2.5 font-sans text-sm text-on-surface placeholder:text-on-surface-variant/30 outline-none focus:border-secondary/40 transition-colors"
                  maxLength={300}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || loading}
                  className="px-4 py-2.5 rounded-xl bg-secondary/15 border border-secondary/30 text-secondary font-mono text-[9px] uppercase tracking-widest font-bold hover:bg-secondary/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {loading
                    ? <span className="material-symbols-outlined !text-base animate-spin">progress_activity</span>
                    : <span className="material-symbols-outlined !text-base">auto_awesome</span>
                  }
                  {loading ? 'Finding…' : 'Find'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-sans text-xs">
                <span className="material-symbols-outlined !text-sm flex-shrink-0">error</span>
                {error}
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-3">
                <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40">Recommended ragas</p>
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-surface-container-low/50 border border-outline-variant/10 p-4 hover:border-secondary/25 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-display text-lg font-light text-on-surface">{r.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`font-mono text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${TRADITION_COLORS[r.tradition] ?? 'bg-surface-container-high border-outline-variant/20 text-on-surface-variant/50'}`}>
                            {r.tradition}
                          </span>
                          <span className="font-mono text-[8px] text-on-surface-variant/40">{r.time}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => { onSelectRaga(r.name); onClose() }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/25 text-primary font-mono text-[8px] uppercase tracking-widest font-bold hover:bg-primary/20 transition-all"
                      >
                        <span className="material-symbols-outlined !text-sm">open_in_new</span>
                        Open
                      </button>
                    </div>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-secondary/60 mb-1">{r.rasa}</p>
                    <p className="font-sans text-xs text-on-surface-variant/60 leading-relaxed">{r.reason}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && results.length === 0 && !error && (
              <div className="text-center py-6">
                <span className="material-symbols-outlined !text-3xl text-on-surface-variant/15 block mb-2">music_note</span>
                <p className="font-sans text-xs text-on-surface-variant/30">Select a mood above or type your own to discover matching ragas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
