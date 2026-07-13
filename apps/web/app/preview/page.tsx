'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '@/components/ThemeProvider'

// ─── Data ────────────────────────────────────────────────────────────────────

type Tab = 'studio' | 'library' | 'journal'

interface Raga {
  name: string; time: string; mood: string; aroha: string[]
  whiteActive: number[]; blackActive: number[]
}

const RAGAS: Raga[] = [
  {
    name: 'Bhairavi', time: 'Daylight Practice', mood: 'Peaceful, Serene',
    aroha: ['Sa', 're', 'ga', 'Ma', 'Pa', 'dha', 'ni', "Sa'"],
    whiteActive: [0, 3, 4], blackActive: [0, 1, 3, 4],
  },
  {
    name: 'Yaman', time: 'Evening', mood: 'Romantic yearning',
    aroha: ['Sa', 'Re', 'Ga', 'ma', 'Pa', 'Dha', 'Ni', "Sa'"],
    whiteActive: [0, 1, 2, 4, 5, 6], blackActive: [2],
  },
  {
    name: 'Todi', time: 'Morning', mood: 'Wistful Adoration',
    aroha: ['Sa', 're', 'ga', 'Ma', 'Pa', 'dha', 'Ni', "Sa'"],
    whiteActive: [0, 3, 4, 6], blackActive: [0, 1, 3],
  },
]

const LIBRARY_RAGAS = [
  { name: 'Yaman',   scale: 'Sa Re Ga ♯4 Pa Dha Ni', mood: 'Romantic yearning',  thaat: 'Kalyan',  hex: '#58A6FF' },
  { name: 'Bhairav', scale: 'Sa ♭2 Ga Ma Pa ♭6 Ni',  mood: 'Peaceful, Serene',   thaat: 'Bhairav', hex: '#60A5FA' },
  { name: 'Todi',    scale: 'Sa ♭2 ♭3 ♯4 Pa ♭6 Ni',  mood: 'Wistful Adoration', thaat: 'Todi',    hex: '#A78BFA' },
]

const SESSIONS = [
  { date: 'Oct 24, 2023', raga: 'Bhairav',  dur: '80 min',  acc: 78, note: 'Focus on komal Re in lower octave…' },
  { date: 'Oct 23, 2023', raga: 'Tanas',    dur: '40 min',  acc: 92, note: 'Flat swara at 80 BPM, taans placed…' },
  { date: 'Oct 22, 2023', raga: 'Bhoopali', dur: '120 min', acc: 67, note: 'Full exploration of Yaman/Bhairav…' },
]

const MOCK_AI_REPLIES = [
  'Try emphasizing the Gandhar (Ga) — in this raga it carries the emotional weight.',
  'Your alaap pacing is good. Consider a longer pause before the Mandra Saptak.',
  'The komal swaras here define the character. Lean into them with meend ornaments.',
  'Vadi swara energy is strong. Build tension toward it, then resolve gently.',
]

// ─── Piano ────────────────────────────────────────────────────────────────────

const WW = 60, WH = 180, BW = 34, BH = 112
const BLACK_SLOTS = [
  { slot: 0, xOff: WW * 0.65 },
  { slot: 1, xOff: WW * 1.65 },
  { slot: 2, xOff: WW * 3.65 },
  { slot: 3, xOff: WW * 4.65 },
  { slot: 4, xOff: WW * 5.65 },
]

