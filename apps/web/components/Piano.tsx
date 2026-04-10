'use client'

import React, { useState, useRef, useEffect } from 'react'
import { audioEngine } from '@/lib/audio'
import { NOTES_IN_OCTAVE, swaraToFrequency, normalizeSwara } from '@/lib/musicalMath'
import { useComposition, type InstrumentType, type TraditionType } from '@/context/CompositionContext'

interface PianoProps {
  activeRagaNotes: string[]
  onNoteClick?: (note: string, freq: number) => void
  layout: 'Piano' | 'Harmonium' | 'Swara'
  externalActiveNote?: string
  /** vadi swara name (most important note — glows) */
  vadiNote?: string
  /** samvadi swara name (consonant partner — secondary highlight) */
  samvadiNote?: string
  /** varjya swaras (forbidden in this raga — shown dimmed) */
  varjyaNotes?: string[]
  /** nyasa swaras (valid resting points — subtle marker) */
  nyasaNotes?: string[]
}

// ── Instrument catalogue ──────────────────────────────────────────────────────
const INSTRUMENT_GROUPS: {
  tradition: TraditionType | 'western'
  label: string
  instruments: { value: InstrumentType; label: string }[]
}[] = [
  {
    tradition: 'western',
    label: '— Western —',
    instruments: [
      { value: 'piano', label: 'Piano' },
    ],
  },
  {
    tradition: 'carnatic',
    label: '— Carnatic —',
    instruments: [
      { value: 'veena',   label: 'Veena' },
      { value: 'bansuri', label: 'Bansuri' },
      { value: 'tambura', label: 'Tambura' },
    ],
  },
  {
    tradition: 'hindustani',
    label: '— Hindustani —',
    instruments: [
      { value: 'harmonium', label: 'Harmonium' },
      { value: 'sarangi',   label: 'Sarangi' },
      { value: 'sitar',     label: 'Sitar' },
    ],
  },
]

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
  const [playingNote, setPlayingNote] = useState<string | null>(null)
  const [heldNotes, setHeldNotes] = useState<Set<string>>(new Set())
  const [isScaleLocked, setIsScaleLocked] = useState(true)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { state: comp, dispatch } = useComposition()
  const { activeInstrument, activeTradition } = comp

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const normalizedActiveNotes = React.useMemo(
    () => activeRagaNotes.map(n => normalizeSwara(n)),
    [activeRagaNotes],
  )

  // ── Raga grammar sets (normalized for key lookup) ─────────────────────────
  const vadiNorm    = React.useMemo(() => vadiNote    ? normalizeSwara(vadiNote)    : null,          [vadiNote])
  const samvadiNorm = React.useMemo(() => samvadiNote ? normalizeSwara(samvadiNote) : null,          [samvadiNote])
  const varjyaSet   = React.useMemo(() => new Set(varjyaNotes.map(n => normalizeSwara(n))),          [varjyaNotes])
  const nyasaSet    = React.useMemo(() => new Set(nyasaNotes.map(n => normalizeSwara(n))),           [nyasaNotes])

  const rootFreq = 261.63 // C4

  const getFrequency = (offset: number, octave: number) =>
    rootFreq * Math.pow(2, octave - 4) * Math.pow(2, offset / 12)

  const isAllowed = (rawName: string) => {
    const canonical = normalizeSwara(rawName)
    if (normalizedActiveNotes.length === 0) return true
    if (isScaleLocked && !normalizedActiveNotes.includes(canonical)) return false
    return true
  }

  // Attack (mousedown/touchstart) — sustain until release
  const handleAttack = (noteName: string, freq: number, rawName: string) => {
    if (!isAllowed(rawName)) return
    audioEngine?.attackSwara(freq, 0.8)
    setHeldNotes(prev => new Set(prev).add(noteName))
    onNoteClick?.(noteName, freq)
  }

  // Release (mouseup/mouseleave/touchend)
  const handleRelease = (noteName: string, freq: number) => {
    audioEngine?.releaseSwara(freq)
    setHeldNotes(prev => { const s = new Set(prev); s.delete(noteName); return s })
  }

  // Legacy click-style play (Swara board + keyboard shortcuts)
  const handlePlay = (noteName: string, freq: number, rawName: string) => {
    if (!isAllowed(rawName)) return
    if (audioEngine) {
      audioEngine.playSwara(freq)
      setPlayingNote(noteName)
      setTimeout(() => setPlayingNote(null), 250)
    }
    onNoteClick?.(noteName, freq)
  }

  // ── Instrument switching ──────────────────────────────────────────────────
  const handleInstrumentChange = (value: string) => {
    // value is "instrument:tradition"
    const [inst, trad] = value.split(':') as [InstrumentType, TraditionType]
    dispatch({ type: 'SET_INSTRUMENT', value: inst })
    dispatch({ type: 'SET_TRADITION',  value: trad })
    audioEngine?.setTimbre(inst, trad)
  }

  const octaves = [4, 5]

  const KEY_MAP: Record<string, { offset: number; octave: number; label: string }> = {
    a: { offset: 0, octave: 4, label: 'Sa' },
    w: { offset: 1, octave: 4, label: 're' },
    s: { offset: 2, octave: 4, label: 'Re' },
    e: { offset: 3, octave: 4, label: 'ga' },
    d: { offset: 4, octave: 4, label: 'Ga' },
    f: { offset: 5, octave: 4, label: 'Ma' },
    t: { offset: 6, octave: 4, label: 'ma' },
    g: { offset: 7, octave: 4, label: 'Pa' },
    y: { offset: 8, octave: 4, label: 'dha' },
    h: { offset: 9, octave: 4, label: 'Dha' },
    u: { offset: 10, octave: 4, label: 'ni' },
    j: { offset: 11, octave: 4, label: 'Ni' },
    k: { offset: 0, octave: 5, label: 'Sa' },
  }

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [normalizedActiveNotes, isScaleLocked])

  // ── Swara board layout ────────────────────────────────────────────────────
  if (layout === 'Swara') {
    const swaras =
      normalizedActiveNotes.length > 0
        ? normalizedActiveNotes
        : ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni']
    return (
      <div className="flex gap-4 h-64 w-full overflow-x-auto pb-6 scroll-thin">
        {swaras.map((note, i) => {
          const isPlaying = playingNote === note || externalActiveNote === note
          return (
            <button
              key={i}
              onClick={() =>
                handlePlay(
                  note,
                  getFrequency(
                    NOTES_IN_OCTAVE.find(n => n.name === note)?.offset || 0,
                    4,
                  ),
                  note,
                )
              }
              className={`flex-1 min-w-[140px] rounded-[32px] border transition-all flex flex-col items-center justify-center gap-6 ${
                isPlaying
                  ? 'bg-primary border-primary shadow-glow scale-95 brightness-125'
                  : 'bg-surface-container-high border-outline-variant/20 hover:border-primary/40'
              }`}
            >
              <span
                className={`font-display text-5xl font-light ${isPlaying ? 'text-white' : 'text-on-surface'}`}
              >
                {note}
              </span>
              <div
                className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-white animate-pulse' : 'bg-primary/60'}`}
              />
            </button>
          )
        })}
      </div>
    )
  }

  // ── Piano / Harmonium layout ──────────────────────────────────────────────
  return (
    <div className="w-full bg-black/60 rounded-[28px] md:rounded-[48px] border border-white/10 p-4 md:p-8 lg:p-12 flex flex-col items-center justify-start gap-6 md:gap-10 overflow-hidden shadow-[0_0_100px_rgba(var(--primary-rgb),0.05)] backdrop-blur-3xl">
      {/* DAW-Style HUD */}
      <div className="flex flex-wrap justify-center items-center gap-3 md:gap-6 px-4 md:px-10 py-2.5 md:py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-2xl shadow-xl z-50">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              normalizedActiveNotes.length > 0
                ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)] animate-pulse'
                : 'bg-white/10'
            }`}
          />
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">
            {layout} Engine
          </span>
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Grouped instrument selector — custom dropdown */}
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
                          isActive
                            ? 'text-primary bg-primary/10'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
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

        <button
          onClick={() => setIsScaleLocked(!isScaleLocked)}
          disabled={normalizedActiveNotes.length === 0}
          className={`flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.15em] px-5 py-2 rounded-full transition-all border ${
            isScaleLocked && normalizedActiveNotes.length > 0
              ? 'bg-primary/20 text-primary border-primary/30 shadow-glow'
              : 'bg-white/5 text-white/30 border-white/10 hover:text-white/60'
          }`}
        >
          {isScaleLocked && normalizedActiveNotes.length > 0
            ? 'Scale Locked'
            : 'Omni Mode'}
        </button>
      </div>

      {/* Keyboard — scrollable on narrow screens */}
      <div className="w-full overflow-x-auto pb-2 scroll-thin">
      <div className="relative flex p-2 bg-[#050505] rounded-[28px] border border-white/5 shadow-2xl mx-auto" style={{ width: 'fit-content' }}>
        {octaves.map(octave => (
          <div key={octave} className="relative flex w-[448px] h-80 shrink-0">
            {/* White Keys */}
            <div className="flex w-full h-full">
              {NOTES_IN_OCTAVE.filter(n => !n.isBlack).map((note, idx, filteredArr) => {
                const freq        = getFrequency(note.offset, octave)
                const canonical   = normalizeSwara(note.name)
                const isInRaga    = normalizedActiveNotes.length === 0 || normalizedActiveNotes.includes(canonical)
                const noteId      = `${note.name}${octave}`
                const isHeld      = heldNotes.has(noteId)
                const isPlaying   = isHeld || playingNote === noteId || externalActiveNote === noteId
                const isLockedOut = isScaleLocked && normalizedActiveNotes.length > 0 && !isInRaga
                const isVadi      = vadiNorm !== null && canonical === vadiNorm
                const isSamvadi   = samvadiNorm !== null && canonical === samvadiNorm
                const isVarjya    = varjyaSet.has(canonical)
                const isNyasa     = nyasaSet.has(canonical)
                const isAbsoluteFirst = octave === octaves[0] && idx === 0
                const isAbsoluteLast  = octave === octaves[octaves.length - 1] && idx === filteredArr.length - 1

                return (
                  <button
                    key={idx}
                    onMouseDown={(e) => { e.preventDefault(); handleAttack(noteId, freq, note.name) }}
                    onMouseUp={() => handleRelease(noteId, freq)}
                    onMouseLeave={() => handleRelease(noteId, freq)}
                    onTouchStart={(e) => { e.preventDefault(); handleAttack(noteId, freq, note.name) }}
                    onTouchEnd={() => handleRelease(noteId, freq)}
                    disabled={isLockedOut}
                    className={`group relative flex-1 h-80 border-r border-black/10 transition-all duration-150 origin-top
                      ${isAbsoluteFirst ? 'rounded-l-2xl' : ''}
                      ${isAbsoluteLast  ? 'rounded-r-2xl'  : ''}
                      ${isPlaying
                        ? 'bg-primary brightness-125 translate-y-3 z-30 shadow-[0_20px_40px_rgba(var(--primary-rgb),0.5)]'
                        : isLockedOut
                          ? 'bg-[#ffffff] cursor-not-allowed opacity-90'
                          : isVarjya
                            ? 'bg-[#f0f0f0] opacity-50 cursor-not-allowed'
                            : isVadi
                              ? 'bg-[#fff8f0] hover:bg-[#ffe8d0] active:translate-y-2'
                              : isSamvadi
                                ? 'bg-[#f0f8ff] hover:bg-[#d8edff] active:translate-y-2'
                                : 'bg-[#fafafa] hover:bg-[#ededed] active:translate-y-2 active:bg-[#e0e0e0]'
                      }`}
                  >
                    {/* Vadi glow bar */}
                    {isVadi && !isPlaying && (
                      <div className="absolute top-0 inset-x-0 h-1.5 rounded-t-sm bg-gradient-to-r from-amber-400 to-orange-400 opacity-80" />
                    )}
                    {/* Samvadi bar */}
                    {isSamvadi && !isPlaying && (
                      <div className="absolute top-0 inset-x-0 h-1.5 rounded-t-sm bg-gradient-to-r from-sky-400 to-blue-400 opacity-60" />
                    )}
                    {/* Raga dot */}
                    <div
                      className={`absolute top-4 left-1/2 -translate-x-1/2 rounded-full transition-all
                        ${isVadi    ? 'w-2 h-2 bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                        : isSamvadi ? 'w-1.5 h-1.5 bg-sky-400 opacity-80'
                        : isNyasa   ? 'w-1 h-1 bg-primary/40'
                        : isInRaga && !isLockedOut ? 'w-1 h-1 bg-primary/20'
                        : 'w-0 h-0 opacity-0'}`}
                    />
                    <span
                      className={`absolute bottom-6 left-1/2 -translate-x-1/2 font-display text-[9px] tracking-[0.2em] font-bold transition-all ${
                        isPlaying ? 'text-white scale-110'
                        : isVadi    ? 'text-amber-600'
                        : isSamvadi ? 'text-sky-600'
                        : 'text-black/20'
                      }`}
                    >
                      {note.name}
                    </span>
                    <div className="absolute inset-x-0 top-0 h-1 bg-white/40 opacity-0 group-hover:opacity-10" />
                  </button>
                )
              })}
            </div>

            {/* Black Keys */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-40">
              {NOTES_IN_OCTAVE.map((note, idx) => {
                if (!note.isBlack) return null
                const freq        = getFrequency(note.offset, octave)
                const canonical   = normalizeSwara(note.name)
                const isInRaga    = normalizedActiveNotes.length === 0 || normalizedActiveNotes.includes(canonical)
                const noteId      = `${note.name}${octave}`
                const isHeld      = heldNotes.has(noteId)
                const isPlaying   = isHeld || playingNote === noteId || externalActiveNote === noteId
                const isLockedOut = isScaleLocked && normalizedActiveNotes.length > 0 && !isInRaga
                const isVadi      = vadiNorm !== null && canonical === vadiNorm
                const isSamvadi   = samvadiNorm !== null && canonical === samvadiNorm
                const isVarjya    = varjyaSet.has(canonical)
                const whiteKeysBefore = NOTES_IN_OCTAVE.slice(0, idx).filter(n => !n.isBlack).length

                return (
                  <button
                    key={idx}
                    disabled={isLockedOut}
                    onMouseDown={e => { e.preventDefault(); e.stopPropagation(); handleAttack(noteId, freq, note.name) }}
                    onMouseUp={() => handleRelease(noteId, freq)}
                    onMouseLeave={() => handleRelease(noteId, freq)}
                    onTouchStart={e => { e.preventDefault(); handleAttack(noteId, freq, note.name) }}
                    onTouchEnd={() => handleRelease(noteId, freq)}
                    className={`absolute top-0 w-[42px] h-48 -translate-x-1/2 rounded-b-xl border-x border-b transition-all duration-150 pointer-events-auto ${
                      isPlaying
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
                    {/* Vadi top accent */}
                    {isVadi && !isPlaying && (
                      <div className="absolute top-0 inset-x-0 h-1 rounded-t bg-amber-400 opacity-70" />
                    )}
                    {isSamvadi && !isPlaying && (
                      <div className="absolute top-0 inset-x-0 h-1 rounded-t bg-sky-400 opacity-50" />
                    )}
                    {isInRaga && normalizedActiveNotes.length > 0 && (
                      <span
                        className={`absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[7px] uppercase font-bold tracking-tighter ${
                          isPlaying ? 'text-white' : isVadi ? 'text-amber-400' : isSamvadi ? 'text-sky-400' : 'text-primary'
                        }`}
                      >
                        {note.label}
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
      </div>{/* end scroll wrapper */}

      {/* Footer metadata */}
      <div className="flex gap-12 font-mono text-[8px] uppercase tracking-[0.2em] text-white/20">
        <span>2 Octave Spectrum</span>
        <div className="w-px h-2.5 bg-white/10" />
        <span>Low Latency Engine</span>
      </div>
    </div>
  )
}
