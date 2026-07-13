'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { audioEngine } from '@/lib/audio'
import { NOTES_IN_OCTAVE, swaraToFrequency, normalizeSwara } from '@/lib/musicalMath'
import { getSwaraType, swaraAccent } from '@/lib/swaraUtils'
import { useComposition, type InstrumentType, type TraditionType } from '@/context/CompositionContext'

interface PianoProps {
  activeRagaNotes: string[]
  onNoteClick?: (note: string, freq: number) => void
  layout: 'Piano' | 'Harmonium' | 'Swara'
  externalActiveNote?: string
  vadiNote?: string
  samvadiNote?: string
  varjyaNotes?: string[]
  nyasaNotes?: string[]
}

// ── Keyboard mapping ──────────────────────────────────────────────────────────
const KEY_MAP: Record<string, { offset: number; octave: number; label: string }> = {
  a: { offset: 0,  octave: 4, label: 'Sa'  },
  w: { offset: 1,  octave: 4, label: 're'  },
  s: { offset: 2,  octave: 4, label: 'Re'  },
  e: { offset: 3,  octave: 4, label: 'ga'  },
  d: { offset: 4,  octave: 4, label: 'Ga'  },
  f: { offset: 5,  octave: 4, label: 'Ma'  },
  t: { offset: 6,  octave: 4, label: 'ma'  },
  g: { offset: 7,  octave: 4, label: 'Pa'  },
  y: { offset: 8,  octave: 4, label: 'dha' },
  h: { offset: 9,  octave: 4, label: 'Dha' },
  u: { offset: 10, octave: 4, label: 'ni'  },
  j: { offset: 11, octave: 4, label: 'Ni'  },
  k: { offset: 0,  octave: 5, label: 'Sa'  },
  o: { offset: 1,  octave: 5, label: 're'  },
  l: { offset: 2,  octave: 5, label: 'Re'  },
  p: { offset: 3,  octave: 5, label: 'ga'  },
  ';': { offset: 4, octave: 5, label: 'Ga' },
  "'": { offset: 5, octave: 5, label: 'Ma' },
  '[': { offset: 6, octave: 5, label: 'ma' },
  ']': { offset: 7, octave: 5, label: 'Pa' },
}

const NOTE_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_MAP).map(([k, v]) => [`${v.offset}-${v.octave}`, k.toUpperCase()])
)

// ── Instrument catalogue ──────────────────────────────────────────────────────
const INSTRUMENT_GROUPS: {
  tradition: TraditionType | 'western'
  label: string
  instruments: { value: InstrumentType; label: string }[]
}[] = [
  { tradition: 'western',    label: '— Western —',    instruments: [{ value: 'piano',     label: 'Piano'     }] },
  { tradition: 'carnatic',   label: '— Carnatic —',   instruments: [
    { value: 'veena',   label: 'Veena'   },
    { value: 'bansuri', label: 'Bansuri' },
    { value: 'tambura', label: 'Tambura' },
  ]},
  { tradition: 'hindustani', label: '— Hindustani —', instruments: [
    { value: 'harmonium', label: 'Harmonium' },
    { value: 'sarangi',   label: 'Sarangi'   },
    { value: 'sitar',     label: 'Sitar'     },
  ]},
]

// ── KR-10: Ripple canvas helpers ──────────────────────────────────────────────
const WHITE_KEY_OFFSETS = [0, 2, 4, 5, 7, 9, 11]

function getKeyCanvasPos(offset: number, octave: number): { x: number; y: number } {
  const W = 64
  const octaveX = (octave - 4) * 448
  const isBlack = !WHITE_KEY_OFFSETS.includes(offset)
  if (!isBlack) {
    const wi = WHITE_KEY_OFFSETS.indexOf(offset)
    return { x: octaveX + wi * W + W / 2, y: 200 }
  }
  const whites = WHITE_KEY_OFFSETS.filter(o => o < offset).length
  return { x: octaveX + whites * W, y: 100 }
}

interface Ripple { x: number; y: number; r: number; maxR: number; alpha: number; born: number }

