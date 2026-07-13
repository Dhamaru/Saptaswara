'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowLeft } from 'lucide-react'

const MOODS = [
  { label: 'Calm', icon: '🌿', color: 'from-teal-500/20 to-teal-400/5', border: 'border-teal-400/30', text: 'text-teal-300' },
  { label: 'Romantic', icon: '🌹', color: 'from-rose-500/20 to-rose-400/5', border: 'border-rose-400/30', text: 'text-rose-300' },
  { label: 'Devotional', icon: '🪔', color: 'from-amber-500/20 to-amber-400/5', border: 'border-amber-400/30', text: 'text-amber-300' },
  { label: 'Melancholic', icon: '🌧', color: 'from-blue-500/20 to-blue-400/5', border: 'border-blue-400/30', text: 'text-blue-300' },
  { label: 'Joyful', icon: '🌟', color: 'from-yellow-500/20 to-yellow-400/5', border: 'border-yellow-400/30', text: 'text-yellow-300' },
  { label: 'Focus', icon: '🎯', color: 'from-purple-500/20 to-purple-400/5', border: 'border-purple-400/30', text: 'text-purple-300' },
  { label: 'Energetic', icon: '⚡', color: 'from-orange-500/20 to-orange-400/5', border: 'border-orange-400/30', text: 'text-orange-300' },
]

interface Raga {
  id: string
  name: string
  tradition: string
  time_of_day: string
  mood: string
  aroha: string[]
  avaroha: string[]
  vadi: string
  samvadi: string
}

export default function MoodExplorerPage() {
  const [activeMood, setActiveMood] = useState<string | null>(null)
  const [ragas, setRagas] = useState<Raga[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function selectMood(mood: string) {
    setActiveMood(mood)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ragas/mood/${encodeURIComponent(mood)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRagas(data.ragas ?? [])
    } catch (err: any) {
      setError(err.message ?? 'Could not load ragas')
      setRagas([])
    } finally {
      setLoading(false)
    }
  }

  const activeMoodStyle = MOODS.find(m => m.label === activeMood)

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 dot-pattern opacity-20" />
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/library" className="inline-flex items-center gap-2 text-on-surface-variant/40 hover:text-on-surface-variant text-xs mb-6 transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Back to Library
          </Link>
          <div className="inline-flex items-center gap-2 glass-gold rounded-full px-4 py-1.5 text-xs font-semibold text-primary-light uppercase tracking-wider mb-4">
            <Sparkles className="w-3 h-3" />
            Mood Explorer
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gradient-subtle tracking-tight">
            How are you feeling?
          </h1>
          <p className="text-on-surface-variant/40 mt-3 max-w-md">
            Pick a mood and discover ragas that match your emotional state.
          </p>
        </div>

        {/* Mood chips */}
        <div className="flex flex-wrap gap-3 mb-12">
          {MOODS.map(mood => (
            <button
              key={mood.label}
              onClick={() => selectMood(mood.label)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl border bg-gradient-to-br transition-all duration-300 font-medium text-sm ${
                activeMood === mood.label
                  ? `${mood.color} ${mood.border} ${mood.text} scale-105 shadow-lg`
                  : 'bg-surface-container/40 border-outline-variant/20 text-on-surface-variant/60 hover:border-outline-variant/40 hover:text-on-surface-variant'
              }`}
            >
              <span className="text-base">{mood.icon}</span>
              {mood.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-52 rounded-3xl glass animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="py-10 text-center text-on-surface-variant/40 text-sm">{error}</div>
        )}

        {!loading && !error && ragas.length > 0 && (
          <>
            <div className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/30 mb-4">
              {ragas.length} raga{ragas.length !== 1 ? 's' : ''} for {activeMood}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {ragas.map(raga => (
                <div key={raga.id} className={`group rounded-3xl border bg-gradient-to-br p-5 transition-all duration-300 hover:scale-[1.02] ${activeMoodStyle?.color ?? 'from-primary/10 to-transparent'} ${activeMoodStyle?.border ?? 'border-primary/20'}`}>
                  <div className="mb-4">
                    <div className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30 mb-1">
                      {raga.tradition} · {raga.time_of_day}
                    </div>
                    <h3 className="text-lg font-bold text-on-surface">Raga {raga.name}</h3>
                    {raga.vadi && (
                      <div className="text-xs text-on-surface-variant/50 mt-1">
                        Vadi: <span className="text-on-surface-variant/70">{raga.vadi}</span>
                        {raga.samvadi && <> · Samvadi: <span className="text-on-surface-variant/70">{raga.samvadi}</span></>}
                      </div>
                    )}
                  </div>

                  {raga.aroha && (
                    <div className="mb-4 text-[10px] font-mono text-on-surface-variant/40 leading-relaxed">
                      <span className="text-on-surface-variant/30">↑ </span>{raga.aroha.join(' ')}
                      <br />
                      <span className="text-on-surface-variant/30">↓ </span>{raga.avaroha?.join(' ')}
                    </div>
                  )}

                  <Link
                    href={`/studio?raga_name=${encodeURIComponent(raga.name)}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary-light text-xs font-semibold transition-all"
                  >
                    Open in Studio
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && !error && activeMood && ragas.length === 0 && (
          <div className="py-16 text-center text-on-surface-variant/40 text-sm">
            No ragas found for {activeMood} mood yet.
          </div>
        )}
      </div>
    </div>
  )
}
