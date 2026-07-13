'use client'

import { useState, useRef, useCallback } from 'react'
import { swaraToFrequency } from '@/lib/musicalMath'
import { getAudioEngine } from '@/lib/audio'

const ALL_SWARAS = ['Sa', 're', 'Re', 'ga', 'Ga', 'Ma', 'ma', 'Pa', 'dha', 'Dha', 'ni', 'Ni'] as const
type Swara = typeof ALL_SWARAS[number]

const SWARA_COLOR: Record<string, string> = {
  Sa: 'bg-primary/15 border-primary/30 text-primary',
  Pa: 'bg-primary/15 border-primary/30 text-primary',
  re: 'bg-sky-500/15 border-sky-400/30 text-sky-300',
  Re: 'bg-sky-500/15 border-sky-400/30 text-sky-300',
  ga: 'bg-sky-500/15 border-sky-400/30 text-sky-300',
  Ga: 'bg-sky-500/15 border-sky-400/30 text-sky-300',
  Ma: 'bg-secondary/15 border-secondary/30 text-secondary',
  ma: 'bg-amber-500/15 border-amber-400/30 text-amber-300',
  dha: 'bg-sky-500/15 border-sky-400/30 text-sky-300',
  Dha: 'bg-sky-500/15 border-sky-400/30 text-sky-300',
  ni: 'bg-sky-500/15 border-sky-400/30 text-sky-300',
  Ni: 'bg-sky-500/15 border-sky-400/30 text-sky-300',
}

interface Props {
  allowedSwaras?: Set<string>
  ragaName?: string
}

export function NotationEditor({ allowedSwaras, ragaName }: Props) {
  const [sequence, setSequence] = useState<Swara[]>([])
  const [tempo, setTempo] = useState(80)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [octave, setOctave] = useState<'lower' | 'mid' | 'upper'>('mid')
  const playTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const stopPlayback = useCallback(() => {
    playTimeoutsRef.current.forEach(clearTimeout)
    playTimeoutsRef.current = []
    setIsPlaying(false)
    setActiveIdx(-1)
  }, [])

  const playSequence = useCallback(async () => {
    if (!sequence.length) return
    const engine = getAudioEngine()
    if (!engine) return
    if (!engine.isStarted) await engine.start()
    stopPlayback()
    setIsPlaying(true)

    const msPerBeat = (60 / tempo) * 1000
    const octaveShift = octave === 'lower' ? -1 : octave === 'upper' ? 1 : 0

    sequence.forEach((swara, i) => {
      const t1 = setTimeout(() => {
        setActiveIdx(i)
        const freq = swaraToFrequency(swara, 261.63, 4 + octaveShift)
        if (freq) engine.playSwara(freq, '4n')
      }, i * msPerBeat)

      playTimeoutsRef.current.push(t1)
    })

    const tEnd = setTimeout(() => {
      setIsPlaying(false)
      setActiveIdx(-1)
    }, sequence.length * msPerBeat + 200)
    playTimeoutsRef.current.push(tEnd)
  }, [sequence, tempo, octave, stopPlayback])

  const addSwara = (s: Swara) => setSequence(prev => [...prev, s])
  const removeLastSwara = () => setSequence(prev => prev.slice(0, -1))

  const swaras = allowedSwaras
    ? ALL_SWARAS.filter(s => allowedSwaras.has(s))
    : ALL_SWARAS

  return (
    <div className="rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40">Notation Editor</div>
          {ragaName && <div className="font-mono text-[8px] text-primary/50 mt-0.5">{ragaName}</div>}
        </div>
        <div className="flex items-center gap-2">
          {/* Octave selector */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-container-high/40 border border-outline-variant/10">
            {(['lower', 'mid', 'upper'] as const).map(o => (
              <button
                key={o}
                onClick={() => setOctave(o)}
                className={`px-2 py-1 rounded-md font-mono text-[7px] uppercase tracking-widest transition-all ${octave === o ? 'bg-primary text-on-primary' : 'text-on-surface-variant/40 hover:text-on-surface'}`}
              >
                {o === 'lower' ? '↓' : o === 'upper' ? '↑' : '—'}
              </button>
            ))}
          </div>
          {/* Tempo */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-container-high/40 border border-outline-variant/10">
            <button onClick={() => setTempo(t => Math.max(40, t - 10))} className="text-on-surface-variant/40 hover:text-primary font-mono text-xs w-4">−</button>
            <span className="font-mono text-[9px] text-on-surface-variant/60 w-12 text-center">{tempo} BPM</span>
            <button onClick={() => setTempo(t => Math.min(200, t + 10))} className="text-on-surface-variant/40 hover:text-primary font-mono text-xs w-4">+</button>
          </div>
        </div>
      </div>

      {/* Sequence strip */}
      <div className="min-h-[44px] flex flex-wrap gap-1.5 p-3 rounded-xl bg-surface-container-high/30 border border-outline-variant/8">
        {sequence.length === 0 ? (
          <span className="font-mono text-[9px] text-on-surface-variant/25 self-center">Tap swaras below to compose…</span>
        ) : sequence.map((s, i) => (
          <div
            key={i}
            className={`px-2.5 py-1 rounded-lg border font-mono text-xs font-bold transition-all ${SWARA_COLOR[s] ?? 'bg-primary/10 border-primary/20 text-primary'} ${activeIdx === i ? 'scale-125 shadow-glow' : ''}`}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Swara palette */}
      <div className="flex flex-wrap gap-1.5">
        {swaras.map(s => (
          <button
            key={s}
            onClick={() => addSwara(s)}
            className={`px-3 py-2 rounded-xl border font-mono text-xs font-bold transition-all hover:scale-110 active:scale-95 ${SWARA_COLOR[s] ?? 'bg-primary/10 border-primary/20 text-primary'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={isPlaying ? stopPlayback : playSequence}
          disabled={!sequence.length}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-mono text-[9px] uppercase tracking-widest font-bold transition-all active:scale-95 disabled:opacity-30 ${
            isPlaying
              ? 'bg-error/15 border border-error/30 text-error'
              : 'bg-primary/15 border border-primary/30 text-primary'
          }`}
        >
          <span className="material-symbols-outlined !text-sm">{isPlaying ? 'stop' : 'play_arrow'}</span>
          {isPlaying ? 'Stop' : 'Play'}
        </button>
        <button
          onClick={removeLastSwara}
          disabled={!sequence.length}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant/15 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 hover:text-error hover:border-error/30 transition-all disabled:opacity-30"
        >
          <span className="material-symbols-outlined !text-sm">backspace</span>
          Undo
        </button>
        <button
          onClick={() => { stopPlayback(); setSequence([]) }}
          disabled={!sequence.length}
          className="ml-auto flex items-center gap-1 px-3 py-2 rounded-xl border border-outline-variant/10 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/30 hover:text-error hover:border-error/20 transition-all disabled:opacity-30"
        >
          <span className="material-symbols-outlined !text-sm">delete_sweep</span>
          Clear
        </button>
      </div>
    </div>
  )
}