export default function Piano({
  activeRagaNotes,
  onNoteClick,
  layout,
  externalActiveNote,
  vadiNote,
  samvadiNote,
  varjyaNotes = [],
  nyasaNotes = [],
}: PianoProps) {
  const [playingNote, setPlayingNote]   = useState<string | null>(null)
  const [heldNotes, setHeldNotes]       = useState<Set<string>>(new Set())
  const [isScaleLocked, setIsScaleLocked] = useState(true)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [droneOn, setDroneOn]           = useState(false)

  // ── KR gesture refs ──────────────────────────────────────────────────────────
  const isDraggingRef    = useRef(false)
  const dragFromFreq     = useRef<number | null>(null)
  const dragFromNoteId   = useRef<string | null>(null)
  const hoverEnterTimes  = useRef<Map<string, number>>(new Map())
  const longPressTimers  = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // KR-10: ripple canvas
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const ripplesRef  = useRef<Ripple[]>([])
  const rafRef      = useRef<number>(0)

  const dropdownRef    = useRef<HTMLDivElement>(null)
  const { state: comp, dispatch } = useComposition()
  const { activeInstrument, activeTradition } = comp

  const normalizedActiveNotes = React.useMemo(
    () => activeRagaNotes.map(n => normalizeSwara(n)),
    [activeRagaNotes],
  )

  const vadiNorm    = React.useMemo(() => vadiNote    ? normalizeSwara(vadiNote)    : null, [vadiNote])
  const samvadiNorm = React.useMemo(() => samvadiNote ? normalizeSwara(samvadiNote) : null, [samvadiNote])
  const varjyaSet   = React.useMemo(() => new Set(varjyaNotes.map(n => normalizeSwara(n))), [varjyaNotes])
  const nyasaSet    = React.useMemo(() => new Set(nyasaNotes.map(n => normalizeSwara(n))),  [nyasaNotes])

  const rootFreq = 261.63

  const getFrequency = (offset: number, octave: number) =>
    rootFreq * Math.pow(2, octave - 4) * Math.pow(2, offset / 12)

  const onNoteClickRef = useRef(onNoteClick)
  onNoteClickRef.current = onNoteClick

  const heldNotesRef = useRef(heldNotes)
  useEffect(() => { heldNotesRef.current = heldNotes }, [heldNotes])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── KR-10: Ripple canvas animation loop ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const now = performance.now()
      ripplesRef.current = ripplesRef.current.filter(r => r.alpha > 0.01)
      for (const r of ripplesRef.current) {
        const age = Math.min(1, (now - r.born) / 750)
        r.r = r.maxR * Math.pow(age, 0.55)
        r.alpha = 0.45 * (1 - age * age)
        ctx.beginPath()
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(167, 139, 250, ${r.alpha})`
        ctx.lineWidth = 2.5
        ctx.stroke()
        // Inner ring
        ctx.beginPath()
        ctx.arc(r.x, r.y, r.r * 0.5, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(167, 139, 250, ${r.alpha * 0.4})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // ── KR-10: add a ripple at a given canvas position ───────────────────────────
  const addRipple = useCallback((x: number, y: number) => {
    ripplesRef.current.push({ x, y, r: 0, maxR: 68, alpha: 0.45, born: performance.now() })
  }, [])

  // ── KR-01: velocity from hover-to-press latency ──────────────────────────────
  const calcVelocity = useCallback((noteId: string): number => {
    const t = hoverEnterTimes.current.get(noteId)
    if (!t) return 0.75
    const dt = Date.now() - t
    // Fast press (<80ms) → 0.95, slow press (>600ms) → 0.45
    return Math.max(0.45, Math.min(0.95, 0.95 - (dt / 700) * 0.5))
  }, [])

  // ── Global pointer-up: release all held notes + clear drag state ──────────────
  useEffect(() => {
    const handleGlobalRelease = () => {
      isDraggingRef.current = false
      dragFromFreq.current  = null
      dragFromNoteId.current = null
      longPressTimers.current.forEach(t => clearTimeout(t))
      longPressTimers.current.clear()
      if (heldNotesRef.current.size > 0) {
        audioEngine?.releaseAll()
        setHeldNotes(new Set())
      }
    }
    window.addEventListener('mouseup',  handleGlobalRelease)
    window.addEventListener('touchend', handleGlobalRelease)
    return () => {
      window.removeEventListener('mouseup',  handleGlobalRelease)
      window.removeEventListener('touchend', handleGlobalRelease)
    }
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  // KR-01/03/06: main attack handler
  const handleAttack = useCallback((noteId: string, freq: number, label: string, velocity?: number) => {
    const v = velocity ?? calcVelocity(noteId)

    isDraggingRef.current  = true
    dragFromFreq.current   = freq
    dragFromNoteId.current = noteId

    setPlayingNote(noteId)
    setHeldNotes(prev => new Set(prev).add(noteId))
    audioEngine?.attackSwara(freq, v)
    onNoteClickRef.current?.(label, freq)

    // KR-03: sympathetic resonance for sitar / veena
    if (activeInstrument === 'sitar' || activeInstrument === 'veena') {
      ;(audioEngine as any)?.playSympatheticResonance?.(freq)
    }

    // KR-06: long press (650ms) → gamak (whole-step oscillation)
    const timer = setTimeout(() => {
      if (isDraggingRef.current && dragFromNoteId.current === noteId) {
        audioEngine?.releaseAll()
        audioEngine?.playGamak(freq, freq * Math.pow(2, 2 / 12), 8, 0.07)
        isDraggingRef.current = false
        setHeldNotes(new Set())
        setTimeout(() => setPlayingNote(null), 750)
      }
    }, 650)
    longPressTimers.current.set(noteId, timer)
  }, [calcVelocity, activeInstrument])

  const handleRelease = useCallback((noteId: string, freq: number) => {
    // Clear long-press gamak timer
    const timer = longPressTimers.current.get(noteId)
    if (timer) { clearTimeout(timer); longPressTimers.current.delete(noteId) }

    isDraggingRef.current = false
    setHeldNotes(prev => { const next = new Set(prev); next.delete(noteId); return next })
    if (playingNote === noteId) setPlayingNote(null)
    audioEngine?.releaseSwara(freq)
  }, [playingNote])

  // KR-07: edge-click kan grace note
  const handleKanAttack = useCallback((noteId: string, freq: number, label: string, kanFreq: number, dir: 'up' | 'down') => {
    isDraggingRef.current  = true
    dragFromFreq.current   = freq
    dragFromNoteId.current = noteId
    setPlayingNote(noteId)
    setHeldNotes(prev => new Set(prev).add(noteId))
    audioEngine?.playKan(freq, kanFreq, dir)
    onNoteClickRef.current?.(label, freq)
  }, [])

  // KR-05: drag-slide between keys → meend
  const handleDragEnter = useCallback((noteId: string, freq: number, label: string) => {
    if (!isDraggingRef.current || !dragFromFreq.current || dragFromNoteId.current === noteId) return
    const fromFreq = dragFromFreq.current

    // Cancel pending gamak timer for old note
    longPressTimers.current.forEach(t => clearTimeout(t))
    longPressTimers.current.clear()

    // Play meend from previous note → this note
    audioEngine?.releaseAll()
    audioEngine?.playMeend(fromFreq, freq, 0.38, 'exponential')

    dragFromFreq.current   = freq
    dragFromNoteId.current = noteId
    setHeldNotes(new Set([noteId]))
    setPlayingNote(noteId)
    onNoteClickRef.current?.(label, freq)
  }, [])

  const handlePlay = useCallback((noteId: string, freq: number, label: string, velocity = 0.75) => {
    setPlayingNote(noteId)
    audioEngine?.playSwara(freq, '4n', undefined, velocity)
    onNoteClickRef.current?.(label, freq)
    setTimeout(() => setPlayingNote(null), 500)
  }, [])

  // Instrument switching
  const handleInstrumentChange = async (value: string) => {
    const [inst, trad] = value.split(':') as [InstrumentType, TraditionType]
    dispatch({ type: 'SET_INSTRUMENT', value: inst })
    dispatch({ type: 'SET_TRADITION',  value: trad })
    if (audioEngine) await audioEngine.setTimbre(inst, trad)
  }

  const octaves = [4, 5]

  // Keyboard shortcut handler
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return
      const mapping = KEY_MAP[e.key.toLowerCase()]
      if (mapping) {
        const canonical = normalizeSwara(mapping.label)
        if (
          normalizedActiveNotes.length > 0 &&
          isScaleLocked &&
          !normalizedActiveNotes.includes(canonical)
        ) return
        handlePlay(
          `${mapping.label}${mapping.octave}`,
          getFrequency(mapping.offset, mapping.octave),
          mapping.label,
        )
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [normalizedActiveNotes, isScaleLocked, handlePlay])

  // ── Swara board layout ────────────────────────────────────────────────────────
  if (layout === 'Swara') {
    const swaras =
      normalizedActiveNotes.length > 0
        ? normalizedActiveNotes
        : ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni']
    return (
      <div className="flex gap-4 h-64 w-full overflow-x-auto pb-6 scroll-thin">
        {swaras.map((note, i) => {
          const isNotePlaying = playingNote === note || externalActiveNote === note
          return (
            <button
              key={i}
              onClick={() =>
                handlePlay(
                  note,
                  getFrequency(NOTES_IN_OCTAVE.find(n => n.name === note)?.offset || 0, 4),
                  note,
                )
              }
              className={`flex-1 min-w-[140px] rounded-[32px] border transition-all flex flex-col items-center justify-center gap-6 ${
                isNotePlaying
                  ? 'bg-primary border-primary shadow-glow scale-95 brightness-125'
                  : 'bg-surface-container-high border-outline-variant/20 hover:border-primary/40'
              }`}
            >
              <span className={`font-display text-5xl font-light ${isNotePlaying ? 'text-white' : 'text-on-surface'}`}>
                {note}
              </span>
              <div className={`w-2 h-2 rounded-full ${isNotePlaying ? 'bg-white animate-pulse' : 'bg-primary/60'}`} />
            </button>
          )
        })}
      </div>
    )
  }

  // ── Piano / Harmonium layout ──────────────────────────────────────────────────
  return (
    <div className="w-full bg-black/60 rounded-[28px] md:rounded-[48px] border border-white/10 p-4 md:p-8 lg:p-12 flex flex-col items-center justify-start gap-6 md:gap-10 overflow-hidden shadow-[0_0_100px_rgba(var(--primary-rgb),0.05)] backdrop-blur-3xl">

      {/* ── DAW HUD ── */}
      <div className="flex flex-wrap justify-center items-center gap-3 md:gap-6 px-4 md:px-10 py-2.5 md:py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-2xl shadow-xl z-50">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${normalizedActiveNotes.length > 0 ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)] animate-pulse' : 'bg-white/10'}`} />
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">
            {layout} Engine
          </span>
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Instrument selector */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setIsDropdownOpen(o => !o)}
            className="flex items-center gap-2 bg-white/5 border border-white/10 text-white/60 font-mono text-[9px] uppercase tracking-widest rounded-full px-4 py-1.5 outline-none hover:border-primary/40 transition-all cursor-pointer"
          >
            {INSTRUMENT_GROUPS.flatMap(g => g.instruments).find(i => i.value === activeInstrument)?.label ?? activeInstrument}
            <svg className="w-2.5 h-2.5 opacity-50" fill="none" viewBox="0 0 10 6">
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full mt-1 right-0 z-50 min-w-[140px] bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1">
              {INSTRUMENT_GROUPS.map(group => (
                <div key={group.tradition}>
                  <div className="px-3 py-1.5 font-mono text-[8px] uppercase tracking-widest text-white/25 border-b border-white/5">
                    {group.label.replace(/^— | —$/g, '')}
                  </div>
                  {group.instruments.map(inst => {
                    const val = `${inst.value}:${group.tradition === 'western' ? activeTradition : group.tradition}`
                    const isActive = inst.value === activeInstrument
                    return (
                      <button
                        key={inst.value}
                        onClick={() => { handleInstrumentChange(val); setIsDropdownOpen(false) }}
                        className={`w-full text-left px-3 py-2 font-mono text-[9px] uppercase tracking-widest transition-colors ${
                          isActive ? 'text-primary bg-primary/10' : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {inst.label}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Scale lock */}
        <button
          onClick={() => setIsScaleLocked(!isScaleLocked)}
          disabled={normalizedActiveNotes.length === 0}
          className={`flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.15em] px-5 py-2 rounded-full transition-all border ${
            isScaleLocked && normalizedActiveNotes.length > 0
              ? 'bg-primary/20 text-primary border-primary/30 shadow-glow'
              : 'bg-white/5 text-white/30 border-white/10 hover:text-white/60'
          }`}
        >
          {isScaleLocked && normalizedActiveNotes.length > 0 ? 'Scale Locked' : 'Omni Mode'}
        </button>

        <div className="w-px h-4 bg-white/10" />

        {/* KR-04: Drone toggle */}
        <button
          onClick={() => {
            const next = !droneOn
            setDroneOn(next)
            audioEngine?.toggleDrone(next, 'Sa-Pa')
          }}
          title={droneOn ? 'Disable tanpura drone' : 'Enable tanpura drone (Sa-Pa)'}
          className={`flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.15em] px-4 py-2 rounded-full transition-all border ${
            droneOn
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-[0_0_10px_rgba(251,191,36,0.15)]'
              : 'bg-white/5 text-white/30 border-white/10 hover:text-amber-300/60'
          }`}
        >
          <span className="material-symbols-outlined !text-xs">music_note</span>
          Drone
        </button>
      </div>

      {/* ── Keyboard — scrollable on narrow screens ── */}
      <div className="w-full overflow-x-auto pb-4 pt-2 scroll-thin">
        <div
          className="relative flex p-2 bg-[#050505] rounded-[32px] border border-white/5 shadow-2xl mx-auto flex-shrink-0"
          style={{ width: '896px', minWidth: '896px' }}
        >
          {/* KR-10: Ripple canvas overlay */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-[60] rounded-[30px]"
            width={896}
            height={320}
          />

          {octaves.map(octave => (
            <div key={octave} className="relative flex w-[448px] h-80 shrink-0">
              {/* White Keys */}
              <div className="flex w-full h-full">
                {NOTES_IN_OCTAVE.filter(n => !n.isBlack).map((note, idx, filteredArr) => {
                  const freq          = getFrequency(note.offset, octave)
                  const canonical     = normalizeSwara(note.name)
                  const isInRaga      = normalizedActiveNotes.length === 0 || normalizedActiveNotes.includes(canonical)
                  const noteId        = `${note.name}${octave}`
                  const isHeld        = heldNotes.has(noteId)
                  const isNotePlaying = isHeld || playingNote === noteId || externalActiveNote === noteId
                  const isLockedOut   = isScaleLocked && normalizedActiveNotes.length > 0 && !isInRaga
                  const isVadi        = vadiNorm !== null && canonical === vadiNorm
                  const isSamvadi     = samvadiNorm !== null && canonical === samvadiNorm
                  const isVarjya      = varjyaSet.has(canonical)
                  const isNyasa       = nyasaSet.has(canonical)
                  const isAbsoluteFirst = octave === octaves[0] && idx === 0
                  const isAbsoluteLast  = octave === octaves[octaves.length - 1] && idx === filteredArr.length - 1

                  return (
                    <button
                      key={idx}
                      onMouseEnter={() => {
                        hoverEnterTimes.current.set(noteId, Date.now())
                        handleDragEnter(noteId, freq, note.name)
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        if (isLockedOut) return
                        // KR-07: edge click → kan grace note
                        const rect = e.currentTarget.getBoundingClientRect()
                        const relX = (e.clientX - rect.left) / rect.width
                        if (relX < 0.18) {
                          handleKanAttack(noteId, freq, note.name, freq * Math.pow(2, -2 / 12), 'down')
                        } else if (relX > 0.82) {
                          handleKanAttack(noteId, freq, note.name, freq * Math.pow(2, 2 / 12), 'up')
                        } else {
                          handleAttack(noteId, freq, note.name)
                        }
                        // KR-10: ripple at key position
                        const pos = getKeyCanvasPos(note.offset, octave)
                        addRipple(pos.x, pos.y)
                      }}
                      onMouseUp={() => handleRelease(noteId, freq)}
                      onMouseLeave={() => handleRelease(noteId, freq)}
                      onTouchStart={(e) => {
                        e.preventDefault()
                        if (isLockedOut) return
                        const touch = e.touches[0]
                        const rect = e.currentTarget.getBoundingClientRect()
                        const relX = (touch.clientX - rect.left) / rect.width
                        const force = (touch as any).force > 0 ? Math.max(0.45, Math.min(0.95, (touch as any).force)) : undefined
                        if (relX < 0.18) {
                          handleKanAttack(noteId, freq, note.name, freq * Math.pow(2, -2 / 12), 'down')
                        } else if (relX > 0.82) {
                          handleKanAttack(noteId, freq, note.name, freq * Math.pow(2, 2 / 12), 'up')
                        } else {
                          handleAttack(noteId, freq, note.name, force)
                        }
                        const pos = getKeyCanvasPos(note.offset, octave)
                        addRipple(pos.x, pos.y)
                      }}
                      onTouchEnd={() => handleRelease(noteId, freq)}
                      disabled={isLockedOut}
                      className={`group relative flex-1 h-80 border-r border-black/10 transition-all duration-150 origin-top
                        ${isAbsoluteFirst ? 'rounded-l-2xl' : ''}
                        ${isAbsoluteLast  ? 'rounded-r-2xl'  : ''}
                        ${isNotePlaying
                          ? 'bg-primary brightness-125 translate-y-3 z-30 shadow-[0_20px_40px_rgba(var(--primary-rgb),0.5)]'
                          : isLockedOut
                            ? 'bg-[#f5f0e4] cursor-not-allowed opacity-90'
                            : isVarjya
                              ? 'bg-[#ede8dc] opacity-50 cursor-not-allowed'
                              : isVadi
                                ? 'bg-[#fff3e0] hover:bg-[#ffe8c8] active:translate-y-2'
                                : isSamvadi
                                  ? 'bg-[#eef4ff] hover:bg-[#d8e8ff] active:translate-y-2'
                                  : 'bg-[#f5f0e4] hover:bg-[#ede8dc] active:translate-y-2 active:bg-[#e4ddd0]'
                        }`}
                    >
                      {/* Vadi glow bar */}
                      {isVadi && !isNotePlaying && (
                        <div className="absolute top-0 inset-x-0 h-1.5 rounded-t-sm bg-gradient-to-r from-amber-400 to-orange-400 opacity-80" />
                      )}
                      {/* Samvadi bar */}
                      {isSamvadi && !isNotePlaying && (
                        <div className="absolute top-0 inset-x-0 h-1.5 rounded-t-sm bg-gradient-to-r from-sky-400 to-blue-400 opacity-60" />
                      )}
                      {/* Raga dot */}
                      <div className={`absolute top-4 left-1/2 -translate-x-1/2 rounded-full transition-all
                        ${isVadi    ? 'w-2 h-2 bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                        : isSamvadi ? 'w-1.5 h-1.5 bg-sky-400 opacity-80'
                        : isNyasa   ? 'w-1 h-1 bg-primary/40'
                        : isInRaga && !isLockedOut ? 'w-1 h-1 bg-primary/20'
                        : 'w-0 h-0 opacity-0'}`}
                      />
                      <span className={`absolute bottom-6 left-1/2 -translate-x-1/2 font-display text-[9px] tracking-[0.2em] font-bold transition-all ${
                        isNotePlaying ? 'text-white scale-110'
                        : isVadi    ? 'text-amber-600'
                        : isSamvadi ? 'text-sky-600'
                        : 'text-black/20'
                      }`}>
                        {note.name}
                      </span>
                      {NOTE_TO_KEY[`${note.offset}-${octave}`] && (
                        <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[8px] font-bold transition-all ${
                          isNotePlaying ? 'text-white/80' : 'text-black/25'
                        }`}>
                          {NOTE_TO_KEY[`${note.offset}-${octave}`]}
                        </span>
                      )}
                      <div className="absolute inset-x-0 top-0 h-1 bg-white/40 opacity-0 group-hover:opacity-10" />
                    </button>
                  )
                })}
              </div>

              {/* Black Keys */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-40">
                {NOTES_IN_OCTAVE.map((note, idx) => {
                  if (!note.isBlack) return null
                  const freq          = getFrequency(note.offset, octave)
                  const canonical     = normalizeSwara(note.name)
                  const isInRaga      = normalizedActiveNotes.length === 0 || normalizedActiveNotes.includes(canonical)
                  const noteId        = `${note.name}${octave}`
                  const isHeld        = heldNotes.has(noteId)
                  const isNotePlaying = isHeld || playingNote === noteId || externalActiveNote === noteId
                  const isLockedOut   = isScaleLocked && normalizedActiveNotes.length > 0 && !isInRaga
                  const isVadi        = vadiNorm !== null && canonical === vadiNorm
                  const isSamvadi     = samvadiNorm !== null && canonical === samvadiNorm
                  const isVarjya      = varjyaSet.has(canonical)
                  const whiteKeysBefore = NOTES_IN_OCTAVE.slice(0, idx).filter(n => !n.isBlack).length

                  return (
                    <button
                      key={idx}
                      disabled={isLockedOut}
                      onMouseEnter={() => {
                        hoverEnterTimes.current.set(noteId, Date.now())
                        handleDragEnter(noteId, freq, note.name)
                      }}
                      onMouseDown={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (isLockedOut) return
                        handleAttack(noteId, freq, note.name)
                        const pos = getKeyCanvasPos(note.offset, octave)
                        addRipple(pos.x, pos.y)
                      }}
                      onMouseUp={() => handleRelease(noteId, freq)}
                      onMouseLeave={() => handleRelease(noteId, freq)}
                      onTouchStart={e => {
                        e.preventDefault()
                        if (isLockedOut) return
                        const touch = e.touches[0]
                        const force = (touch as any).force > 0 ? Math.max(0.45, Math.min(0.95, (touch as any).force)) : undefined
                        handleAttack(noteId, freq, note.name, force)
                        const pos = getKeyCanvasPos(note.offset, octave)
                        addRipple(pos.x, pos.y)
                      }}
                      onTouchEnd={() => handleRelease(noteId, freq)}
                      className={`absolute top-0 w-[42px] h-48 -translate-x-1/2 rounded-b-xl border-x border-b transition-all duration-150 pointer-events-auto ${
                        isNotePlaying
                          ? 'bg-primary border-primary/50 translate-y-2 brightness-150 z-50 shadow-[0_15px_30px_rgba(var(--primary-rgb),0.5)]'
                          : isLockedOut || isVarjya
                            ? 'bg-[#111] border-white/5 cursor-not-allowed opacity-40'
                            : isVadi
                              ? 'bg-[#3d2800] border-amber-800/40 hover:bg-[#4d3400] shadow-2xl'
                              : isSamvadi
                                ? 'bg-[#001828] border-sky-800/40 hover:bg-[#002236] shadow-2xl'
                                : 'bg-[#1a1a1c] border-white/5 hover:bg-[#252528] active:translate-y-1 active:bg-[#111] shadow-2xl'
                      }`}
                      style={{ left: `${whiteKeysBefore * 64}px` }}
                    >
                      {isVadi && !isNotePlaying && (
                        <div className="absolute top-0 inset-x-0 h-1 rounded-t bg-amber-400 opacity-70" />
                      )}
                      {isSamvadi && !isNotePlaying && (
                        <div className="absolute top-0 inset-x-0 h-1 rounded-t bg-sky-400 opacity-50" />
                      )}
                      {isInRaga && normalizedActiveNotes.length > 0 && (
                        <span className={`absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[7px] font-bold tracking-tighter text-center leading-tight ${
                          isNotePlaying ? 'text-white' : isVadi ? 'text-amber-400' : isSamvadi ? 'text-sky-400' : getSwaraType(note.name) === 'tivra' ? 'text-amber-300' : 'text-blue-300'
                        }`}>
                          <span>{note.label}</span>
                          <span className="block text-[6px] opacity-70">{swaraAccent(note.name)}</span>
                        </span>
                      )}
                      {NOTE_TO_KEY[`${note.offset}-${octave}`] && (
                        <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[8px] font-bold transition-all ${
                          isNotePlaying ? 'text-white/80' : 'text-white/30'
                        }`}>
                          {NOTE_TO_KEY[`${note.offset}-${octave}`]}
                        </span>
                      )}
                      <div className="absolute inset-x-1.5 top-0 h-1 bg-white/[0.05] rounded-full" />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer metadata */}
      <div className="flex gap-12 font-mono text-[8px] uppercase tracking-[0.2em] text-white/20">
        <span>2 Octave Spectrum</span>
        <div className="w-px h-2.5 bg-white/10" />
        <span>Hold: Gamak · Drag: Meend · Edge: Kan</span>
        <div className="w-px h-2.5 bg-white/10" />
        <span>Low Latency Engine</span>
      </div>
    </div>
  )
}
