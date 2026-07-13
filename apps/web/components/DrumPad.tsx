'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { audioEngine } from '@/lib/audio'
import { cn } from '@/lib/utils'

// ── Stroke definitions with keyboard bindings ─────────────────────────────────
interface StrokeDef {
  label: string
  subLabel: string
  key: string        // display key label
  keyCode: string    // event.key value
  color: 'primary' | 'secondary' | 'tertiary'
}

const TABLA_STROKES: StrokeDef[] = [
  { label: 'Dha',  subLabel: 'Bass + Ring',  key: 'A', keyCode: 'a', color: 'primary'   },
  { label: 'Dhin', subLabel: 'Resonant',      key: 'S', keyCode: 's', color: 'primary'   },
  { label: 'Na',   subLabel: 'High Tone',     key: 'D', keyCode: 'd', color: 'secondary' },
  { label: 'Te',   subLabel: 'Muted',         key: 'F', keyCode: 'f', color: 'secondary' },
  { label: 'Ge',   subLabel: 'Bass Snap',     key: 'G', keyCode: 'g', color: 'primary'   },
  { label: 'Ka',   subLabel: 'Palm Mute',     key: 'H', keyCode: 'h', color: 'secondary' },
  { label: 'Ti',   subLabel: 'Finger Strike', key: 'J', keyCode: 'j', color: 'secondary' },
]

const MRIDANGAM_STROKES: StrokeDef[] = [
  { label: 'Thom', subLabel: 'Deep Roll', key: 'A', keyCode: 'a', color: 'primary'   },
  { label: 'Nam',  subLabel: 'Rim Tone',  key: 'S', keyCode: 's', color: 'primary'   },
  { label: 'Dhi',  subLabel: 'Slap',      key: 'D', keyCode: 'd', color: 'secondary' },
  { label: 'Tha',  subLabel: 'Muted',     key: 'F', keyCode: 'f', color: 'secondary' },
]

// ── Color maps ────────────────────────────────────────────────────────────────
const PAD_COLORS = {
  primary:   { idle: 'border-primary/20 bg-primary/5 hover:bg-primary/15',   active: 'bg-primary/30 border-primary/50 scale-95', flash: 'bg-primary',   text: 'text-primary'   },
  secondary: { idle: 'border-secondary/20 bg-secondary/5 hover:bg-secondary/15', active: 'bg-secondary/30 border-secondary/50 scale-95', flash: 'bg-secondary', text: 'text-secondary' },
  tertiary:  { idle: 'border-outline-variant/20 bg-surface-container-low/20 hover:bg-surface-container-low/40', active: 'bg-surface-container-high scale-95', flash: 'bg-white', text: 'text-on-surface' },
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface DrumPadProps {
  /** Called when user triggers a stroke (click or keyboard) — for sequencer recording */
  onStroke?: (stroke: string) => void
  /** Whether keyboard shortcuts should be active (false when a melody track is focused) */
  keyboardActive?: boolean
}

// ── Pad button ────────────────────────────────────────────────────────────────
function Pad({
  def,
  flashing,
  onClick,
}: {
  def: StrokeDef
  flashing: boolean
  onClick: () => void
}) {
  const c = PAD_COLORS[def.color]
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl border transition-all select-none',
        'h-20 gap-1 overflow-hidden',
        flashing ? c.active : c.idle,
        !flashing && 'active:scale-95'
      )}
    >
      {/* Flash overlay */}
      {flashing && (
        <div className={cn('absolute inset-0 opacity-20 rounded-2xl', c.flash)} />
      )}

      {/* Key badge */}
      <div className="absolute top-2 right-2.5">
        <span className={cn('font-mono text-[8px] font-bold opacity-40', c.text)}>{def.key}</span>
      </div>

      {/* Stroke label */}
      <span className={cn('font-display text-2xl font-light relative z-10', flashing ? c.text : 'text-on-surface')}>
        {def.label}
      </span>
      <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/50 relative z-10">
        {def.subLabel}
      </span>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
// Ghost Teentaal pattern shown on first open (steps 1-16, 1-indexed)
const GHOST_TEENTAAL: Record<string, number[]> = {
  Dha:  [1, 5, 9, 16],
  Dhin: [2, 3, 6, 7, 15],
  Na:   [10, 11],
  Te:   [12, 13],
}

