'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { SwaraTranscriber, type SessionStats } from '@/components/SwaraTranscriber'
import { NotationEditor } from '@/components/NotationEditor'
import { RagaDetector } from '@/components/RagaDetector'
import { createClient } from '@/lib/supabase/client'
import { getAudioEngine } from '@/lib/audio'
import { swaraToFrequency } from '@/lib/musicalMath'
import { RagaEngine } from '@saptaswara/core'
import type { Raga } from '@saptaswara/core'

// ── Types ─────────────────────────────────────────────────────────────────────

type PlayMode = 'aroha' | 'avaroha' | 'free'

// ── Helpers ───────────────────────────────────────────────────────────────────

function isKomalSwara(raw: string): boolean {
  const bare = raw.replace(/[\^'.,]/g, '').trim()
  return bare.length > 0 && /[a-z]/.test(bare[0])
}

/** Strip octave markers (^ ') from a raw swara string for display */
function displaySwara(raw: string): string {
  return raw.replace(/[\^'.]/g, '').trim()
}

/** True if swara is in higher octave (ends with ^ or ') */
function isHighOctave(raw: string): boolean {
  return raw.includes('^') || raw.includes("'")
}

/** True if swara is in lower octave (starts with . or ,) */
function isLowOctave(raw: string): boolean {
  return raw.startsWith('.') || raw.startsWith(',')
}

/** Return a short octave marker label for display */
function octaveLabel(raw: string): string | null {
  if (isHighOctave(raw)) return '↑'
  if (isLowOctave(raw)) return '↓'
  return null
}

/** Get the normalized bare name (no octave marks) */
function bareName(raw: string): string {
  return raw.replace(/[\^'.]/g, '').trim()
}

// ── Swara Card ────────────────────────────────────────────────────────────────

interface SwaraCardProps {
  swara: string
  isActive: boolean
  isVadi: boolean
  isSamvadi: boolean
  isVarjya: boolean
  onClick: () => void
}

function SwaraCard({ swara, isActive, isVadi, isSamvadi, isVarjya, onClick }: SwaraCardProps) {
  const name    = displaySwara(swara)
  const oct     = octaveLabel(swara)
  const varjya  = isVarjya && !isVadi && !isSamvadi

  return (
    <button
      onClick={varjya ? undefined : onClick}
      disabled={varjya}
      className={[
        'relative flex flex-col items-center justify-center rounded-3xl border transition-all duration-200 select-none',
        'w-28 h-36 md:w-36 md:h-44 lg:w-40 lg:h-48',
        varjya
          ? 'opacity-30 cursor-not-allowed border-outline-variant/10 bg-surface-container-low/20'
          : isActive
            ? 'scale-105 border-primary/60 bg-primary/20 shadow-[0_0_32px_rgba(var(--primary)/0.35)] cursor-pointer'
            : 'border-white/10 bg-white/5 backdrop-blur-md hover:border-primary/30 hover:bg-primary/10 hover:scale-[1.03] cursor-pointer active:scale-95',
      ].join(' ')}
      aria-label={`Play ${name}${varjya ? ' (varjya — avoid)' : ''}`}
      title={varjya ? `${name} — varjya (avoid in this raga)` : `Play ${name}`}
    >
      {/* Vadi badge */}
      {isVadi && (
        <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-400 font-mono text-[8px] uppercase tracking-widest font-bold">
          Vadi
        </span>
      )}
      {/* Samvadi badge */}
      {isSamvadi && (
        <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/40 text-sky-400 font-mono text-[8px] uppercase tracking-widest font-bold">
          Samvadi
        </span>
      )}

      {/* Swara name */}
      <span className={[
        'font-display leading-none',
        isActive ? 'text-primary' : varjya ? 'text-on-surface-variant/30' : 'text-on-surface',
        'text-5xl md:text-6xl',
      ].join(' ')}>
        {name}
      </span>

      {/* Octave indicator */}
      {oct && (
        <span className={[
          'mt-1.5 font-mono text-base',
          isActive ? 'text-primary/70' : 'text-on-surface-variant/40',
        ].join(' ')}>
          {oct}
        </span>
      )}

      {/* Active pulse ring */}
      {isActive && (
        <span className="absolute inset-0 rounded-3xl border-2 border-primary/40 animate-ping" />
      )}
    </button>
  )
}

// ── Grammar Hints Panel ───────────────────────────────────────────────────────

function GrammarPanel({ raga }: { raga: Raga }) {
  const timeEmoji: Record<string, string> = {
    Morning: '🌅', Afternoon: '☀️', Evening: '🌆', Night: '🌙',
    morning: '🌅', afternoon: '☀️', evening: '🌆', night: '🌙',
  }
  const timeIcon = timeEmoji[raga.time_of_day] ?? '🕐'

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-5 space-y-4">
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50 mb-3">
        Grammar
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Vadi */}
        <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-amber-400/60 mb-1">Vadi</div>
          <div className="font-display text-2xl text-amber-400">{raga.vadi || '—'}</div>
          <div className="font-mono text-[9px] text-amber-400/50 mt-0.5">King swara</div>
        </div>

        {/* Samvadi */}
        <div className="rounded-xl bg-sky-500/10 border border-sky-400/20 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-sky-400/60 mb-1">Samvadi</div>
          <div className="font-display text-2xl text-sky-400">{raga.samvadi || '—'}</div>
          <div className="font-mono text-[9px] text-sky-400/50 mt-0.5">Minister swara</div>
        </div>
      </div>

      {/* Time of day */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
        <span className="text-xl">{timeIcon}</span>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40">Time</div>
          <div className="font-label text-sm text-on-surface">{raga.time_of_day || '—'}</div>
        </div>
      </div>

      {/* Mood */}
      {raga.mood && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 mb-1">Mood</div>
          <div className="font-label text-sm text-on-surface leading-snug">{raga.mood}</div>
        </div>
      )}

      {/* Thaat */}
      {raga.thaat && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 mb-1">Thaat</div>
          <div className="font-label text-sm text-on-surface">{raga.thaat}</div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RiyazPage() {
  const supabase = createClient()

  const searchParams = useSearchParams()

  // ── State ──────────────────────────────────────────────────────────────────
  const [ragas, setRagas]           = useState<Raga[]>([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedRaga, setSelectedRaga] = useState<Raga | null>(null)
  const [playMode, setPlayMode]     = useState<PlayMode>('aroha')
  const [activeIdx, setActiveIdx]   = useState(-1)       // index into current sequence
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const [ornamentMode, setOrnamentMode] = useState(false)
  const [showTranscriber, setShowTranscriber] = useState(false)
  const [traditionFilter, setTraditionFilter] = useState<'all' | 'hindustani' | 'carnatic'>('all')
  const [meendDuration, setMeendDuration] = useState(0.4)
  const [andolanMode, setAndolanMode] = useState(false)
  const [gamakaHistory, setGamakaHistory] = useState<{ swara: string; ornament: string; ts: number }[]>([])
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null)
  const [swaraFeedback, setSwaraFeedback] = useState<string | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFeedbackSwaraRef = useRef<string | null>(null)

  // ── Record / Playback ──────────────────────────────────────────────────────
  type RecordedNote = { swara: string; freq: number; delayMs: number }
  const [isRecording, setIsRecording] = useState(false)
  const [recordedSeq, setRecordedSeq] = useState<RecordedNote[]>([])
  const [isPlayingBack, setIsPlayingBack] = useState(false)
  const recordStartRef   = useRef<number>(0)
  const lastNoteTimeRef  = useRef<number>(0)
  const playbackTimers   = useRef<ReturnType<typeof setTimeout>[]>([])

  const startRecording = useCallback(() => {
    setRecordedSeq([])
    setIsRecording(true)
    recordStartRef.current  = Date.now()
    lastNoteTimeRef.current = Date.now()
  }, [])

  const stopRecording = useCallback(() => {
    setIsRecording(false)
  }, [])

  const playbackRecording = useCallback(async () => {
    if (recordedSeq.length === 0) return
    const engine = getAudioEngine()
    if (!engine) return
    if (!engine.isStarted) await engine.start()
    setIsPlayingBack(true)
    let cumulative = 0
    playbackTimers.current.forEach(t => clearTimeout(t))
    playbackTimers.current = []
    recordedSeq.forEach((note, i) => {
      cumulative += note.delayMs
      const t = setTimeout(() => {
        engine.playSwara(note.freq, '4n')
        if (i === recordedSeq.length - 1) setIsPlayingBack(false)
      }, cumulative)
      playbackTimers.current.push(t)
    })
  }, [recordedSeq])

  useEffect(() => {
    return () => playbackTimers.current.forEach(t => clearTimeout(t))
  }, [])

  const autoTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevFreqRef  = useRef<number | null>(null)
  const dropdownRef  = useRef<HTMLDivElement>(null)

  // ── Fetch ragas ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchRagas() {
      setLoading(true)
      const { data, error } = await supabase
        .from('ragas')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        setFetchError(error.message)
      } else {
        const list = (data as Raga[]) ?? []
        setRagas(list)
      }
      setLoading(false)
    }
    fetchRagas()
  }, [])

  // Auto-select raga from URL param — re-runs when searchParams change
  useEffect(() => {
    const ragaParam = searchParams.get('raga_name')
    if (!ragaParam || ragas.length === 0) return
    const match = ragas.find(r => r.name.toLowerCase() === ragaParam.toLowerCase())
    if (match) setSelectedRaga(match)
  }, [searchParams, ragas])

  // ── Close dropdown on outside click ───────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Derive active swara sequence ───────────────────────────────────────────
  const sequence: string[] = selectedRaga
    ? playMode === 'aroha'
      ? (selectedRaga.aroha as string[])
      : playMode === 'avaroha'
        ? (selectedRaga.avaroha as string[])
        : [...new Set([...(selectedRaga.aroha as string[]), ...(selectedRaga.avaroha as string[])])]
    : []

  // ── Audio init on first interaction ───────────────────────────────────────
  const ensureAudio = useCallback(async () => {
    const engine = getAudioEngine()
    if (!engine) return
    if (!engine.isStarted) {
      await engine.start()
    }
    setAudioReady(true)
  }, [])

  // ── Play a swara by index ──────────────────────────────────────────────────
  const playAtIndex = useCallback(async (idx: number) => {
    if (!selectedRaga || idx < 0 || idx >= sequence.length) return

    await ensureAudio()
    const engine = getAudioEngine()
    if (!engine || !engine.isStarted) return

    const raw  = sequence[idx]
    const freq = swaraToFrequency(raw)
    if (!freq) return

    if (ornamentMode && prevFreqRef.current !== null && prevFreqRef.current !== freq) {
      engine.playMeend(prevFreqRef.current, freq, meendDuration)
    } else {
      engine.playSwara(freq, '4n')
    }

    if (andolanMode) {
      const bare = raw.replace(/[\^'.,]/g, '').trim()
      const isKomal = bare.length > 0 && bare[0] === bare[0].toLowerCase() && /[a-z]/.test(bare[0])
      if (isKomal && freq) {
        engine.playAndolan(freq, 1.5, 1.8, 0.5)
      }
    }

    prevFreqRef.current = freq
    setActiveIdx(idx)

    if (isRecording) {
      const now = Date.now()
      const delay = now - lastNoteTimeRef.current
      lastNoteTimeRef.current = now
      setRecordedSeq(prev => [...prev, { swara: displaySwara(raw), freq, delayMs: delay }])
    }

    const ornamentType = ornamentMode && prevFreqRef.current !== null && prevFreqRef.current !== freq
      ? 'meend'
      : andolanMode && isKomalSwara(raw)
        ? 'andolan'
        : 'plain'
    setGamakaHistory(prev => [{ swara: displaySwara(raw), ornament: ornamentType, ts: Date.now() }, ...prev].slice(0, 10))

    // Auto-advance: after 1 s, move to next swara
    if (autoAdvance && playMode !== 'free') {
      if (autoTimer.current) clearTimeout(autoTimer.current)
      autoTimer.current = setTimeout(() => {
        setActiveIdx(prev => {
          const next = prev + 1
          if (next < sequence.length) {
            playAtIndex(next)
            return next
          }
          return -1  // reached end, stop
        })
      }, 1000)
    }
  }, [selectedRaga, sequence, autoAdvance, playMode, ensureAudio, ornamentMode, meendDuration, andolanMode, isRecording])

  // Cleanup auto-advance timer on unmount / mode change
  useEffect(() => {
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current) }
  }, [playMode, selectedRaga])

  useEffect(() => {
    setActiveIdx(-1)
    prevFreqRef.current = null
    if (autoTimer.current) clearTimeout(autoTimer.current)
  }, [selectedRaga, playMode])

  // ── AI swara feedback (debounced, 1 sentence per note played) ───────────────
  const fetchSwaraFeedback = useCallback(async (swara: string) => {
    if (!selectedRaga) return
    const bare = displaySwara(swara)
    if (lastFeedbackSwaraRef.current === bare) return
    lastFeedbackSwaraRef.current = bare

    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = setTimeout(async () => {
      setFeedbackLoading(true)
      setSwaraFeedback(null)
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const token = session?.access_token
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `In raga ${selectedRaga.name}, the student just played ${bare}. Give exactly one sentence of musical insight about this note's role — mention if it's vadi, samvadi, komal, or its characteristic usage. Be concise.`
            }],
            ragaContext: { name: selectedRaga.name, vadi: selectedRaga.vadi, samvadi: selectedRaga.samvadi }
          })
        })
        if (!res.ok || !res.body) return
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let text = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              const d = line.slice(6).trim()
              if (d && d !== '[DONE]') text += d
            }
          }
        }
        if (text) setSwaraFeedback(text.trim())
      } catch {
        // silent — feedback is non-critical
      } finally {
        setFeedbackLoading(false)
      }
    }, 600)
  }, [selectedRaga])

  // ── Free-mode: play swara directly ────────────────────────────────────────
  const handleSwaraClick = useCallback(async (idx: number) => {
    if (!selectedRaga) return
    if (playMode === 'free') {
      await ensureAudio()
      const engine = getAudioEngine()
      if (!engine || !engine.isStarted) return
      const freq = swaraToFrequency(sequence[idx])
      if (freq) engine.playSwara(freq, '4n')
      setActiveIdx(idx)
    } else {
      // In Aroha/Avaroha mode: click to jump to that swara and continue from there
      playAtIndex(idx)
    }
    fetchSwaraFeedback(sequence[idx])
  }, [selectedRaga, playMode, sequence, ensureAudio, playAtIndex, fetchSwaraFeedback])

  // ── Grammar queries ────────────────────────────────────────────────────────
  const isVadi    = (swara: string) => selectedRaga ? bareName(swara) === bareName(selectedRaga.vadi)    : false
  const isSamvadi = (swara: string) => selectedRaga ? bareName(swara) === bareName(selectedRaga.samvadi) : false
  const isVarjya  = (swara: string) => {
    if (!selectedRaga) return false
    return RagaEngine.isVarjya(bareName(swara), selectedRaga)
  }

  // ── Filtered ragas for dropdown ────────────────────────────────────────────
  const filteredRagas = ragas.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase())
    const matchTrad = traditionFilter === 'all' || (r.tradition || '').toLowerCase().includes(traditionFilter)
    return matchSearch && matchTrad
  })

  // ── Free-mode unique swaras (union of aroha + avaroha, deduplicated) ───────
  // We show them in a grid for free mode, in a horizontal row for aroha/avaroha
  const showAsGrid = playMode === 'free'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      <Navbar />

      {/* Background ambient gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(var(--primary)/0.08),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-background to-transparent" />
      </div>

      <main className="flex-1 pt-20 md:pt-24 pb-16 px-4 md:px-8 max-w-7xl mx-auto w-full">

        {/* Page header */}
        <div className="mb-8 md:mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-light tracking-tight text-on-surface">
              Saadhana
            </h1>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-on-surface-variant/40">
              Focused practice · One raga at a time
            </p>
          </div>
          <Link
            href="/journal"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-high border border-outline-variant/10 text-on-surface-variant/50 hover:text-primary hover:border-primary/25 transition-all shrink-0 mt-1"
          >
            <span className="material-symbols-outlined !text-sm">book_2</span>
            <span className="font-mono text-[9px] uppercase tracking-widest">Journal</span>
          </Link>
        </div>

        {/* Top controls row */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">

          <div className="flex items-center rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-1.5 gap-1 shrink-0">
            {(['all', 'hindustani', 'carnatic'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTraditionFilter(t)}
                className={[
                  'px-3 py-2 rounded-xl font-mono text-[9px] uppercase tracking-widest transition-all',
                  traditionFilter === t
                    ? 'bg-primary text-on-primary shadow-glow'
                    : 'text-on-surface-variant/50 hover:text-on-surface',
                ].join(' ')}
              >
                {t === 'all' ? 'All' : t === 'hindustani' ? 'Hind.' : 'Carn.'}
              </button>
            ))}
          </div>

          {/* Raga picker */}
          <div className="flex-1 relative" ref={dropdownRef}>
            <div
              onClick={() => setDropdownOpen(v => !v)}
              className={[
                'flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-all',
                'bg-white/5 backdrop-blur-md',
                dropdownOpen
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-white/10 hover:border-white/20',
              ].join(' ')}
            >
              <span className="material-symbols-outlined !text-lg text-on-surface-variant/50">
                music_note
              </span>
              <span className={[
                'flex-1 font-label text-base',
                selectedRaga ? 'text-on-surface' : 'text-on-surface-variant/40',
              ].join(' ')}>
                {selectedRaga ? selectedRaga.name : 'Select a raga…'}
              </span>
              <span className={[
                'material-symbols-outlined !text-base text-on-surface-variant/40 transition-transform duration-200',
                dropdownOpen ? 'rotate-180' : '',
              ].join(' ')}>
                expand_more
              </span>
            </div>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute top-full mt-2 left-0 right-0 z-50 rounded-2xl border border-white/10 bg-surface-lowest/95 backdrop-blur-xl shadow-xl overflow-hidden">
                {/* Search input */}
                <div className="p-2 border-b border-white/5">
                  <input
                    autoFocus
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search ragas…"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 font-label text-sm text-on-surface placeholder:text-on-surface-variant/30 outline-none focus:border-primary/30"
                  />
                </div>

                {/* List */}
                <div className="max-h-64 overflow-y-auto">
                  {loading && (
                    <div className="px-4 py-6 text-center text-on-surface-variant/40 font-mono text-xs">
                      Loading ragas…
                    </div>
                  )}
                  {fetchError && (
                    <div className="px-4 py-6 text-center text-red-400 font-mono text-xs">
                      {fetchError}
                    </div>
                  )}
                  {!loading && filteredRagas.length === 0 && (
                    <div className="px-4 py-6 text-center text-on-surface-variant/30 font-mono text-xs">
                      No ragas found
                    </div>
                  )}
                  {filteredRagas.map(raga => (
                    <button
                      key={raga.id}
                      onClick={() => {
                        setSelectedRaga(raga)
                        setDropdownOpen(false)
                        setSearch('')
                      }}
                      className={[
                        'w-full flex items-center gap-3 px-4 py-3 text-left transition-all',
                        selectedRaga?.id === raga.id
                          ? 'bg-primary/15 text-primary'
                          : 'text-on-surface hover:bg-white/5',
                      ].join(' ')}
                    >
                      <span className="font-label text-sm flex-1">{raga.name}</span>
                      {raga.thaat && (
                        <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/30">
                          {raga.thaat}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Play mode toggle */}
          <div className="flex items-center rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-1.5 gap-1 shrink-0">
            {(['aroha', 'avaroha', 'free'] as PlayMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setPlayMode(mode)}
                className={[
                  'px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest transition-all',
                  playMode === mode
                    ? 'bg-primary text-on-primary shadow-glow'
                    : 'text-on-surface-variant/50 hover:text-on-surface',
                ].join(' ')}
              >
                {mode === 'aroha'   ? 'Aroha'   :
                 mode === 'avaroha' ? 'Avaroha' : 'Free'}
              </button>
            ))}
          </div>

          {/* Auto-advance toggle */}
          {playMode !== 'free' && (
            <button
              onClick={() => setAutoAdvance(v => !v)}
              title={autoAdvance ? 'Auto-advance ON — click to disable' : 'Auto-advance OFF — click to enable'}
              className={[
                'flex items-center gap-2 px-4 py-3 rounded-2xl border font-mono text-[10px] uppercase tracking-widest transition-all shrink-0',
                autoAdvance
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : 'bg-white/5 border-white/10 text-on-surface-variant/50 hover:border-white/20',
              ].join(' ')}
            >
              <span className="material-symbols-outlined !text-base leading-none">
                {autoAdvance ? 'autoplay' : 'play_disabled'}
              </span>
              Auto
            </button>
          )}

          <button
            onClick={() => setOrnamentMode(v => !v)}
            title={ornamentMode ? 'Meend ornament ON — click to disable' : 'Meend ornament OFF — click to enable'}
            className={[
              'flex items-center gap-2 px-4 py-3 rounded-2xl border font-mono text-[10px] uppercase tracking-widest transition-all shrink-0',
              ornamentMode
                ? 'bg-violet-500/20 border-violet-400/40 text-violet-300'
                : 'bg-white/5 border-white/10 text-on-surface-variant/50 hover:border-white/20',
            ].join(' ')}
          >
            <span className="material-symbols-outlined !text-base leading-none">
              {ornamentMode ? 'waves' : 'linear_scale'}
            </span>
            Meend
          </button>

          <button
            onClick={() => setShowTranscriber(v => !v)}
            title={showTranscriber ? 'Hide mic input' : 'Sing into mic — detect pitch'}
            className={[
              'flex items-center gap-2 px-4 py-3 rounded-2xl border font-mono text-[10px] uppercase tracking-widest transition-all shrink-0',
              showTranscriber
                ? 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                : 'bg-white/5 border-white/10 text-on-surface-variant/50 hover:border-white/20',
            ].join(' ')}
          >
            <span className="material-symbols-outlined !text-base leading-none">mic</span>
            Mic
          </button>
        </div>

        {/* Meend speed + andolan sub-controls */}
        {ornamentMode && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 shrink-0">Speed</span>
            <input
              type="range"
              min={0.2}
              max={1.5}
              step={0.1}
              value={meendDuration}
              onChange={e => setMeendDuration(parseFloat(e.target.value))}
              className="flex-1 accent-primary h-1"
            />
            <span className="font-mono text-[9px] text-primary/60 w-8 text-right shrink-0">{meendDuration.toFixed(1)}s</span>
            <button
              onClick={() => setAndolanMode(v => !v)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-[9px] uppercase tracking-widest transition-all shrink-0',
                andolanMode
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                  : 'bg-white/5 border-white/10 text-on-surface-variant/40 hover:border-white/20',
              ].join(' ')}
            >
              <span className="material-symbols-outlined !text-sm leading-none">waves</span>
              Andolan
            </button>
          </div>
        )}

        {/* Main area */}
        {!selectedRaga ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined !text-4xl text-on-surface-variant/20">
                music_note
              </span>
            </div>
            <p className="font-display text-2xl text-on-surface/30 font-light">Select a raga to begin</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/20">
              Practice awaits
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

            {/* Left: swara display + scale strip */}
            <div className="space-y-6">

              {/* Raga name heading */}
              <div className="flex items-baseline gap-4">
                <h2 className="font-display text-3xl md:text-4xl text-on-surface font-light">
                  {selectedRaga.name}
                </h2>
                {selectedRaga.tradition && (
                  <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/30">
                    {selectedRaga.tradition}
                  </span>
                )}
              </div>

              {/* Swara scale strip (full aroha/avaroha reference) */}
              <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-4">
                <div className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 mb-3">
                  {playMode === 'avaroha' ? 'Avaroha' : 'Aroha'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sequence.map((swara, i) => {
                    const name = displaySwara(swara)
                    const oct  = octaveLabel(swara)
                    const active = i === activeIdx
                    return (
                      <button
                        key={`strip-${i}`}
                        onClick={() => handleSwaraClick(i)}
                        className={[
                          'flex items-center gap-1 px-3 py-1.5 rounded-xl font-label text-sm transition-all',
                          isVarjya(swara) && !isVadi(swara) && !isSamvadi(swara)
                            ? 'opacity-25 cursor-not-allowed text-on-surface-variant/30 bg-white/3 border border-white/5'
                            : active
                              ? 'bg-primary/25 border border-primary/50 text-primary font-semibold'
                              : 'bg-white/5 border border-white/10 text-on-surface hover:border-primary/30 hover:bg-primary/10 cursor-pointer',
                        ].join(' ')}
                      >
                        {name}
                        {oct && <span className="text-[10px] text-on-surface-variant/40">{oct}</span>}
                        {isVadi(swara) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        )}
                        {isSamvadi(swara) && !isVadi(swara) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Large swara cards */}
              <div className={[
                'flex gap-4',
                showAsGrid
                  ? 'flex-wrap justify-start'
                  : 'flex-wrap justify-center',
              ].join(' ')}>
                {sequence.map((swara, i) => (
                  <SwaraCard
                    key={`card-${i}-${swara}`}
                    swara={swara}
                    isActive={i === activeIdx}
                    isVadi={isVadi(swara)}
                    isSamvadi={isSamvadi(swara)}
                    isVarjya={isVarjya(swara)}
                    onClick={() => handleSwaraClick(i)}
                  />
                ))}
              </div>

              {/* AI swara feedback */}
              {(feedbackLoading || swaraFeedback) && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-primary/8 border border-primary/15 animate-fade-in">
                  <span className="material-symbols-outlined !text-base text-primary/50 mt-0.5 shrink-0">auto_awesome</span>
                  {feedbackLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : (
                    <p className="font-sans text-sm text-on-surface-variant/80 font-light leading-relaxed">{swaraFeedback}</p>
                  )}
                </div>
              )}

              {/* Playback controls for sequential modes */}
              {playMode !== 'free' && (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      const prev = Math.max(0, activeIdx - 1)
                      handleSwaraClick(prev)
                    }}
                    disabled={activeIdx <= 0}
                    className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-on-surface-variant/50 hover:text-on-surface hover:border-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    title="Previous swara"
                  >
                    <span className="material-symbols-outlined !text-xl">skip_previous</span>
                  </button>

                  <button
                    onClick={() => {
                      const next = activeIdx < 0 ? 0 : Math.min(sequence.length - 1, activeIdx + 1)
                      handleSwaraClick(next)
                    }}
                    disabled={activeIdx >= sequence.length - 1}
                    className="flex-1 h-11 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center gap-2 text-primary hover:bg-primary/25 disabled:opacity-20 disabled:cursor-not-allowed transition-all font-mono text-[10px] uppercase tracking-widest"
                    title="Next swara"
                  >
                    <span className="material-symbols-outlined !text-xl">skip_next</span>
                    Next
                  </button>

                  <button
                    onClick={() => { setActiveIdx(-1); if (autoTimer.current) clearTimeout(autoTimer.current) }}
                    className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-on-surface-variant/50 hover:text-on-surface hover:border-white/20 transition-all"
                    title="Reset"
                  >
                    <span className="material-symbols-outlined !text-xl">restart_alt</span>
                  </button>
                </div>
              )}

              {/* Record / Playback bar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isPlayingBack}
                  title={isRecording ? 'Stop recording' : 'Record your swara sequence'}
                  className={[
                    'flex items-center gap-2 px-4 py-2.5 rounded-2xl border font-mono text-[10px] uppercase tracking-widest transition-all shrink-0 disabled:opacity-30',
                    isRecording
                      ? 'bg-red-500/20 border-red-400/40 text-red-300 animate-pulse'
                      : 'bg-white/5 border-white/10 text-on-surface-variant/50 hover:border-white/20',
                  ].join(' ')}
                >
                  <span className="material-symbols-outlined !text-base leading-none">
                    {isRecording ? 'stop_circle' : 'radio_button_checked'}
                  </span>
                  {isRecording ? `Rec · ${recordedSeq.length}` : 'Record'}
                </button>

                {recordedSeq.length > 0 && !isRecording && (
                  <>
                    <button
                      onClick={playbackRecording}
                      disabled={isPlayingBack}
                      title="Replay recorded sequence"
                      className={[
                        'flex items-center gap-2 px-4 py-2.5 rounded-2xl border font-mono text-[10px] uppercase tracking-widest transition-all shrink-0 disabled:opacity-50',
                        isPlayingBack
                          ? 'bg-primary/20 border-primary/40 text-primary'
                          : 'bg-white/5 border-white/10 text-on-surface-variant/50 hover:border-primary/30 hover:text-primary/80',
                      ].join(' ')}
                    >
                      <span className="material-symbols-outlined !text-base leading-none">
                        {isPlayingBack ? 'graphic_eq' : 'play_circle'}
                      </span>
                      {isPlayingBack ? 'Playing…' : `Play (${recordedSeq.length} notes)`}
                    </button>
                    <button
                      onClick={() => setRecordedSeq([])}
                      title="Clear recording"
                      className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 text-on-surface-variant/30 hover:text-red-400 hover:border-red-400/30 transition-all"
                    >
                      <span className="material-symbols-outlined !text-base">delete</span>
                    </button>
                  </>
                )}
              </div>

              {/* Audio not yet started notice */}
              {!audioReady && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-400/20 px-4 py-3 flex items-center gap-3">
                  <span className="material-symbols-outlined !text-base text-amber-400">info</span>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400/70">
                    Click any swara to activate audio
                  </p>
                </div>
              )}

              {showTranscriber && (
                <SwaraTranscriber
                  aroha={selectedRaga.aroha as string[] | undefined}
                  avaroha={selectedRaga.avaroha as string[] | undefined}
                  vadi={selectedRaga.vadi}
                  samvadi={selectedRaga.samvadi}
                  onSessionEnd={(stats) => setSessionStats(stats)}
                />
              )}

              {sessionStats && sessionStats.total > 0 && (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40">Session Summary</div>
                    <button
                      onClick={() => setSessionStats(null)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-on-surface-variant/30 hover:text-on-surface transition-all"
                    >
                      <span className="material-symbols-outlined !text-sm">close</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/20 p-3 text-center">
                      <div className="font-display text-3xl text-emerald-400">{sessionStats.correct}</div>
                      <div className="font-mono text-[8px] uppercase tracking-widest text-emerald-400/60 mt-1">Correct</div>
                    </div>
                    <div className="rounded-xl bg-orange-500/10 border border-orange-400/20 p-3 text-center">
                      <div className="font-display text-3xl text-orange-400">{sessionStats.wrongVariety}</div>
                      <div className="font-mono text-[8px] uppercase tracking-widest text-orange-400/60 mt-1">Wrong variety</div>
                    </div>
                    <div className="rounded-xl bg-red-500/10 border border-red-400/20 p-3 text-center">
                      <div className="font-display text-3xl text-red-400">{sessionStats.varjya}</div>
                      <div className="font-mono text-[8px] uppercase tracking-widest text-red-400/60 mt-1">Varjya</div>
                    </div>
                    <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 p-3 text-center">
                      <div className="font-display text-3xl text-amber-400">{sessionStats.vadiHits}</div>
                      <div className="font-mono text-[8px] uppercase tracking-widest text-amber-400/60 mt-1">Vadi hits</div>
                    </div>
                  </div>
                  {sessionStats.total > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all"
                          style={{ width: `${Math.round((sessionStats.correct / sessionStats.total) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[9px] text-on-surface-variant/50 shrink-0">
                        {Math.round((sessionStats.correct / sessionStats.total) * 100)}% accuracy
                      </span>
                    </div>
                  )}
                </div>
              )}

              {gamakaHistory.length > 0 && (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 mb-3">Recent</div>
                  <div className="flex flex-wrap gap-2">
                    {gamakaHistory.map((h, i) => (
                      <span
                        key={i}
                        className={[
                          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-label text-xs',
                          i === 0
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-white/10 bg-white/5 text-on-surface-variant/50',
                        ].join(' ')}
                      >
                        {h.swara}
                        {h.ornament !== 'plain' && (
                          <span className="font-mono text-[8px] text-on-surface-variant/30">
                            {h.ornament === 'meend' ? '~' : '≈'}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: grammar panel + notation editor + detector */}
            <div className="lg:sticky lg:top-24 self-start space-y-4">
              <GrammarPanel raga={selectedRaga} />
              <RagaDetector />
              {selectedRaga && (
                <NotationEditor
                  ragaName={selectedRaga.name}
                  allowedSwaras={new Set<string>([
                    ...(selectedRaga.aroha as string[] ?? []),
                    ...(selectedRaga.avaroha as string[] ?? []),
                  ].map(n => n.replace(/[\^'.]/g, '').trim()))}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
