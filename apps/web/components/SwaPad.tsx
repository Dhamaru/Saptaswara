'use client'

import React, { useState, useCallback } from 'react'
import { audioEngine } from '@/lib/audio'
import { swaraToFrequency } from '@/lib/musicalMath'

// ── Swara definitions ─────────────────────────────────────────────────────────

/** The 7 base swaras in order */
const BASE_SWARAS = ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'] as const
type BaseSwara = typeof BASE_SWARAS[number]

/** Which base swaras can be komal (flat) */
const KOMAL_CAPABLE = new Set<BaseSwara>(['Re', 'Ga', 'Dha', 'Ni'])
/** Which base swaras can be tivra (sharp) */
const TIVRA_CAPABLE = new Set<BaseSwara>(['Ma'])
/** Sa and Pa are achala — no variants */
const ACHALA = new Set<BaseSwara>(['Sa', 'Pa'])

type SwaraVariant = 'shuddha' | 'komal' | 'tivra'
type Register    = 'mandra' | 'madhya' | 'taar'

const REGISTER_OCTAVE: Record<Register, number> = {
  mandra: 3,
  madhya: 4,
  taar:   5,
}

const REGISTER_LABELS: Record<Register, string> = {
  mandra: 'Mandra',
  madhya: 'Madhya',
  taar:   'Taar',
}

/** Semitone offsets from Sa (C) for each swara variant */
const SEMITONE_OFFSETS: Record<string, number> = {
  'Sa':       0,
  'komal Re': 1,  'Re': 2,
  'komal Ga': 3,  'Ga': 4,
  'Ma':       5,  'tivra Ma': 6,
  'Pa':       7,
  'komal Dha': 8, 'Dha': 9,
  'komal Ni': 10, 'Ni': 11,
}

function swaraKey(swara: BaseSwara, variant: SwaraVariant): string {
  if (swara === 'Sa' || swara === 'Pa') return swara
  if (variant === 'komal') return `komal ${swara}`
  if (variant === 'tivra') return `tivra ${swara}`
  return swara
}

function getFreq(swara: BaseSwara, variant: SwaraVariant, register: Register): number {
  const key      = swaraKey(swara, variant)
  const semitone = SEMITONE_OFFSETS[key] ?? 0
  const octave   = REGISTER_OCTAVE[register]
  const sa       = 261.63 * Math.pow(2, octave - 4) // C in the target octave
  return sa * Math.pow(2, semitone / 12)
}