export default function DrumPad({ onStroke, keyboardActive = true }: DrumPadProps) {
  const [instrument, setInstrument] = useState<'tabla' | 'mridangam'>('tabla')
  const [flashing, setFlashing] = useState<string | null>(null)
  const [hasTriggered, setHasTriggered] = useState(false)

  const strokes = instrument === 'tabla' ? TABLA_STROKES : MRIDANGAM_STROKES

  const triggerStroke = useCallback((stroke: string) => {
    audioEngine?.playStroke(stroke)
    onStroke?.(stroke)
    setFlashing(stroke)
    setHasTriggered(true)
    setTimeout(() => setFlashing(null), 120)
  }, [onStroke])

  // Keyboard shortcuts
  useEffect(() => {
    if (!keyboardActive) return
    const handler = (e: KeyboardEvent) => {
      // Don't fire when user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.repeat) return
      const match = strokes.find(s => s.keyCode === e.key.toLowerCase())
      if (match) {
        e.preventDefault()
        triggerStroke(match.label)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [keyboardActive, strokes, triggerStroke])

  const handleInstrumentChange = (type: 'tabla' | 'mridangam') => {
    setInstrument(type)
    audioEngine?.setPercussionType(type)
  }

  return (
    <div className="w-full p-6 rounded-3xl bg-surface-container-lowest/30 border border-outline-variant/10 backdrop-blur-3xl shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-xl font-light text-on-surface">Percussion Hub</h3>
          <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 mt-0.5">
            {keyboardActive ? 'Keys A–J active' : 'Click pads to play'}
          </p>
        </div>
        <div className="flex bg-black/40 rounded-full p-1 border border-outline-variant/5">
          <button
            onClick={() => handleInstrumentChange('tabla')}
            className={cn('px-4 py-1.5 rounded-full text-[10px] uppercase font-bold transition-all', instrument === 'tabla' ? 'bg-primary text-on-primary shadow-glow' : 'text-on-surface-variant hover:text-on-surface')}
          >
            Tabla
          </button>
          <button
            onClick={() => handleInstrumentChange('mridangam')}
            className={cn('px-4 py-1.5 rounded-full text-[10px] uppercase font-bold transition-all', instrument === 'mridangam' ? 'bg-primary text-on-primary shadow-glow' : 'text-on-surface-variant hover:text-on-surface')}
          >
            Mridangam
          </button>
        </div>
      </div>

      {/* Pad grid — tabla: 7 pads scroll on mobile; mridangam: 4 pads fit cleanly */}
      <div className={cn(
        'grid gap-2 md:gap-3',
        instrument === 'tabla'
          ? 'grid-cols-4 md:grid-cols-7'
          : 'grid-cols-2 sm:grid-cols-4'
      )}>
        {strokes.map(def => (
          <div key={def.label} className="flex flex-col gap-1">
            {/* Ghost pattern dots — shown on first open, tabla only */}
            {!hasTriggered && instrument === 'tabla' && (
              <div className="flex gap-0.5 justify-center h-3">
                {(GHOST_TEENTAAL[def.label] ?? []).map(step => (
                  <div key={step} className="w-1 h-1 rounded-full bg-primary/20 mt-1" title={`Beat ${step}`} />
                ))}
              </div>
            )}
            <Pad
              def={def}
              flashing={flashing === def.label}
              onClick={() => triggerStroke(def.label)}
            />
          </div>
        ))}
      </div>
      {!hasTriggered && instrument === 'tabla' && (
        <p className="mt-3 text-center font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/25">
          Dots show a Teentaal pattern — tap any pad to start
        </p>
      )}

      {/* Keyboard legend */}
      {keyboardActive && (
        <div className="mt-5 pt-4 border-t border-outline-variant/5 flex items-center justify-center gap-1 flex-wrap">
          {strokes.map(def => (
            <div key={def.label} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container-low/30 border border-outline-variant/5">
              <kbd className="font-mono text-[9px] font-bold text-primary/60">{def.key}</kbd>
              <span className="font-mono text-[8px] text-on-surface-variant/40">{def.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
