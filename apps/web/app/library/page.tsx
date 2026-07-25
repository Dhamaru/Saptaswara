'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import RagaCard from '@/components/RagaCard'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useGlobalAssistant } from '@/context/GlobalAssistantContext'
import { getSwaraType, swaraAccent, swaraFullLabel, swaraDisplayName } from '@/lib/swaraUtils'
import { getGamakaProfile, GAMAKA_LABELS, GAMAKA_DESCRIPTIONS, type GamakaType } from '@/lib/gamakaData'
import { MoodPicker } from '@/components/MoodPicker'
import dynamic from 'next/dynamic'
import { getCachedRagas, cacheRagas } from '@/lib/ragaCache'
import RagaGraph from '@/components/RagaGraph'

const PakadQuiz = dynamic(() => import('@/components/PakadQuiz').then(m => ({ default: m.PakadQuiz })), { ssr: false })

const TIME_FILTERS = ['ALL', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT']
const TRADITION_FILTERS = ['ALL', 'HINDUSTANI', 'CARNATIC', 'SAVED']
const MOOD_FILTERS = ['Calm', 'Romantic', 'Devotional', 'Melancholic', 'Joyful', 'Focus', 'Energetic']
const STARTER_RAGA_NAMES = ['Yaman', 'Bhoopali', 'Bhimpalasi', 'Bhairavi', 'Desh', 'Kafi', 'Hamsadhwani', 'Durga']
const SORT_OPTIONS = [
  { value: 'name-asc',  label: 'Name A→Z' },
  { value: 'name-desc', label: 'Name Z→A' },
  { value: 'time',      label: 'Time of Day' },
  { value: 'melakarta', label: 'Melakarta #' },
] as const
type SortOption = typeof SORT_OPTIONS[number]['value']

const displaySwara = (val: string | null | undefined): string => {
  if (!val) return '—'
  const v = val.trim().toLowerCase()
  if (v === 'unknown' || v === 'n/a' || v === 'classical' || v === '') return '—'
  return val.trim()
}

// ── Swara pill: color-coded by note type ─────────────────────────────────────
function SwaraPill({ swara }: { swara: string }) {
  const type    = getSwaraType(swara)
  const display = swaraDisplayName(swara)
  const accent  = swaraAccent(swara)
  const full    = swaraFullLabel(swara)

  const cls =
    type === 'komal'  ? 'bg-blue-500/10 border-blue-400/25 text-blue-600' :
    type === 'tivra'  ? 'bg-amber-500/10 border-amber-400/25 text-amber-600' :
    type === 'achala' ? 'bg-surface-container-high/40 border-outline-variant/20 text-on-surface/70' :
                        'bg-primary/10 border-primary/20 text-primary/80'

  return (
    <span
      title={full}
      className={`inline-flex items-center gap-1 font-label text-sm px-3 py-1.5 rounded-xl border transition-all ${cls}`}
    >
      {display}
      {accent && (
        <span className="font-mono text-[10px] opacity-60 leading-none">{accent}</span>
      )}
    </span>
  )
}

// ── Gamaka type badge ─────────────────────────────────────────────────────────
const GAMAKA_COLORS: Record<GamakaType, string> = {
  meend:     'bg-violet-500/15 border-violet-400/30 text-violet-600',
  andolan:   'bg-amber-500/15 border-amber-400/30 text-amber-700',
  gamak:     'bg-rose-500/15 border-rose-400/30 text-rose-600',
  kan:       'bg-emerald-500/15 border-emerald-400/30 text-emerald-700',
  murki:     'bg-sky-500/15 border-sky-400/30 text-sky-600',
  khatka:    'bg-orange-500/15 border-orange-400/30 text-orange-700',
  sparsh:    'bg-cyan-500/15 border-cyan-400/30 text-cyan-700',
  pratyahat: 'bg-pink-500/15 border-pink-400/30 text-pink-700',
}

function GamakaTag({ type }: { type: GamakaType }) {
  return (
    <span
      title={GAMAKA_DESCRIPTIONS[type]}
      className={`inline-flex items-center px-2 py-0.5 rounded-lg border font-mono text-[8px] uppercase tracking-widest font-bold ${GAMAKA_COLORS[type]}`}
    >
      {GAMAKA_LABELS[type]}
    </span>
  )
}

export default function LibraryPage() {
  const [ragas, setRagas] = useState<any[]>([])
  const [cacheStale, setCacheStale] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [activeTradition, setActiveTradition] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRaga, setSelectedRaga] = useState<any | null>(null)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [showMoodPicker, setShowMoodPicker] = useState(false)
  const [compareRaga, setCompareRaga] = useState<any | null>(null)
  const [showCompare, setShowCompare] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('name-asc')
  const [activeMoods, setActiveMoods] = useState<Set<string>>(new Set())
  const [activeSwaras, setActiveSwaras] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'graph'>('grid')
  const [showQuiz, setShowQuiz] = useState(false)
  const [visibleCount, setVisibleCount] = useState(24)
  const [ragaDescription, setRagaDescription] = useState<string>('')
  const [descLoading, setDescLoading] = useState(false)
  const [favourites, setFavourites] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const stored = localStorage.getItem('saptaswara-favourites')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch { return new Set() }
  })
  // BUG-007: refs so the keyboard handler always reads current values without
  // being in the effect's dependency array — prevents listener re-registration on
  // every Arrow key press (focusedIdx) and every filter change (filteredRagas).
  const filteredRagasRef  = useRef<any[]>([])
  const focusedIdxRef     = useRef(-1)
  const previewTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null) // kept for hover focus only
  const router = useRouter()
  const { setRagaContext, openAssistant } = useGlobalAssistant()

  // Keep GlobalAssistant context in sync with the selected raga
  useEffect(() => {
    setRagaContext(selectedRaga ?? null)
    setRagaDescription('')
    setShowCompare(false)
    setCompareRaga(null)
  }, [selectedRaga, setRagaContext])

  const fetchRagaDescription = async () => {
    if (!selectedRaga || descLoading) return
    setDescLoading(true)
    setRagaDescription('')
    try {
      const supabaseLocal = createClient()
      const { data: { session } } = await supabaseLocal.auth.getSession()
      const token = session?.access_token
      if (!token) { setDescLoading(false); return }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Describe Raga ${selectedRaga.name} in 3–4 sentences: its mood, time, characteristic movements, and emotional character.` }],
          ragaContext: {
            name: selectedRaga.name,
            aroha: selectedRaga.aroha,
            avaroha: selectedRaga.avaroha,
            vadi: selectedRaga.vadi,
            samvadi: selectedRaga.samvadi,
            mood: selectedRaga.mood,
          },
          mode: 'learn',
        }),
      })
      if (!res.ok || !res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          setRagaDescription(prev => prev + data)
        }
      }
    } catch (err) {
      console.error('Raga description fetch failed:', err)
    } finally {
      setDescLoading(false)
    }
  }

  const toggleFavourite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFavourites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try { localStorage.setItem('saptaswara-favourites', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  const fetchRagas = async (background = false) => {
    if (!background) {
      setFetchError(null)
      setLoading(true)
    }
    try {
      const supabase = createClient()
      // Exclude `embedding` (vector(768) = 3KB/row) — never used client-side.
      // At 200 ragas this saves ~600KB per library load.
      const { data, error } = await supabase
        .from('ragas')
        .select('id,name,tradition,thaat,time_of_day,vadi,samvadi,aroha,avaroha,mood,prahara,melakarta_number,modern_moods,starter_raga,grammar,raga_phrases(*)')
        .order('name')
      if (error) throw error
      const fresh = data || []
      setRagas(fresh)
      setCacheStale(false)
      await cacheRagas(fresh)
    } catch (err) {
      if (!background) {
        console.error('Failed to fetch ragas:', err)
        setFetchError('Could not load the raga library. Check your connection and try again.')
      }
    } finally {
      if (!background) setLoading(false)
    }
  }

  useEffect(() => {
    // Load from IndexedDB instantly, then refresh from network in background
    getCachedRagas().then(cached => {
      if (cached) {
        setRagas(cached.ragas)
        setLoading(false)
        if (cached.stale) {
          setCacheStale(true)
          fetchRagas(true)
        } else {
          fetchRagas(true) // silent refresh even if fresh
        }
      } else {
        fetchRagas(false)
      }
    }).catch(() => fetchRagas(false))
  }, [])

  // Read initial filter state from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    const trad = params.get('tradition')
    const time = params.get('time')
    const sort = params.get('sort')
    if (q) setSearchQuery(q)
    if (trad && TRADITION_FILTERS.includes(trad)) setActiveTradition(trad)
    if (time && TIME_FILTERS.includes(time)) setActiveFilter(time)
    if (sort && SORT_OPTIONS.some(o => o.value === sort)) setSortBy(sort as SortOption)
  }, [])

  // Sync filter state to URL without triggering navigation
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (activeTradition !== 'ALL') params.set('tradition', activeTradition)
    if (activeFilter !== 'ALL') params.set('time', activeFilter)
    if (sortBy !== 'name-asc') params.set('sort', sortBy)
    const search = params.toString()
    const newUrl = search ? `?${search}` : window.location.pathname
    window.history.replaceState({}, '', newUrl)
  }, [searchQuery, activeTradition, activeFilter, sortBy])

  // Reset focused index and pagination when filters change
  useEffect(() => { setFocusedIdx(-1); setVisibleCount(24) }, [searchQuery, activeFilter, activeTradition, sortBy, activeMoods, activeSwaras])

  const filteredRagas = ragas.filter(r => {
    const ragaTradition = r.tradition?.toUpperCase() || 'HINDUSTANI'
    const matchesTradition =
      activeTradition === 'ALL' ? true :
      activeTradition === 'SAVED' ? favourites.has(r.id) :
      ragaTradition === activeTradition
    const matchesFilter = activeFilter === 'ALL' || r.time_of_day?.toUpperCase().includes(activeFilter)
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.mood?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesMood = activeMoods.size === 0 || (() => {
      const ragaMood = (r.mood ?? '').toLowerCase()
      const moodArr: string[] = Array.isArray(r.modern_moods) ? r.modern_moods : []
      return [...activeMoods].some(m =>
        moodArr.some((mm: string) => mm.toLowerCase() === m.toLowerCase()) ||
        ragaMood.includes(m.toLowerCase())
      )
    })()
    const matchesSwaras = activeSwaras.size === 0 || (() => {
      const ragaSwaras = new Set<string>(
        [...(Array.isArray(r.aroha) ? r.aroha : []), ...(Array.isArray(r.avaroha) ? r.avaroha : [])]
          .map((s: string) => s.replace(/^[.,]+/, '').replace(/['^]+$/, '').replace(/\d+$/, ''))
      )
      return [...activeSwaras].every(sw => ragaSwaras.has(sw))
    })()
    return matchesTradition && matchesFilter && matchesSearch && matchesMood && matchesSwaras
  })

  const TIME_ORDER = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT']
  const sortedRagas = [...filteredRagas].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':  return a.name.localeCompare(b.name)
      case 'name-desc': return b.name.localeCompare(a.name)
      case 'time': {
        const ai = TIME_ORDER.indexOf(a.time_of_day?.toUpperCase() ?? '')
        const bi = TIME_ORDER.indexOf(b.time_of_day?.toUpperCase() ?? '')
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
      }
      case 'melakarta': return (a.melakarta_number ?? 999) - (b.melakarta_number ?? 999)
      default: return 0
    }
  })

  // BUG-007: keep refs in sync so the keyboard handler reads current values
  filteredRagasRef.current = sortedRagas
  focusedIdxRef.current    = focusedIdx

  // Keyboard navigation — stable listener (empty deps); reads via refs (BUG-007)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Escape') {
        setSelectedRaga(null)
        setFocusedIdx(-1)
        return
      }

      const list = filteredRagasRef.current
      if (!list.length) return

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        setFocusedIdx(prev => Math.min(prev + 1, list.length - 1))
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setFocusedIdx(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && focusedIdxRef.current >= 0) {
        e.preventDefault()
        const raga = list[focusedIdxRef.current]
        setSelectedRaga((prev: any) => prev?.id === raga.id ? null : raga)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary opacity-60">Raga Library</div>
              {cacheStale && (
                <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-amber-500 border border-amber-500/25 bg-amber-500/8 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Updating…
                </span>
              )}
            </div>
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 md:gap-10">
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
                        className={`px-4 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
                          activeTradition === f
                            ? f === 'SAVED'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-glow'
                              : 'bg-secondary/20 text-secondary border border-secondary/30 shadow-glow'
                            : 'bg-surface-container-low/20 text-on-surface-variant/40 border border-outline-variant/5 hover:border-outline-variant/20'
                        }`}
                      >
                        {f === 'SAVED' && (
                          <span className="material-symbols-outlined !text-[10px] leading-none">favorite</span>
                        )}
                        {f === 'SAVED' ? 'Saved' : f}
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

                {/* Sort + Mood row */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30 w-16 flex-shrink-0">Sort</span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as SortOption)}
                    className="flex-1 bg-surface-container-low/20 border border-outline-variant/10 rounded-xl px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60 focus:border-primary/40 focus:outline-none transition-all"
                  >
                    {SORT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Mood filter chips */}
                <div className="flex items-start gap-2">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30 w-16 flex-shrink-0 pt-1.5">Mood</span>
                  <div className="flex flex-wrap gap-1.5">
                    {MOOD_FILTERS.map(m => {
                      const active = activeMoods.has(m)
                      return (
                        <button
                          key={m}
                          onClick={() => setActiveMoods(prev => {
                            const next = new Set(prev)
                            active ? next.delete(m) : next.add(m)
                            return next
                          })}
                          className={`px-3 py-1 rounded-full font-mono text-[8px] uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0 ${
                            active
                              ? 'bg-primary/20 text-primary border border-primary/40 shadow-glow'
                              : 'bg-surface-container-low/20 text-on-surface-variant/40 border border-outline-variant/5 hover:border-outline-variant/20'
                          }`}
                        >
                          {m}
                        </button>
                      )
                    })}
                    {activeMoods.size > 0 && (
                      <button
                        onClick={() => setActiveMoods(new Set())}
                        className="px-2 py-1 rounded-full font-mono text-[8px] text-on-surface-variant/30 hover:text-on-surface-variant/60 border border-outline-variant/5 transition-all"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Swara filter chips */}
                <div className="flex items-start gap-2">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30 w-16 flex-shrink-0 pt-1.5">Swaras</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(['Sa','re','Re','ga','Ga','Ma','ma','Pa','dha','Dha','ni','Ni'] as const).map(sw => {
                      const active = activeSwaras.has(sw)
                      const isKomal = /^[a-z]/.test(sw) && sw !== 'Sa'
                      const isTivra = sw === 'ma'
                      return (
                        <button
                          key={sw}
                          onClick={() => setActiveSwaras(prev => {
                            const next = new Set(prev)
                            active ? next.delete(sw) : next.add(sw)
                            return next
                          })}
                          className={`px-2.5 py-1 rounded-lg font-mono text-[9px] tracking-wide transition-all flex-shrink-0 border ${
                            active
                              ? isKomal ? 'bg-blue-500/20 text-blue-300 border-blue-400/50'
                                : isTivra ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                                : 'bg-primary/20 text-primary border-primary/40'
                              : 'bg-surface-container-low/20 text-on-surface-variant/40 border-outline-variant/5 hover:border-outline-variant/20'
                          }`}
                        >
                          {sw}
                        </button>
                      )
                    })}
                    {activeSwaras.size > 0 && (
                      <button
                        onClick={() => setActiveSwaras(new Set())}
                        className="px-2 py-1 rounded-full font-mono text-[8px] text-on-surface-variant/30 hover:text-on-surface-variant/60 border border-outline-variant/5 transition-all"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Mood picker trigger */}
                <button
                  onClick={() => setShowMoodPicker(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-secondary/25 bg-secondary/8 text-secondary font-mono text-[9px] uppercase tracking-widest font-bold hover:bg-secondary/15 transition-all w-full justify-center"
                >
                  <span className="material-symbols-outlined !text-sm">mood</span>
                  Find a Raga by Mood
                </button>
                {/* Pakad quiz trigger */}
                <button
                  onClick={() => setShowQuiz(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-tertiary/25 bg-tertiary/8 text-tertiary font-mono text-[9px] uppercase tracking-widest font-bold hover:bg-tertiary/15 transition-all w-full justify-center"
                >
                  <span className="material-symbols-outlined !text-sm">quiz</span>
                  Pakad Quiz
                </button>
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
                onClick={() => fetchRagas(false)}
                className="font-mono text-[10px] uppercase tracking-widest text-error/80 hover:text-error border border-error/20 hover:border-error/40 px-4 py-1.5 rounded-xl transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {/* Starter raga shelf — shown when no filters active */}
          {!loading && !searchQuery && activeFilter === 'ALL' && activeTradition === 'ALL' && (() => {
            const starters = ragas.filter(r => STARTER_RAGA_NAMES.includes(r.name))
            if (!starters.length) return null
            return (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-outline-variant/5" />
                  <span className="font-mono text-[9px] uppercase tracking-widest text-primary/50 font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined !text-[11px]">auto_awesome</span>
                    Good ragas to start with
                  </span>
                  <div className="h-px flex-1 bg-outline-variant/5" />
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                  {starters.map(raga => (
                    <button
                      key={raga.id}
                      onClick={() => setSelectedRaga(raga)}
                      className="flex-shrink-0 w-48 p-5 rounded-3xl bg-surface-lowest border border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                    >
                      <div className="font-mono text-[8px] uppercase tracking-widest text-primary/50 mb-2">{raga.time_of_day || 'Any time'}</div>
                      <div className="font-display text-xl font-light text-on-surface group-hover:text-primary transition-colors mb-1">{raga.name}</div>
                      {raga.mood && <div className="font-sans text-[11px] text-on-surface-variant/40 truncate">{raga.mood}</div>}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* View toggle */}
          {!loading && (
            <div className="flex items-center justify-between mb-6">
              <div className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/30">
                {sortedRagas.length} raga{sortedRagas.length !== 1 ? 's' : ''}
              </div>
              <div className="flex gap-1 p-1 rounded-xl bg-surface-container-low/30 border border-outline-variant/8">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[9px] uppercase tracking-widest transition-all ${
                    viewMode === 'grid'
                      ? 'bg-primary/20 text-primary border border-primary/25'
                      : 'text-on-surface-variant/40 hover:text-on-surface-variant/60'
                  }`}
                >
                  <span className="material-symbols-outlined !text-[13px]">grid_view</span>
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('graph')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[9px] uppercase tracking-widest transition-all ${
                    viewMode === 'graph'
                      ? 'bg-primary/20 text-primary border border-primary/25'
                      : 'text-on-surface-variant/40 hover:text-on-surface-variant/60'
                  }`}
                >
                  <span className="material-symbols-outlined !text-[13px]">hub</span>
                  Graph
                </button>
              </div>
            </div>
          )}

          {/* Graph view */}
          {!loading && viewMode === 'graph' && (
            <RagaGraph
              ragas={ragas}
              selectedId={selectedRaga?.id}
              onSelect={(r) => setSelectedRaga(r)}
            />
          )}

          {/* Raga grid */}
          {!loading && viewMode === 'graph' ? null : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8">
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
                        <div className="h-2.5 w-12 rounded-full bg-outline-variant/8 animate-pulse" />
                      </div>
                      <div className="h-4 w-16 rounded-sm bg-primary/10 animate-pulse" />

                      {/* Raga name */}
                      <div className="h-8 w-36 rounded-xl bg-primary/8 animate-pulse mt-2"
                        style={{ animationDelay: `${i * 80 + 100}ms` }} />

                      {/* Description lines */}
                      <div className="flex flex-col gap-2 mt-3">
                        <div className="h-2.5 w-full rounded-full bg-outline-variant/8 animate-pulse"
                          style={{ animationDelay: `${i * 80 + 160}ms` }} />
                        <div className="h-2.5 w-4/5 rounded-full bg-outline-variant/8 animate-pulse"
                          style={{ animationDelay: `${i * 80 + 200}ms` }} />
                        <div className="h-2.5 w-3/5 rounded-full bg-outline-variant/8 animate-pulse"
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8">
              {sortedRagas.slice(0, visibleCount).map((raga, idx) => (
                <div
                  key={raga.id}
                  className={`relative group/card rounded-[32px] transition-all duration-150 ${focusedIdx === idx ? 'ring-2 ring-primary/60 ring-offset-2 ring-offset-background' : ''}`}
                  onMouseEnter={() => { setFocusedIdx(idx) }}
                  onMouseLeave={() => { if (previewTimerRef.current) { clearTimeout(previewTimerRef.current); previewTimerRef.current = null } }}
                >
                  <button
                    onClick={(e) => toggleFavourite(raga.id, e)}
                    aria-label={favourites.has(raga.id) ? 'Remove from saved' : 'Save raga'}
                    className={`absolute top-4 right-4 z-10 p-2 rounded-xl backdrop-blur-md border transition-all ${
                      favourites.has(raga.id)
                        ? 'opacity-100 bg-rose-500/20 border-rose-400/30 text-rose-400'
                        : 'opacity-0 group-hover/card:opacity-100 bg-surface-lowest/70 border-outline-variant/10 text-on-surface-variant/40 hover:text-rose-400 hover:border-rose-400/30'
                    }`}
                  >
                    <span className="material-symbols-outlined !text-base leading-none">
                      {favourites.has(raga.id) ? 'favorite' : 'favorite_border'}
                    </span>
                  </button>
                  <RagaCard
                    raga={raga}
                    onClick={() => { setSelectedRaga((prev: any) => prev?.id === raga.id ? null : raga); setFocusedIdx(idx) }}
                  />
                </div>
              ))}
              {visibleCount < sortedRagas.length && (
                <div className="col-span-full flex justify-center pt-4 pb-2">
                  <button
                    onClick={() => setVisibleCount(c => c + 24)}
                    className="px-8 py-3 rounded-2xl glass-light hover:bg-primary/10 border border-outline-variant/20 hover:border-primary/30 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60 hover:text-primary transition-all"
                  >
                    Load more · {sortedRagas.length - visibleCount} remaining
                  </button>
                </div>
              )}
              {sortedRagas.length === 0 && (
                <div className="col-span-full py-28 text-center space-y-6">
                  <span className="material-symbols-outlined !text-5xl text-on-surface-variant/20 block">music_off</span>
                  <div className="space-y-2">
                    <p className="font-display text-xl font-light text-on-surface/50">No ragas match your search</p>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/30">
                      {searchQuery ? `"${searchQuery}"` : 'Current filters'} returned no results
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="px-5 py-2 rounded-xl bg-primary/10 border border-primary/20 font-mono text-[9px] uppercase tracking-widest text-primary hover:bg-primary/20 transition-all flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined !text-sm">backspace</span>
                        Clear search
                      </button>
                    )}
                    {activeFilter !== 'ALL' && (
                      <button
                        onClick={() => setActiveFilter('ALL')}
                        className="px-5 py-2 rounded-xl bg-surface-container-high/40 border border-outline-variant/10 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60 hover:text-on-surface transition-all"
                      >
                        Reset time filter
                      </button>
                    )}
                    {activeTradition !== 'ALL' && (
                      <button
                        onClick={() => setActiveTradition('ALL')}
                        className="px-5 py-2 rounded-xl bg-surface-container-high/40 border border-outline-variant/10 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60 hover:text-on-surface transition-all"
                      >
                        Reset {activeTradition === 'SAVED' ? 'saved' : 'tradition'} filter
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Detail panel — full-screen overlay on mobile, side panel on desktop ── */}
      {selectedRaga && (
        <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto md:flex-shrink-0 md:w-[440px] bg-surface-lowest border-l border-outline-variant/10 flex flex-col overflow-hidden transition-all duration-500 ease-in-out">
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

                {/* AI Raga Description */}
                <section>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-primary/60 mb-4 font-bold flex items-center gap-2">
                    <div className="h-px flex-1 bg-primary/10" />
                    AI Description
                    <div className="h-px flex-1 bg-primary/10" />
                  </div>
                  {ragaDescription ? (
                    <p className="font-sans text-sm text-on-surface-variant/80 leading-relaxed italic">
                      {ragaDescription}
                      {descLoading && <span className="inline-block w-1 h-3 bg-primary/60 ml-1 animate-pulse" />}
                    </p>
                  ) : (
                    <button
                      onClick={fetchRagaDescription}
                      disabled={descLoading}
                      className="w-full py-2.5 rounded-2xl bg-primary/8 border border-primary/15 font-mono text-[9px] uppercase tracking-widest text-primary/70 hover:bg-primary/15 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined !text-sm">{descLoading ? 'hourglass_top' : 'auto_awesome'}</span>
                      {descLoading ? 'Describing…' : 'Describe this Raga'}
                    </button>
                  )}
                </section>

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
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40">Aroha (Ascending)</span>
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="inline-flex items-center gap-1 font-mono text-[7px] text-blue-400/70"><span className="text-[9px]">♭</span>komal</span>
                        <span className="inline-flex items-center gap-1 font-mono text-[7px] text-amber-400/70"><span className="text-[9px]">♯</span>tivra</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedRaga.aroha?.map((s: string, i: number) => (
                        <SwaraPill key={i} swara={s} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 block mb-3">Avaroha (Descending)</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedRaga.avaroha?.map((s: string, i: number) => (
                        <SwaraPill key={i} swara={s} />
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
                            {phrase.sequence?.map(swaraDisplayName).join(' — ')}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-2xl bg-surface-container-low/10 border border-dashed border-outline-variant/10">
                        <p className="font-label text-base text-on-surface/50 font-medium leading-relaxed tracking-wide italic">
                          {selectedRaga.aroha?.slice(0, 4).map(swaraDisplayName).join(' — ')}
                          {selectedRaga.avaroha ? ` … ${selectedRaga.avaroha.slice(-3).map(swaraDisplayName).join(' — ')}` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Gamakas & Ornaments */}
                {(() => {
                  const profile = getGamakaProfile(selectedRaga.name)
                  if (!profile) return null
                  return (
                    <section>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-primary/60 mb-5 font-bold flex items-center gap-2">
                        <div className="h-px flex-1 bg-primary/10" />
                        Gamakas &amp; Ornaments
                        <div className="h-px flex-1 bg-primary/10" />
                      </div>

                      {/* Characteristic ornament badge */}
                      {profile.characteristicOrnament && (
                        <div className="flex items-center gap-2 mb-4">
                          <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40">Signature ornament</span>
                          <GamakaTag type={profile.characteristicOrnament} />
                        </div>
                      )}

                      {/* General note */}
                      <p className="font-sans text-sm text-on-surface-variant/60 leading-relaxed italic mb-5 px-1">
                        {profile.generalNotes}
                      </p>

                      {/* Per-swara specs */}
                      <div className="space-y-3">
                        {profile.specs.map((spec, i) => (
                          <div key={i} className={`p-4 rounded-2xl border transition-all ${spec.required ? 'bg-primary/5 border-primary/15' : 'bg-surface-container-low/20 border-outline-variant/10'}`}>
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <SwaraPill swara={spec.swara} />
                              <GamakaTag type={spec.type} />
                              {spec.required && (
                                <span className="font-mono text-[7px] uppercase tracking-widest text-primary/50 border border-primary/20 px-1.5 py-0.5 rounded-md">
                                  required
                                </span>
                              )}
                            </div>
                            <p className="font-sans text-xs text-on-surface-variant/70 leading-relaxed">
                              {spec.description}
                            </p>
                            {spec.details && (
                              <p className="font-mono text-[9px] text-on-surface-variant/40 mt-1.5 tracking-wide">
                                {spec.details}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Gamaka legend */}
                      <div className="mt-5 pt-4 border-t border-outline-variant/5 grid grid-cols-2 gap-1.5">
                        {(Object.entries(GAMAKA_LABELS) as [GamakaType, string][])
                          .filter(([k]) => profile.specs.some(s => s.type === k))
                          .map(([type, label]) => (
                            <div key={type} className="flex items-start gap-2">
                              <GamakaTag type={type} />
                              <span className="font-sans text-[10px] text-on-surface-variant/40 leading-tight pt-0.5">
                                {GAMAKA_DESCRIPTIONS[type]}
                              </span>
                            </div>
                          ))}
                      </div>
                    </section>
                  )
                })()}

                {/* Compare Panel */}
                {showCompare && (
                  <section>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-secondary/60 mb-4 font-bold flex items-center gap-2">
                      <div className="h-px flex-1 bg-secondary/10" />
                      Compare
                      <div className="h-px flex-1 bg-secondary/10" />
                    </div>

                    {/* Raga picker */}
                    <div className="mb-4">
                      <select
                        value={compareRaga?.id ?? ''}
                        onChange={e => setCompareRaga(ragas.find(r => r.id === e.target.value) ?? null)}
                        className="w-full bg-surface-container-low/20 border border-outline-variant/10 rounded-xl px-3 py-2.5 font-sans text-sm text-on-surface focus:border-secondary/40 focus:outline-none transition-all"
                      >
                        <option value="">Select a raga to compare…</option>
                        {ragas
                          .filter(r => r.id !== selectedRaga?.id)
                          .map(r => <option key={r.id} value={r.id}>{r.name}</option>)
                        }
                      </select>
                    </div>

                    {compareRaga && (
                      <div className="space-y-4">
                        {/* Side-by-side vadi/samvadi */}
                        <div className="grid grid-cols-2 gap-3">
                          {[selectedRaga, compareRaga].map((raga, ri) => (
                            <div key={ri} className="p-3 rounded-2xl bg-surface-container-low/20 border border-outline-variant/5">
                              <p className="font-mono text-[7px] uppercase tracking-widest text-on-surface-variant/40 mb-1 truncate">{raga.name}</p>
                              <div className="flex gap-2 text-xs text-on-surface/70">
                                <span className="text-amber-400">V: {raga.vadi || '—'}</span>
                                <span className="text-sky-400">S: {raga.samvadi || '—'}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Aroha comparison */}
                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 mb-2">Aroha</p>
                          <div className="grid grid-cols-2 gap-3">
                            {[selectedRaga, compareRaga].map((raga, ri) => (
                              <div key={ri} className="flex flex-wrap gap-1">
                                {raga.aroha?.map((s: string, i: number) => {
                                  const inOther = (ri === 0 ? compareRaga : selectedRaga)?.aroha?.includes(s)
                                  return (
                                    <span key={i} className={`font-label text-xs px-2 py-0.5 rounded-lg border ${
                                      inOther
                                        ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-400'
                                        : 'bg-surface-container-high/40 border-outline-variant/10 text-on-surface/60'
                                    }`}>
                                      {swaraDisplayName(s)}
                                    </span>
                                  )
                                })}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Shared notes */}
                        {(() => {
                          const setA = new Set(selectedRaga?.aroha ?? [])
                          const shared = (compareRaga?.aroha ?? []).filter((s: string) => setA.has(s))
                          if (!shared.length) return null
                          return (
                            <div>
                              <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 mb-2">
                                Shared notes ({shared.length})
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {shared.map((s: string, i: number) => (
                                  <span key={i} className="font-label text-xs px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-400/20 text-emerald-400">
                                    {swaraDisplayName(s)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </section>
                )}

                {/* Related Ragas (Same Thaat) */}
                {selectedRaga.thaat && (() => {
                  const related = ragas.filter(r => r.id !== selectedRaga.id && r.thaat === selectedRaga.thaat).slice(0, 5)
                  if (!related.length) return null
                  return (
                    <section>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-primary/60 mb-4 font-bold flex items-center gap-2">
                        <div className="h-px flex-1 bg-primary/10" />
                        Same Thaat · {selectedRaga.thaat}
                        <div className="h-px flex-1 bg-primary/10" />
                      </div>
                      <div className="space-y-2">
                        {related.map(r => (
                          <button
                            key={r.id}
                            onClick={() => setSelectedRaga(r)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-container-low/20 border border-outline-variant/5 hover:border-primary/20 hover:bg-primary/5 transition-all text-left"
                          >
                            <span className="font-display text-base font-light text-on-surface flex-1">{r.name}</span>
                            {r.time_of_day && (
                              <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30">{r.time_of_day}</span>
                            )}
                            <span className="material-symbols-outlined !text-sm text-primary/30">arrow_forward</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )
                })()}

                {/* Spacer so content clears the sticky button */}
                <div className="h-4" />
              </div>
            </div>

            {/* Sticky CTA — always visible at bottom */}
            <div className="flex-shrink-0 p-6 border-t border-outline-variant/10 bg-surface-lowest/80 backdrop-blur-md space-y-3">
              {/* Compare toggle */}
              <button
                onClick={() => setShowCompare(v => !v)}
                className={`w-full py-2.5 rounded-2xl font-mono text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  showCompare
                    ? 'bg-secondary/20 border border-secondary/30 text-secondary'
                    : 'bg-surface-container-high/40 border border-outline-variant/10 text-on-surface-variant/60 hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined !text-sm">compare_arrows</span>
                {showCompare ? 'Hide Compare' : 'Compare with another Raga'}
              </button>
              {/* Ask AI about this raga */}
              <button
                onClick={() => openAssistant(selectedRaga)}
                className="w-full py-3 bg-primary/10 border border-primary/25 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined !text-base">auto_awesome</span>
                Ask AI about {selectedRaga.name}
              </button>
              <button
                onClick={() => router.push(`/studio?raga_id=${selectedRaga.id}`)}
                className="w-full py-4 bg-gradient-to-r from-primary to-primary/70 rounded-2xl font-medium text-on-primary shadow-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <span className="material-symbols-outlined">auto_fix_high</span>
                Compose in this Raga
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pakad Quiz overlay */}
      {showQuiz && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm bg-surface-lowest rounded-[32px] border border-outline-variant/15 shadow-2xl">
            <PakadQuiz ragas={ragas} onClose={() => setShowQuiz(false)} />
          </div>
        </div>
      )}

      {/* Mood Picker overlay */}
      <MoodPicker
        open={showMoodPicker}
        onClose={() => setShowMoodPicker(false)}
        onSelectRaga={(name) => {
          // Find raga in the loaded list by name (case-insensitive)
          const match = ragas.find(r => r.name.toLowerCase() === name.toLowerCase())
          if (match) {
            setSelectedRaga(match)
          } else {
            // Not in DB — fall back to search so user can see the name
            setSearchQuery(name)
          }
        }}
      />
    </div>
  )
}