// ── Swara color palette ───────────────────────────────────────────────────────
const SWARA_COLORS: Record<BaseSwara, { idle: string; active: string; text: string; dot: string }> = {
  Sa:  { idle: 'bg-primary/10 border-primary/20 hover:bg-primary/20',       active: 'bg-primary border-primary/80',             text: 'text-primary',   dot: 'bg-primary'   },
  Re:  { idle: 'bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20', active: 'bg-violet-500 border-violet-500',        text: 'text-violet-400', dot: 'bg-violet-400' },
  Ga:  { idle: 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20',     active: 'bg-rose-500 border-rose-500',              text: 'text-rose-400',  dot: 'bg-rose-400'  },
  Ma:  { idle: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20',  active: 'bg-amber-500 border-amber-500',            text: 'text-amber-400', dot: 'bg-amber-400' },
  Pa:  { idle: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20', active: 'bg-emerald-500 border-emerald-500',  text: 'text-emerald-400', dot: 'bg-emerald-400' },
  Dha: { idle: 'bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20',     active: 'bg-cyan-500 border-cyan-500',              text: 'text-cyan-400',  dot: 'bg-cyan-400'  },
  Ni:  { idle: 'bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20',        active: 'bg-sky-500 border-sky-500',                text: 'text-sky-400',   dot: 'bg-sky-400'   },
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface SwaPadProps {
  /** Called when a swara is triggered — for sequencer recording */
  onSwara?: (swara: string, frequency: number) => void
  /** Which swaras are in the active raga (empty = all allowed) */
  activeRagaNotes?: string[]
  /** Raga constraint: if true, non-raga swaras are dimmed */
  ragaConstrained?: boolean
  /** Vadi swara name */
  vadiNote?: string
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SwaPad({ onSwara, activeRagaNotes = [], ragaConstrained = false, vadiNote }: SwaPadProps) {
  const [register, setRegister]   = useState<Register>('madhya')
  const [komalSet, setKomalSet]   = useState<Set<BaseSwara>>(new Set())
  const [tivraSet, setTivraSet]   = useState<Set<BaseSwara>>(new Set())
  const [heldSwara, setHeldSwara] = useState<BaseSwara | null>(null)

  const getVariant = useCallback((swara: BaseSwara): SwaraVariant => {
    if (tivraSet.has(swara)) return 'tivra'
    if (komalSet.has(swara)) return 'komal'
    return 'shuddha'
  }, [komalSet, tivraSet])

  const handleAttack = useCallback((swara: BaseSwara) => {
    const variant  = getVariant(swara)
    const freq     = getFreq(swara, variant, register)
    const label    = swaraKey(swara, variant)
    audioEngine?.attackSwara(freq, 0.85)
    setHeldSwara(swara)
    onSwara?.(label, freq)
  }, [getVariant, register, onSwara])

  const handleRelease = useCallback((swara: BaseSwara) => {
    const variant = getVariant(swara)
    const freq    = getFreq(swara, variant, register)
    audioEngine?.releaseSwara(freq)
    setHeldSwara(null)
  }, [getVariant, register])

  const toggleKomal = (swara: BaseSwara) => {
    if (!KOMAL_CAPABLE.has(swara)) return
    setKomalSet(prev => {
      const s = new Set(prev)
      if (s.has(swara)) { s.delete(swara) } else { s.add(swara); setTivraSet(t => { const u = new Set(t); u.delete(swara); return u }) }
      return s
    })
  }

  const toggleTivra = (swara: BaseSwara) => {
    if (!TIVRA_CAPABLE.has(swara)) return
    setTivraSet(prev => {
      const s = new Set(prev)
      if (s.has(swara)) { s.delete(swara) } else { s.add(swara); setKomalSet(k => { const u = new Set(k); u.delete(swara); return u }) }
      return s
    })
  }

  const ragaSet = new Set(activeRagaNotes.map(n => n.toLowerCase().replace('komal ', 'k').replace('tivra ', 't')))

  return (
    <div className="w-full rounded-3xl bg-surface-container-lowest/30 border border-outline-variant/10 backdrop-blur-3xl shadow-2xl p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-light text-on-surface">Swara Pad</h3>
          <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 mt-0.5">
            Hold to sustain · Toggle ♭ / ♯ below each swara
          </p>
        </div>

        {/* Register selector */}
        <div className="flex bg-black/40 rounded-full p-1 border border-outline-variant/5">
          {(['mandra', 'madhya', 'taar'] as Register[]).map(r => (
            <button
              key={r}
              onClick={() => setRegister(r)}
              className={`px-3 py-1.5 rounded-full font-mono text-[9px] uppercase font-bold transition-all ${
                register === r
                  ? 'bg-primary text-on-primary shadow-glow'
                  : 'text-on-surface-variant/40 hover:text-on-surface'
              }`}
            >
              {REGISTER_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Swara pads — horizontal scroll on mobile, 7-col grid on wider screens */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1 scroll-thin">
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(7, minmax(52px, 1fr))', minWidth: '380px' }}>
        {BASE_SWARAS.map(swara => {
          const variant   = getVariant(swara)
          const isHeld    = heldSwara === swara
          const isAchala  = ACHALA.has(swara)
          const isKomal   = variant === 'komal'
          const isTivra   = variant === 'tivra'
          const isVadi    = vadiNote?.toLowerCase() === swara.toLowerCase()
          const c         = SWARA_COLORS[swara]
          const label     = isKomal ? `k${swara}` : isTivra ? `${swara}♯` : swara

          return (
            <div key={swara} className="flex flex-col items-center gap-1.5">
              {/* Main pad */}
              <button
                onMouseDown={(e) => { e.preventDefault(); handleAttack(swara) }}
                onMouseUp={() => handleRelease(swara)}
                onMouseLeave={() => { if (heldSwara === swara) handleRelease(swara) }}
                onTouchStart={(e) => { e.preventDefault(); handleAttack(swara) }}
                onTouchEnd={() => handleRelease(swara)}
                className={`relative w-full h-20 rounded-2xl border transition-all select-none flex flex-col items-center justify-center gap-1 overflow-hidden ${
                  isHeld ? `${c.active} scale-95 shadow-glow` : `${c.idle}`
                }`}
              >
                {/* Vadi glow ring */}
                {isVadi && (
                  <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/60 pointer-events-none" />
                )}

                {/* Variant badge */}
                {(isKomal || isTivra) && (
                  <span className={`absolute top-2 right-2 font-mono text-[8px] font-bold opacity-70 ${isHeld ? 'text-white' : c.text}`}>
                    {isKomal ? '♭' : '♯'}
                  </span>
                )}

                {/* Swara name */}
                <span className={`font-display text-2xl font-light relative z-10 transition-colors ${
                  isHeld ? 'text-white' : c.text
                }`}>
                  {swara}
                </span>

                {/* Variant sublabel */}
                <span className={`font-mono text-[7px] uppercase tracking-widest relative z-10 ${
                  isHeld ? 'text-white/70' : 'text-on-surface-variant/40'
                }`}>
                  {isKomal ? 'komal' : isTivra ? 'tivra' : isVadi ? 'vadi' : 'shuddha'}
                </span>

                {/* Active dot */}
                <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full transition-all ${
                  isHeld ? 'w-2 h-2 bg-white animate-pulse' : `w-1 h-1 ${c.dot} opacity-30`
                }`} />
              </button>

              {/* Variant toggles */}
              {!isAchala && (
                <div className="flex gap-1 w-full">
                  {KOMAL_CAPABLE.has(swara) && (
                    <button
                      onClick={() => toggleKomal(swara)}
                      title={`${swara} komal (♭)`}
                      className={`flex-1 py-1 rounded-lg font-mono text-[7px] font-bold uppercase tracking-wider transition-all border ${
                        isKomal
                          ? `${c.active} border-transparent text-white`
                          : `border-outline-variant/10 ${c.text} opacity-50 hover:opacity-100 bg-surface-container-low/30`
                      }`}
                    >
                      ♭
                    </button>
                  )}
                  {TIVRA_CAPABLE.has(swara) && (
                    <button
                      onClick={() => toggleTivra(swara)}
                      title={`${swara} tivra (♯)`}
                      className={`flex-1 py-1 rounded-lg font-mono text-[7px] font-bold uppercase tracking-wider transition-all border ${
                        isTivra
                          ? `${c.active} border-transparent text-white`
                          : `border-outline-variant/10 ${c.text} opacity-50 hover:opacity-100 bg-surface-container-low/30`
                      }`}
                    >
                      ♯
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      </div>{/* end scroll wrapper */}

      {/* Current variant display */}
      <div className="flex items-center justify-center gap-2 flex-wrap pt-1 border-t border-outline-variant/5">
        {BASE_SWARAS.map(swara => {
          const variant = getVariant(swara)
          const label   = swaraKey(swara, variant)
          const c       = SWARA_COLORS[swara]
          return (
            <div key={swara} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container-low/30 border border-outline-variant/5">
              <div className={`w-1.5 h-1.5 rounded-full ${c.dot} opacity-60`} />
              <span className={`font-mono text-[8px] font-bold ${c.text} opacity-70`}>{label}</span>
            </div>
          )
        })}
        <div className="w-px h-4 bg-outline-variant/10" />
        <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40">
          {REGISTER_LABELS[register]} octave
        </span>
      </div>
    </div>
  )
}
