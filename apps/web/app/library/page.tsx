'use client'

import { useState, useEffect } from 'react'
import RagaCard from '@/components/RagaCard'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useGlobalAssistant } from '@/context/GlobalAssistantContext'

const TIME_FILTERS = ['ALL', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT']
const TRADITION_FILTERS = ['ALL', 'HINDUSTANI', 'CARNATIC']

const displaySwara = (val: string | null | undefined): string => {
  if (!val) return '—'
  const v = val.trim().toLowerCase()
  if (v === 'unknown' || v === 'n/a' || v === 'classical' || v === '') return '—'
  return val.trim()
}

export default function LibraryPage() {
  const [ragas, setRagas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [activeTradition, setActiveTradition] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRaga, setSelectedRaga] = useState<any | null>(null)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const router = useRouter()
  const { setRagaContext, openAssistant } = useGlobalAssistant()

  // Keep GlobalAssistant context in sync with the selected raga
  useEffect(() => {
    setRagaContext(selectedRaga ?? null)
  }, [selectedRaga, setRagaContext])

  const fetchRagas = async () => {
    setFetchError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('ragas').select('*, raga_phrases(*)').order('name')
      if (error) throw error
      setRagas(data || [])
    } catch (err) {
      console.error('Failed to fetch ragas:', err)
      setFetchError('Could not load the raga library. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRagas() }, [])

  // Reset focused index when filters change
  useEffect(() => { setFocusedIdx(-1) }, [searchQuery, activeFilter, activeTradition])

  const filteredRagas = ragas.filter(r => {
    const ragaTradition = r.tradition?.toUpperCase() || 'HINDUSTANI'
    const matchesTradition = activeTradition === 'ALL' || ragaTradition === activeTradition
    const matchesFilter = activeFilter === 'ALL' || r.time_of_day?.toUpperCase().includes(activeFilter)
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.mood?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTradition && matchesFilter && matchesSearch
  })

  // Keyboard navigation for raga grid — placed after filteredRagas declaration
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Escape') {
        setSelectedRaga(null)
        setFocusedIdx(-1)
        return
      }

      if (!filteredRagas.length) return

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        setFocusedIdx(prev => Math.min(prev + 1, filteredRagas.length - 1))
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setFocusedIdx(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && focusedIdx >= 0) {
        e.preventDefault()
        const raga = filteredRagas[focusedIdx]
        setSelectedRaga((prev: any) => prev?.id === raga.id ? null : raga)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filteredRagas, focusedIdx])

  const atmosphereImg = (time_of_day: string | null) => {
    const t = time_of_day?.toLowerCase() || ''
    if (t.includes('morning')) return '/raga_morning_atmosphere.png'
    if (t.includes('night') || t.includes('evening')) return '/raga_night_atmosphere.png'
    return '/raga_afternoon_atmosphere.png'
  }

  return (
    // Root: full height flex row — sidebar is always in flow, animated via width
    <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] overflow-hidden bg-background">

      {/* ── Main library area ─────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto scroll-thin">
        <div className="px-4 md:px-12 py-8 md:py-16">

          {/* Header */}
          <header className="mb-8 md:mb-16">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-4 md:mb-6 opacity-60">Raga Library</div>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 md:gap-10">
              <div className="max-w-xl">
                <h1 className="font-display text-5xl md:text-7xl font-light text-on-surface tracking-tight mb-4 md:mb-6">Explore.</h1>
                <p className="font-sans text-sm md:text-lg text-on-surface-variant font-light leading-relaxed opacity-70">
                  Navigate the geometric structures of melodic time. Select a raga to explore its intervals, moods, and fundamental swaras.
                </p>
              </div>

              {/* Search + filters */}
              <div className="flex flex-col gap-4 lg:w-96 flex-shrink-0">
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/40 group-focus-within:text-primary transition-colors">search</span>
                  <input
                    placeholder="Search ragas, moods, thaats…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-container-low/40 rounded-2xl py-4 pl-12 pr-6 text-sm font-sans placeholder:text-on-surface-variant/20 border border-outline-variant/10 focus:border-primary/40 focus:bg-surface-lowest transition-all outline-none backdrop-blur-md"
                  />
                </div>

                {/* Tradition filter */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30 w-16 flex-shrink-0">Tradition</span>
                  <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                    {TRADITION_FILTERS.map(f => (
                      <button
                        key={f}
                        onClick={() => setActiveTradition(f)}
                        className={`px-4 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0 ${
                          activeTradition === f
                            ? 'bg-secondary/20 text-secondary border border-secondary/30 shadow-glow'
                            : 'bg-surface-container-low/20 text-on-surface-variant/40 border border-outline-variant/5 hover:border-outline-variant/20'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time filter */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30 w-16 flex-shrink-0">Time</span>
                  <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                    {TIME_FILTERS.map(f => (
                      <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={`px-4 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0 ${
                          activeFilter === f
                            ? 'bg-primary/20 text-primary border border-primary/30 shadow-glow'
                            : 'bg-surface-container-low/20 text-on-surface-variant/40 border border-outline-variant/5 hover:border-outline-variant/20'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Error banner */}
          {fetchError && (
            <div className="flex items-center justify-between gap-4 px-6 py-4 mb-8 rounded-2xl bg-error/10 border border-error/20">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined !text-xl text-error/80">error</span>
                <span className="font-sans text-sm text-error/80">{fetchError}</span>
              </div>
              <button
                onClick={fetchRagas}
                className="font-mono text-[10px] uppercase tracking-widest text-error/80 hover:text-error border border-error/20 hover:border-error/40 px-4 py-1.5 rounded-xl transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {/* Raga grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="relative h-80 rounded-[32px] bg-surface-lowest border border-outline-variant/5 overflow-hidden"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Shimmer sweep */}
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

                  <div className="relative z-10 p-6 md:p-10 h-full flex flex-col justify-between">
                    {/* Top: tag + tradition badge */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="h-2.5 w-20 rounded-full bg-primary/10 animate-pulse" />
                        <div className="h-2.5 w-12 rounded-full bg-white/5 animate-pulse" />
                      </div>
                      <div className="h-4 w-16 rounded-sm bg-primary/10 animate-pulse" />

                      {/* Raga name */}
                      <div className="h-8 w-36 rounded-xl bg-white/8 animate-pulse mt-2"
                        style={{ animationDelay: `${i * 80 + 100}ms` }} />

                      {/* Description lines */}
                      <div className="flex flex-col gap-2 mt-3">
                        <div className="h-2.5 w-full rounded-full bg-white/5 animate-pulse"
                          style={{ animationDelay: `${i * 80 + 160}ms` }} />
                        <div className="h-2.5 w-4/5 rounded-full bg-white/5 animate-pulse"
                          style={{ animationDelay: `${i * 80 + 200}ms` }} />
                        <div className="h-2.5 w-3/5 rounded-full bg-white/5 animate-pulse"
                          style={{ animationDelay: `${i * 80 + 240}ms` }} />
                      </div>
                    </div>

                    {/* Bottom: swara pills */}
                    <div className="flex gap-2">
                      {[28, 20, 24, 20, 20].map((w, j) => (
                        <div
                          key={j}
                          className="h-6 rounded-full bg-primary/10 animate-pulse"
                          style={{ width: `${w * 4}px`, animationDelay: `${i * 80 + j * 60}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredRagas.map((raga, idx) => (
                <div
                  key={raga.id}
                  className={`rounded-[32px] transition-all duration-150 ${focusedIdx === idx ? 'ring-2 ring-primary/60 ring-offset-2 ring-offset-background' : ''}`}
                  onMouseEnter={() => setFocusedIdx(idx)}
                >
                  <RagaCard
                    raga={raga}
                    onClick={() => { setSelectedRaga((prev: any) => prev?.id === raga.id ? null : raga); setFocusedIdx(idx) }}
                  />
                </div>
              ))}
              {filteredRagas.length === 0 && (
                <div className="col-span-full py-24 text-center text-on-surface-variant/40">
                  <span className="material-symbols-outlined !text-4xl mb-4 block">search_off</span>
                  <p className="font-mono text-[10px] uppercase tracking-widest">No ragas match your filters</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Detail panel — full-screen overlay on mobile, side panel on desktop ── */}
      {selectedRaga && (
        <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto md:flex-shrink-0 md:w-[440px] bg-surface-lowest border-l border-outline-variant/10 flex flex-col overflow-hidden transition-all duration-500 ease-in-out">
        {selectedRaga && (
          <div className="w-full md:w-[440px] flex flex-col h-full overflow-hidden">

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto scroll-thin">

              {/* Atmospheric header */}
              <div className="relative overflow-hidden" style={{ minHeight: '280px' }}>
                <div className="absolute inset-0 z-0 select-none pointer-events-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={atmosphereImg(selectedRaga.time_of_day)}
                    alt=""
                    className="absolute inset-0 object-cover w-full h-full opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-lowest via-surface-lowest/70 to-surface-lowest/30" />
                </div>

                <div className="relative z-10 p-8 flex flex-col justify-between" style={{ minHeight: '280px' }}>
                  {/* Dismiss */}
                  <button
                    onClick={() => setSelectedRaga(null)}
                    className="flex items-center gap-2 text-on-surface-variant/60 hover:text-on-surface transition-colors w-fit bg-surface-lowest/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-outline-variant/10 shadow-sm"
                  >
                    <span className="material-symbols-outlined !text-lg">close</span>
                    <span className="font-mono text-[9px] uppercase tracking-widest font-semibold">Close</span>
                  </button>

                  {/* Raga identity */}
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {selectedRaga.time_of_day && selectedRaga.time_of_day.toLowerCase() !== 'any' && (
                        <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
                          {selectedRaga.time_of_day}
                        </span>
                      )}
                      {selectedRaga.tradition && (
                        <span className={`px-2.5 py-0.5 rounded-full font-mono text-[8px] uppercase tracking-widest font-bold border ${
                          selectedRaga.tradition?.toLowerCase() === 'carnatic'
                            ? 'bg-secondary/10 text-secondary border-secondary/20'
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}>
                          {selectedRaga.tradition}
                        </span>
                      )}
                      {selectedRaga.tradition === 'Carnatic' && selectedRaga.melakarta_number && (
                        <span className="px-2.5 py-0.5 bg-surface-lowest/60 text-on-surface-variant/60 border border-outline-variant/10 rounded-full font-mono text-[8px] uppercase tracking-widest">
                          Melakarta #{selectedRaga.melakarta_number}
                        </span>
                      )}
                    </div>
                    <h2 className="font-display text-5xl font-light text-on-surface tracking-tighter mb-3 leading-tight">
                      {selectedRaga.name}
                    </h2>
                    {selectedRaga.mood && (
                      <p className="text-on-surface-variant/60 font-sans font-light italic text-base leading-relaxed">
                        "{selectedRaga.mood}"
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Detail body */}
              <div className="px-8 py-8 space-y-10">

                {/* Melodic Structure */}
                <section>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-primary/60 mb-5 font-bold flex items-center gap-2">
                    <div className="h-px flex-1 bg-primary/10" />
                    Melodic Structure
                    <div className="h-px flex-1 bg-primary/10" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 rounded-2xl bg-surface-container-low/20 border border-outline-variant/5">
                      <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 block mb-2">Vadi (Primary)</span>
                      <span className={`font-display text-3xl font-light ${displaySwara(selectedRaga.vadi) === '—' ? 'text-on-surface-variant/25' : 'text-on-surface'}`}>
                        {displaySwara(selectedRaga.vadi)}
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-surface-container-low/20 border border-outline-variant/5">
                      <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 block mb-2">Samvadi (Secondary)</span>
                      <span className={`font-display text-3xl font-light ${displaySwara(selectedRaga.samvadi) === '—' ? 'text-on-surface-variant/25' : 'text-on-surface'}`}>
                        {displaySwara(selectedRaga.samvadi)}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Aroha / Avaroha */}
                <section className="space-y-5">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-primary/60 mb-5 font-bold flex items-center gap-2">
                    <div className="h-px flex-1 bg-primary/10" />
                    Scale
                    <div className="h-px flex-1 bg-primary/10" />
                  </div>
                  <div>
                    <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 block mb-3">Aroha (Ascending)</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedRaga.aroha?.map((s: string, i: number) => (
                        <span key={i} className="font-label text-sm text-on-surface border border-outline-variant/10 px-3 py-1.5 rounded-xl bg-surface-container-low/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 block mb-3">Avaroha (Descending)</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedRaga.avaroha?.map((s: string, i: number) => (
                        <span key={i} className="font-label text-sm text-on-surface border border-outline-variant/10 px-3 py-1.5 rounded-xl bg-surface-container-low/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Characteristic Phrases */}
                <section>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-primary/60 mb-5 font-bold flex items-center gap-2">
                    <div className="h-px flex-1 bg-primary/10" />
                    Characteristic Phrases
                    <div className="h-px flex-1 bg-primary/10" />
                  </div>
                  <div className="space-y-3">
                    {selectedRaga.raga_phrases && selectedRaga.raga_phrases.length > 0 ? (
                      selectedRaga.raga_phrases.map((phrase: any, i: number) => (
                        <div key={i} className="p-4 rounded-2xl bg-surface-container-low/20 border border-outline-variant/10 hover:border-primary/20 transition-all">
                          <div className="font-mono text-[8px] uppercase tracking-widest text-primary/60 mb-1.5 font-bold">{phrase.label}</div>
                          <p className="font-label text-base text-on-surface font-medium tracking-wide">
                            {phrase.sequence?.join(' — ')}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-2xl bg-surface-container-low/10 border border-dashed border-outline-variant/10">
                        <p className="font-label text-base text-on-surface/50 font-medium leading-relaxed tracking-wide italic">
                          {selectedRaga.aroha?.slice(0, 4).join(' — ')}
                          {selectedRaga.avaroha ? ` … ${selectedRaga.avaroha.slice(-3).join(' — ')}` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Spacer so content clears the sticky button */}
                <div className="h-4" />
              </div>
            </div>

            {/* Sticky CTA — always visible at bottom */}
            <div className="flex-shrink-0 p-6 border-t border-outline-variant/10 bg-surface-lowest/80 backdrop-blur-md space-y-3">
              {/* Ask AI about this raga */}
              <button
                onClick={() => openAssistant(selectedRaga)}
                className="w-full py-3 bg-primary/10 border border-primary/25 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined !text-base">auto_awesome</span>
                Ask AI about {selectedRaga.name}
              </button>
              <button
                onClick={() => router.push(`/studio?project_id=${selectedRaga.id}&guest=true`)}
                className="w-full py-4 bg-gradient-to-r from-primary to-primary/70 rounded-2xl font-medium text-white shadow-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <span className="material-symbols-outlined">auto_fix_high</span>
                Compose in this Raga
              </button>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  )
}