function Piano({ raga, beat }: { raga: Raga; beat: number }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      <svg viewBox={`0 0 ${WW * 14} ${WH}`} className="w-full" style={{ display: 'block' }}
        preserveAspectRatio="xMidYMid meet">
        {Array.from({ length: 14 }, (_, i) => {
          const isActive = raga.whiteActive.includes(i % 7)
          return (
            <g key={`w${i}`}>
              <rect x={i * WW + 1} y={0} width={WW - 2} height={WH} rx={4}
                fill={isActive ? '#DBEAFE' : '#F5F0E4'} stroke="#DDD8CE" strokeWidth={1} />
              {isActive && <circle cx={i * WW + WW / 2} cy={WH - 10} r={4} fill="var(--primary)" opacity={0.9} />}
            </g>
          )
        })}
        {Array.from({ length: 2 }, (_, oct) =>
          BLACK_SLOTS.map(({ slot, xOff }) => {
            const isActive = raga.blackActive.includes(slot)
            return (
              <rect key={`b${oct}${slot}`} x={oct * 7 * WW + xOff} y={0}
                width={BW} height={BH} rx={3}
                fill={isActive ? 'var(--primary)' : '#1C1A17'} />
            )
          })
        )}
      </svg>
      {/* Sargam row */}
      <div className="flex justify-center gap-1 flex-wrap px-2">
        {raga.aroha.map((s, i) => {
          const active = i === beat % raga.aroha.length
          return (
            <span key={i} style={{
              fontSize: active ? 13 : 10, fontWeight: active ? 700 : 400,
              color: active ? 'var(--primary)' : 'var(--on-surface-variant)',
              transition: 'all 0.15s',
            }}>{s}</span>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tempo Knob ───────────────────────────────────────────────────────────────

function TempoKnob({ bpm, onDecrement, onIncrement }: {
  bpm: number; onDecrement: () => void; onIncrement: () => void
}) {
  const SIZE = 80, R = 28, CX = 40, CY = 40
  const pct = Math.min(bpm / 200, 1)
  const startDeg = -225, endDeg = startDeg + 270 * pct
  const toXY = (d: number) => {
    const r = (d * Math.PI) / 180
    return { x: +(CX + R * Math.cos(r)).toFixed(3), y: +(CY + R * Math.sin(r)).toFixed(3) }
  }
  const s = toXY(startDeg), e = toXY(endDeg)
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={CX} cy={CY} r={R} fill="none"
          stroke="color-mix(in srgb, var(--outline-variant) 50%, transparent)" strokeWidth={3.5} />
        <path d={`M ${s.x} ${s.y} A ${R} ${R} 0 ${endDeg - startDeg > 180 ? 1 : 0} 1 ${e.x} ${e.y}`}
          fill="none" stroke="var(--primary)" strokeWidth={3.5} strokeLinecap="round" />
        <text x={CX} y={CY + 6} textAnchor="middle" fontSize={15} fontWeight={700}
          fill="var(--on-surface)" fontFamily="var(--font-dm-sans, system-ui)">{bpm}</text>
      </svg>
      <div className="flex items-center gap-2">
        <button onClick={onDecrement}
          className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors"
          style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)', border: 'none', cursor: 'pointer' }}>−</button>
        <span className="text-[9px] tracking-[0.8px] uppercase" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          {bpm < 66 ? 'Largo' : bpm < 76 ? 'Adagio' : bpm < 108 ? 'Andante' : bpm < 120 ? 'Moderato' : bpm < 156 ? 'Allegro' : 'Presto'}
        </span>
        <button onClick={onIncrement}
          className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors"
          style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)', border: 'none', cursor: 'pointer' }}>+</button>
      </div>
    </div>
  )
}

// ─── Waveform ─────────────────────────────────────────────────────────────────

function TanpuraWave({ playing }: { playing: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const phase = useRef(0)
  const raf = useRef<number>()

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const draw = () => {
      const { width: w, height: h } = canvas
      const primary = getComputedStyle(canvas).getPropertyValue('--primary').trim() || '#58A6FF'
      ctx.clearRect(0, 0, w, h)
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, primary + '6B')
      grad.addColorStop(1, primary + '05')
      ctx.beginPath()
      for (let x = 0; x <= w; x++) {
        const t = x / w
        const y = h / 2 + Math.sin(t * Math.PI * 5 + phase.current) * h * 0.28
                       + Math.sin(t * Math.PI * 9 + phase.current * 1.4) * h * 0.1
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath()
      ctx.fillStyle = grad; ctx.fill()
      ctx.beginPath()
      for (let x = 0; x <= w; x++) {
        const t = x / w
        const y = h / 2 + Math.sin(t * Math.PI * 5 + phase.current) * h * 0.28
                       + Math.sin(t * Math.PI * 9 + phase.current * 1.4) * h * 0.1
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = primary; ctx.lineWidth = 1.5; ctx.stroke()
      if (playing) phase.current += 0.035
      raf.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf.current!)
  }, [playing])

  return (
    <div className="flex flex-col gap-2">
      <canvas ref={ref} width={280} height={44}
        className="w-full rounded-md" style={{ height: 44 }} />
      <div className="relative h-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--outline-variant) 50%, transparent)' }}>
        <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: '62%', background: 'var(--primary)' }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2"
          style={{ left: 'calc(62% - 6px)', background: 'var(--primary)', borderColor: 'var(--surface-container-low)' }} />
      </div>
    </div>
  )
}

// ─── AI Panel ─────────────────────────────────────────────────────────────────

type AIMsg = { text: string; action?: boolean; fromUser?: boolean }

function AIPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [msgs, setMsgs] = useState<AIMsg[]>([
    { text: "Detecting a slight rhythmic shift in your middle octave transitions. Stabilize Tanpura drone to match your breath cycle?" },
    { text: 'Adjust resonance for more sustain', action: true },
    { text: 'Resonance depth increased 15%. Vadi swara (Madhyam) is now harmonically emphasized.' },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [replyIdx, setReplyIdx] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const submit = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMsgs(m => [...m, { text, fromUser: true }])
    setTyping(true)
    setTimeout(() => {
      setMsgs(m => [...m, { text: MOCK_AI_REPLIES[replyIdx % MOCK_AI_REPLIES.length] }])
      setReplyIdx(i => i + 1)
      setTyping(false)
    }, 1200)
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, typing])

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />
      )}
      <aside className={[
        'flex flex-col border-l transition-all duration-300',
        'fixed inset-y-0 right-0 z-50 w-[min(320px,100vw)] lg:static lg:z-auto',
        'lg:w-[260px] xl:w-[280px] lg:translate-x-0',
        open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
      ].join(' ')}
        style={{
          background: 'var(--surface-container-lowest)',
          borderColor: 'color-mix(in srgb, var(--outline-variant) 20%, transparent)',
        }}>

        <div className="flex items-center justify-between px-4 py-4 border-b"
          style={{ borderColor: 'color-mix(in srgb, var(--outline-variant) 18%, transparent)' }}>
          <div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--on-surface)' }}>Neural Resonance</div>
            <div className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>AI Resonant Studio Advisor</div>
          </div>
          <button onClick={onClose}
            className="lg:hidden w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}>✕</button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scroll-thin">
          {msgs.map((msg, i) =>
            msg.fromUser ? (
              <div key={i} className="self-end text-[11px] leading-relaxed px-3 py-2.5 rounded-xl max-w-[85%]"
                style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--on-surface)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)' }}>
                {msg.text}
              </div>
            ) : msg.action ? (
              <button key={i} className="text-left text-[11px] font-semibold px-3 py-2.5 rounded-xl leading-snug transition-opacity hover:opacity-90"
                style={{ background: 'var(--primary)', color: 'var(--on-primary)', boxShadow: '0 2px 12px color-mix(in srgb, var(--primary) 30%, transparent)' }}>
                {msg.text}
              </button>
            ) : (
              <div key={i} className="text-[11px] leading-relaxed px-3 py-2.5 rounded-xl border"
                style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)', borderColor: 'color-mix(in srgb, var(--outline-variant) 20%, transparent)' }}>
                {msg.text}
              </div>
            )
          )}
          {typing && (
            <div className="text-[11px] px-3 py-2.5 rounded-xl border flex gap-1 items-center"
              style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)', borderColor: 'color-mix(in srgb, var(--outline-variant) 20%, transparent)' }}>
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1 h-1 rounded-full inline-block"
                  style={{ background: 'var(--on-surface-variant)', animation: `pulse 1s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t" style={{ borderColor: 'color-mix(in srgb, var(--outline-variant) 18%, transparent)' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
            style={{ background: 'var(--surface-container)', borderColor: 'color-mix(in srgb, var(--outline-variant) 30%, transparent)' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Ask AI Resonant…"
              className="flex-1 bg-transparent border-none outline-none text-[11px]"
              style={{ color: 'var(--on-surface)' }} />
            <button onClick={submit} className="text-sm leading-none" style={{ color: 'var(--primary)' }}>↑</button>
          </div>
        </div>
      </aside>
    </>
  )
}

// ─── Studio View ─────────────────────────────────────────────────────────────

function StudioView({ raga, playing, beat, bpm, onTogglePlay, onSeek, onDecrementBpm, onIncrementBpm, isRecording, onToggleRec }: {
  raga: Raga; playing: boolean; beat: number; bpm: number
  onTogglePlay: () => void; onSeek: (pct: number) => void
  onDecrementBpm: () => void; onIncrementBpm: () => void
  isRecording: boolean; onToggleRec: () => void
}) {
  const [aiOpen, setAiOpen] = useState(false)
  const elapsed = Math.floor(beat * (60 / bpm))
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const progressRef = useRef<HTMLDivElement>(null)

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect) return
    onSeek((e.clientX - rect.left) / rect.width)
  }

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden p-4 md:p-6 gap-0">
        {/* Raga header */}
        <div className="flex items-start gap-3 mb-4 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="text-[9px] tracking-[2.5px] uppercase font-medium mb-1"
              style={{ color: 'var(--on-surface-variant)' }}>Active Raga</div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xl md:text-2xl font-bold leading-none" style={{ color: 'var(--on-surface)' }}>{raga.name}</span>
              <span className="text-sm md:text-base font-normal" style={{ color: 'var(--on-surface-variant)' }}>· {raga.time}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setAiOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold"
              style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>psychology</span>
              AI
            </button>
            <button onClick={onToggleRec}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border-[1.5px] text-[9px] tracking-[1.5px] uppercase font-bold flex-shrink-0 cursor-pointer transition-all"
              style={{
                borderColor: isRecording ? '#ef4444' : 'var(--primary)',
                color: isRecording ? '#ef4444' : 'var(--primary)',
                background: isRecording ? 'rgba(239,68,68,0.1)' : 'transparent',
              }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
                style={{ background: isRecording ? '#ef4444' : 'var(--primary)', animation: isRecording ? 'pulse 0.8s infinite' : 'pulse 1.5s infinite' }} />
              {isRecording ? '■ Stop Rec' : 'Live Rec'}
            </button>
          </div>
        </div>

        {/* Piano card — theme-aware surface */}
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden flex flex-col justify-center p-4 md:p-5"
          style={{ background: 'var(--surface-container-low)', border: '1px solid color-mix(in srgb, var(--outline-variant) 35%, transparent)', maxHeight: 340 }}>
          <Piano raga={raga} beat={beat} />
        </div>

        {/* Controls row */}
        <div className="flex gap-3 mt-3 flex-shrink-0">
          <div className="flex-1 rounded-2xl flex flex-col items-center gap-1 py-3 px-2"
            style={{ background: 'color-mix(in srgb, var(--surface-container) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)' }}>
            <div className="text-[9px] tracking-[2px] uppercase font-medium mb-1" style={{ color: 'var(--on-surface-variant)' }}>Master Tempo</div>
            <TempoKnob bpm={bpm} onDecrement={onDecrementBpm} onIncrement={onIncrementBpm} />
          </div>
          <div className="flex-[1.4] rounded-2xl p-3 md:p-4"
            style={{ background: 'color-mix(in srgb, var(--surface-container) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] tracking-[2px] uppercase font-medium" style={{ color: 'var(--on-surface-variant)' }}>Tanpura Resonance</span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--primary)', boxShadow: '0 0 6px var(--primary)' }} />
            </div>
            <TanpuraWave playing={playing} />
          </div>
        </div>

        {/* Transport */}
        <div className="flex items-center gap-3 mt-3 pt-3 flex-shrink-0 border-t"
          style={{ borderColor: 'color-mix(in srgb, var(--outline-variant) 20%, transparent)' }}>
          <button className="text-lg leading-none" style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}>⏮</button>
          <button onClick={onTogglePlay}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] flex-shrink-0 transition-all"
            style={{
              background: playing ? 'var(--primary)' : 'var(--surface-container-high)',
              border: 'none', cursor: 'pointer',
              color: playing ? 'var(--on-primary)' : 'var(--on-surface)',
              boxShadow: playing ? '0 0 16px color-mix(in srgb, var(--primary) 40%, transparent)' : 'none',
            }}>{playing ? '⏸' : '▶'}</button>
          <button className="text-lg leading-none" style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}>⏭</button>
          <span className="text-[11px] font-mono flex-shrink-0" style={{ color: 'var(--on-surface-variant)' }}>{fmt(elapsed)} / 40:00</span>
          {/* Scrubbable progress bar */}
          <div ref={progressRef} onClick={handleSeekClick}
            className="flex-1 relative h-[4px] rounded-full cursor-pointer"
            style={{ background: 'color-mix(in srgb, var(--outline-variant) 40%, transparent)' }}>
            <div className="absolute left-0 top-0 h-full rounded-full transition-all"
              style={{ width: `${Math.min((elapsed / 2400) * 100, 100)}%`, background: 'var(--primary)' }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full transition-all"
              style={{ left: `calc(${Math.min((elapsed / 2400) * 100, 100)}% - 5px)`, background: 'var(--primary)', border: '2px solid var(--background)', boxShadow: '0 0 4px color-mix(in srgb, var(--primary) 40%, transparent)' }} />
          </div>
          <span className="text-[9px] uppercase tracking-[1px] flex-shrink-0 hidden sm:block" style={{ color: 'var(--on-surface-variant)' }}>{raga.name}</span>
        </div>
      </div>

      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  )
}

// ─── Library View ─────────────────────────────────────────────────────────────

function LibraryView({ activeRagaName, onExplore }: {
  activeRagaName: string
  onExplore: (ragaName: string) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8 scroll-thin">
      <div className="flex justify-between items-start mb-2 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--on-surface)' }}>Raga Library</h1>
          <p className="text-[12px] mt-2 max-w-md leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
            The Daylight Practice collection focuses on ragas traditionally performed during the transition from dawn to high sun.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-[1px] uppercase flex-shrink-0"
          style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--primary)' }} />
          {activeRagaName}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {LIBRARY_RAGAS.map((r) => {
          const isActive = r.name.toLowerCase() === activeRagaName.toLowerCase() ||
            activeRagaName.toLowerCase().startsWith(r.name.toLowerCase())
          return (
          <div key={r.name}
            className="rounded-2xl p-5 flex flex-col gap-2 transition-all hover:shadow-lg"
            style={{
              background: 'var(--surface)',
              border: `1px solid ${isActive ? 'color-mix(in srgb, var(--primary) 40%, transparent)' : 'color-mix(in srgb, var(--outline-variant) 35%, transparent)'}`,
              boxShadow: isActive ? '0 0 0 1px color-mix(in srgb, var(--primary) 15%, transparent)' : 'none',
            }}>
            <div className="w-7 h-[3px] rounded-full mb-1" style={{ background: r.hex }} />
            <div className="text-[20px] font-bold tracking-tight" style={{ color: 'var(--on-surface)' }}>{r.name}</div>
            <div className="text-[10px] tracking-wide font-mono" style={{ color: 'var(--on-surface-variant)' }}>{r.scale}</div>
            <div className="text-[12px] flex-1" style={{ color: 'var(--on-surface-variant)' }}>{r.mood}</div>
            <div className="text-[8px] tracking-[1.5px] uppercase font-semibold mt-1" style={{ color: r.hex }}>{r.thaat}</div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => onExplore(r.name)}
                className="flex-1 py-2 rounded-xl text-[10px] font-bold tracking-[0.8px] uppercase cursor-pointer transition-opacity hover:opacity-90"
                style={{ background: 'var(--primary)', color: 'var(--on-primary)', border: 'none' }}>
                {isActive ? '✓ Active' : 'Explore'}
              </button>
              <button className="flex-1 py-2 rounded-xl text-[10px] font-semibold tracking-[0.8px] uppercase cursor-pointer"
                style={{ background: 'transparent', color: 'var(--on-surface-variant)', border: '1px solid color-mix(in srgb, var(--outline-variant) 55%, transparent)' }}>Browse</button>
            </div>
          </div>
          )
        })}
      </div>

      {/* Deep Dive — cinematic card, always dark */}
      <div className="mt-6 rounded-2xl overflow-hidden relative flex items-center"
        style={{ minHeight: 160, background: 'linear-gradient(135deg, #0d1117 0%, color-mix(in srgb, var(--primary-container) 80%, #0d1117 20%) 100%)', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 50%, color-mix(in srgb, var(--primary) 10%, transparent), transparent 70%)' }} />
        <div className="relative z-10 p-6 md:p-8">
          <div className="text-[9px] tracking-[2.5px] uppercase font-bold mb-2" style={{ color: 'var(--primary)' }}>Deep Dive</div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2" style={{ color: '#f0f6ff' }}>Ahir Bhairav</h2>
          <p className="text-[12px] max-w-sm leading-relaxed mb-5" style={{ color: 'rgba(200,220,255,0.65)' }}>
            Intensive study exploring the unique mixture of Bhairav and Kafi. Master the delicate movement between their characteristic phrases.
          </p>
          <button className="px-5 py-2 rounded-full text-[11px] font-bold tracking-[0.5px] cursor-pointer"
            style={{ background: 'var(--primary)', color: 'var(--on-primary)', border: 'none' }}>Start Deep Dive →</button>
        </div>
      </div>
    </div>
  )
}

// ─── Journal View ─────────────────────────────────────────────────────────────

function JournalView() {
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8 scroll-thin">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--on-surface)' }}>Practice Journal</h1>
      <p className="text-[12px] mb-6 leading-relaxed max-w-xl" style={{ color: 'var(--on-surface-variant)' }}>
        A chronological record of your musical evolution. Review your raga history, track your mastery, and assess the depth of your focus.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="sm:col-span-2 rounded-2xl p-5"
          style={{ background: 'var(--surface)', border: '1px solid color-mix(in srgb, var(--outline-variant) 35%, transparent)' }}>
          <div className="text-[9px] tracking-[2px] uppercase font-medium mb-2" style={{ color: 'var(--on-surface-variant)' }}>Master Progression</div>
          <div className="text-[15px] font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>Yaman & Bhairav</div>
          <div className="text-[11px] mb-4" style={{ color: 'var(--on-surface-variant)' }}>Primary focus for last 10 days. 12 hours logged.</div>
          <div className="h-1 rounded-full relative" style={{ background: 'color-mix(in srgb, var(--outline-variant) 40%, transparent)' }}>
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: '72%', background: 'var(--primary)' }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px]" style={{ color: 'var(--on-surface-variant)' }}>Progress</span>
            <span className="text-[9px] font-semibold" style={{ color: 'var(--primary)' }}>72%</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-4">
          {[{ label: 'Total Practice', val: '128', unit: 'hrs', accent: false }, { label: 'Streak', val: '12', unit: 'days', accent: true }].map((s) => (
            <div key={s.label} className="rounded-2xl p-5 flex flex-col"
              style={{ background: 'var(--surface)', border: '1px solid color-mix(in srgb, var(--outline-variant) 35%, transparent)' }}>
              <div className="text-[9px] tracking-[2px] uppercase font-medium mb-3" style={{ color: 'var(--on-surface-variant)' }}>{s.label}</div>
              <div className="mt-auto flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight leading-none" style={{ color: s.accent ? 'var(--primary)' : 'var(--on-surface)' }}>{s.val}</span>
                <span className="text-[13px]" style={{ color: 'var(--on-surface-variant)' }}>{s.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid color-mix(in srgb, var(--outline-variant) 35%, transparent)' }}>
        <div className="flex justify-between items-center px-5 py-4 border-b"
          style={{ borderColor: 'color-mix(in srgb, var(--outline-variant) 25%, transparent)' }}>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--on-surface)' }}>Session History</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded-lg text-[10px] cursor-pointer"
              style={{ background: 'transparent', color: 'var(--on-surface-variant)', border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)' }}>← More</button>
            <button className="px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
              style={{ background: 'var(--primary)', color: 'var(--on-primary)', border: 'none' }}>+ New</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b" style={{ borderColor: 'color-mix(in srgb, var(--outline-variant) 18%, transparent)' }}>
                {['Date', 'Raga / Focus', 'Duration', 'Accuracy', 'Notes'].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-[9px] tracking-[1.2px] uppercase font-medium"
                    style={{ color: 'var(--on-surface-variant)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SESSIONS.map((s, i) => (
                <tr key={i} className="border-b last:border-b-0"
                  style={{ borderColor: 'color-mix(in srgb, var(--outline-variant) 15%, transparent)' }}>
                  <td className="px-5 py-4 text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>{s.date}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--primary)' }} />
                      <span className="text-[12px] font-semibold" style={{ color: 'var(--on-surface)' }}>{s.raga}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>{s.dur}</td>
                  <td className="px-5 py-4">
                    <div className="h-[3px] w-16 rounded-full mb-1" style={{ background: 'color-mix(in srgb, var(--outline-variant) 40%, transparent)' }}>
                      <div className="h-full rounded-full" style={{ width: `${s.acc}%`, background: 'var(--primary)' }} />
                    </div>
                    <span className="text-[9px]" style={{ color: 'var(--on-surface-variant)' }}>{s.acc}%</span>
                  </td>
                  <td className="px-5 py-4 text-[11px] max-w-[200px] truncate" style={{ color: 'var(--on-surface-variant)' }}>{s.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'studio',  label: 'Studio',  icon: 'piano' },
  { id: 'library', label: 'Library', icon: 'library_music' },
  { id: 'journal', label: 'Journal', icon: 'menu_book' },
]

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function PreviewPage() {
  const { theme, toggle } = useTheme()
  const [tab, setTab] = useState<Tab>('studio')
  const [subTabIdx, setSubTabIdx] = useState(0)
  const [ragaIdx, setRagaIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [beat, setBeat] = useState(0)
  const [bpm, setBpm] = useState(98)
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const raga = RAGAS[ragaIdx]

  // Reset sub-tab index when main tab changes
  const handleTabChange = (t: Tab) => { setTab(t); setSubTabIdx(0) }

  const handleToggleRec = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mr = new MediaRecorder(stream)
        mediaRecorderRef.current = mr
        mr.onstop = () => stream.getTracks().forEach(t => t.stop())
        mr.start()
        setIsRecording(true)
      } catch {
        alert('Microphone access denied or unavailable.')
      }
    }
  }, [isRecording])

  const handleExplore = useCallback((ragaName: string) => {
    const idx = RAGAS.findIndex(r => r.name.toLowerCase() === ragaName.toLowerCase())
    if (idx !== -1) setRagaIdx(idx)
    handleTabChange('studio')
  }, [])

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setBeat((b) => b + 1), (60 / bpm) * 1000)
    return () => clearInterval(id)
  }, [playing, bpm])

  // Spacebar toggles play/pause
  const handleTogglePlay = useCallback(() => setPlaying(p => !p), [])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        handleTogglePlay()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleTogglePlay])

  const handleSeek = (pct: number) => setBeat(Math.floor(pct * 2400 * bpm / 60))
  const handleDecrementBpm = () => setBpm(b => Math.max(40, b - 2))
  const handleIncrementBpm = () => setBpm(b => Math.min(200, b + 2))

  const subTabs: Record<Tab, string[]> = {
    studio: ['Studio', 'Archive', 'Session'],
    library: ['Browse', 'Favourites', 'Recent'],
    journal: ['Log', 'Analytics', 'Goals'],
  }

  return (
    <>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
      <div className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
        style={{ background: 'var(--background)', color: 'var(--on-surface)', fontFamily: 'var(--font-dm-sans, var(--font-manrope, system-ui))' }}>

        {/* ── Navbar ── */}
        <nav className="flex items-stretch flex-shrink-0 border-b pl-4 md:pl-5"
          style={{ height: 48, background: 'var(--surface-container-lowest)', borderColor: 'color-mix(in srgb, var(--outline-variant) 20%, transparent)' }}>

          <div className="flex items-center pr-4 md:pr-6 flex-shrink-0">
            <span className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--primary)' }}>Saptaswara</span>
          </div>
          <div className="w-px my-2.5 flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--outline-variant) 25%, transparent)' }} />

          {/* Persistent active-raga pill — always visible */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--primary)' }} />
            <span className="text-[10px] font-semibold tracking-[0.5px]" style={{ color: 'var(--primary)' }}>{raga.name}</span>
          </div>
          <div className="hidden sm:block w-px my-2.5 flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--outline-variant) 25%, transparent)' }} />

          {/* Sub-tabs — active index tracked */}
          <div className="flex items-stretch overflow-x-auto scrollbar-none">
            {subTabs[tab].map((t, i) => (
              <button key={t} onClick={() => setSubTabIdx(i)}
                className="px-3 md:px-4 flex-shrink-0 text-[10px] tracking-[1.3px] uppercase font-semibold transition-colors"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: i === subTabIdx ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                  borderBottom: i === subTabIdx ? '2px solid var(--primary)' : '2px solid transparent',
                }}>{t}</button>
            ))}
          </div>

          <div className="flex-1" />

          {tab === 'studio' && (
            <div className="hidden sm:flex items-center gap-1.5 pr-3">
              {RAGAS.map((r, i) => (
                <button key={r.name} onClick={() => setRagaIdx(i)}
                  className="px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer"
                  style={{
                    background: i === ragaIdx ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'transparent',
                    border: i === ragaIdx ? '1px solid var(--primary)' : '1px solid transparent',
                    color: i === ragaIdx ? 'var(--primary)' : 'var(--on-surface-variant)',
                    fontWeight: i === ragaIdx ? 650 : 400,
                  }}>{r.name}</button>
              ))}
            </div>
          )}

          <div className="flex items-center pr-3 md:pr-4">
            <button onClick={toggle}
              className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: 'var(--surface-container)', border: '1px solid color-mix(in srgb, var(--outline-variant) 35%, transparent)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--on-surface-variant)' }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
          </div>
        </nav>

        {tab === 'studio' && (
          <div className="flex sm:hidden items-center gap-2 px-4 py-2 border-b overflow-x-auto scrollbar-none"
            style={{ background: 'var(--surface-container-lowest)', borderColor: 'color-mix(in srgb, var(--outline-variant) 20%, transparent)', flexShrink: 0 }}>
            {RAGAS.map((r, i) => (
              <button key={r.name} onClick={() => setRagaIdx(i)}
                className="px-3 py-1 rounded-lg text-[11px] flex-shrink-0 cursor-pointer"
                style={{
                  background: i === ragaIdx ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'transparent',
                  border: i === ragaIdx ? '1px solid var(--primary)' : '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)',
                  color: i === ragaIdx ? 'var(--primary)' : 'var(--on-surface-variant)',
                  fontWeight: i === ragaIdx ? 650 : 400,
                }}>{r.name}</button>
            ))}
          </div>
        )}

        {/* ── Content ── */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {tab === 'studio' && (
            <StudioView
              raga={raga} playing={playing} beat={beat} bpm={bpm}
              onTogglePlay={handleTogglePlay} onSeek={handleSeek}
              onDecrementBpm={handleDecrementBpm} onIncrementBpm={handleIncrementBpm}
              isRecording={isRecording} onToggleRec={handleToggleRec}
            />
          )}
          {tab === 'library' && <LibraryView activeRagaName={raga.name} onExplore={handleExplore} />}
          {tab === 'journal' && <JournalView />}
        </div>

        {/* ── Bottom Nav ── */}
        <nav className="flex items-stretch flex-shrink-0 border-t"
          style={{ height: 56, background: 'var(--surface-container-lowest)', borderColor: 'color-mix(in srgb, var(--outline-variant) 20%, transparent)' }}>
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => handleTabChange(t.id)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
                style={{
                  background: 'none', border: 'none',
                  color: active ? 'var(--primary)' : 'var(--on-surface-variant)',
                  borderTop: active ? '2px solid var(--primary)' : '2px solid transparent',
                  paddingTop: 6,
                }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{t.icon}</span>
                <span className="text-[9px] tracking-[0.8px] uppercase" style={{ fontWeight: active ? 700 : 400 }}>{t.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}
