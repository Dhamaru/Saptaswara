'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/components/ThemeProvider'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'studio' | 'library' | 'journal'

interface Raga {
  name: string
  time: string
  tradition: string
  mood: string
  aroha: string[]
  avaroha: string[]
  // which white-key indices (0=C,1=D,2=E,3=F,4=G,5=A,6=B) are in raga (repeating per octave)
  whiteActive: number[]
  // which black-key slot indices (0=C#,1=D#,2=F#,3=G#,4=A#) are in raga
  blackActive: number[]
}

// ─── Data ────────────────────────────────────────────────────────────────────

const RAGAS: Raga[] = [
  {
    name: 'Bhairavi', time: 'Daylight Practice', tradition: 'Hindustani',
    mood: 'Peaceful, Serene',
    aroha:   ['Sa', 're', 'ga', 'Ma', 'Pa', 'dha', 'ni', "Sa'"],
    avaroha: ["Sa'", 'ni', 'dha', 'Pa', 'Ma', 'ga', 're', 'Sa'],
    whiteActive: [0, 3, 4],            // C, F, G
    blackActive: [0, 1, 3, 4],         // C#, D#, G#, A#
  },
  {
    name: 'Yaman', time: 'Evening', tradition: 'Hindustani',
    mood: 'Romantic yearning',
    aroha:   ['Sa', 'Re', 'Ga', 'ma', 'Pa', 'Dha', 'Ni', "Sa'"],
    avaroha: ["Sa'", 'Ni', 'Dha', 'Pa', 'ma', 'Ga', 'Re', 'Sa'],
    whiteActive: [0, 1, 2, 4, 5, 6],  // C, D, E, G, A, B
    blackActive: [2],                  // F#
  },
  {
    name: 'Todi', time: 'Morning', tradition: 'Hindustani',
    mood: 'Wistful Adoration',
    aroha:   ['Sa', 're', 'ga', 'Ma', 'Pa', 'dha', 'Ni', "Sa'"],
    avaroha: ["Sa'", 'Ni', 'dha', 'Pa', 'Ma', 'ga', 're', 'Sa'],
    whiteActive: [0, 3, 4, 6],         // C, F, G, B
    blackActive: [0, 1, 3],            // C#, D#, G#
  },
]

const LIBRARY_RAGAS = [
  { name: 'Yaman',   scale: 'Sa Re Ga ♯4 Pa Dha Ni', mood: 'Romantic yearning',   thaat: 'Kalyan',  color: '#2DD4BF' },
  { name: 'Bhairav', scale: 'Sa ♭2 Ga Ma Pa ♭6 Ni',  mood: 'Peaceful, Serene',    thaat: 'Bhairav', color: '#60A5FA' },
  { name: 'Todi',    scale: 'Sa ♭2 ♭3 ♯4 Pa ♭6 Ni',  mood: 'Wistful Adoration',  thaat: 'Todi',    color: '#A78BFA' },
]

const SESSION_HISTORY = [
  { date: 'Oct 24, 2023', raga: 'Bhairav',  dur: '80 min',  acc: 78, note: 'Focus on komal Re in lower octave transitions…' },
  { date: 'Oct 23, 2023', raga: 'Tanas',    dur: '40 min',  acc: 92, note: 'Flat swara at 80 BPM, taans accurately placed…' },
  { date: 'Oct 22, 2023', raga: 'Bhoopali', dur: '120 min', acc: 67, note: 'Full exploration of formal Yaman and Bhairav…' },
]

const AI_MSGS = [
  { text: "I'm detecting a slight rhythmic shift in your middle octave transitions. Would you like me to stabilize the Tanpura drone to match your current breath cycle?" },
  { text: 'Adjust resonance for more sustain', action: true },
  { text: 'Resonance depth increased by 15%. Your vadi swara (Madhyam) is now harmonically emphasized.' },
]

// ─── Piano ────────────────────────────────────────────────────────────────────
// 2 octaves, 14 white keys, 10 black keys
// ViewBox: 0 0 840 200  → WW=60, WH=196, BW=36, BH=120

const WW = 60, WH = 196, BW = 36, BH = 120

// White key indices per octave: 0=C 1=D 2=E 3=F 4=G 5=A 6=B
// Black key slot x-offsets within an octave (left edge of black key)
// Octave x-start = oct * 7 * WW
const BLACK_SLOTS = [
  { slot: 0, xOff: WW * 0.65 },       // C#
  { slot: 1, xOff: WW * 1.65 },       // D#
  { slot: 2, xOff: WW * 3.65 },       // F#
  { slot: 3, xOff: WW * 4.65 },       // G#
  { slot: 4, xOff: WW * 5.65 },       // A#
]

function Piano({ raga, beat }: { raga: Raga; beat: number }) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${WW * 14} ${WH + 10}`}
        style={{ width: '100%', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* White keys — always cream/white regardless of theme */}
        {Array.from({ length: 14 }, (_, i) => {
          const noteInOct = i % 7
          const isActive = raga.whiteActive.includes(noteInOct)
          return (
            <g key={`wk-${i}`}>
              <rect
                x={i * WW + 1}
                y={0}
                width={WW - 2}
                height={WH}
                rx={4}
                fill={isActive ? '#CCFBF1' : '#F8FAFA'}
                stroke="#D1D9D9"
                strokeWidth={1}
              />
              {/* Active note dot */}
              {isActive && (
                <circle
                  cx={i * WW + WW / 2}
                  cy={WH - 10}
                  r={4}
                  fill="var(--primary)"
                  opacity={0.9}
                />
              )}
            </g>
          )
        })}

        {/* Black keys — always dark regardless of theme */}
        {Array.from({ length: 2 }, (_, oct) =>
          BLACK_SLOTS.map(({ slot, xOff }) => {
            const isActive = raga.blackActive.includes(slot)
            const x = oct * 7 * WW + xOff
            return (
              <rect
                key={`bk-${oct}-${slot}`}
                x={x}
                y={0}
                width={BW}
                height={BH}
                rx={3}
                fill={isActive ? '#0D9488' : '#1C2422'}
              />
            )
          })
        )}
      </svg>

      {/* Sargam notation below keys */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
        flexWrap: 'wrap',
      }}>
        {raga.aroha.map((s, i) => {
          const active = i === beat % raga.aroha.length
          return (
            <span key={i} style={{
              fontSize: active ? 13 : 10,
              fontWeight: active ? 700 : 400,
              color: active ? 'var(--primary)' : 'var(--on-surface-variant)',
              letterSpacing: 0.3,
              transition: 'all 0.15s',
            }}>
              {s}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tempo Knob ───────────────────────────────────────────────────────────────

function TempoKnob({ bpm }: { bpm: number }) {
  const SIZE = 88, R = 31, CX = 44, CY = 44
  const startDeg = -225, rangeDeg = 270
  const pct = Math.min(bpm / 200, 1)
  const endDeg = startDeg + rangeDeg * pct
  const toXY = (deg: number) => {
    const rad = (deg * Math.PI) / 180
    return { x: +(CX + R * Math.cos(rad)).toFixed(3), y: +(CY + R * Math.sin(rad)).toFixed(3) }
  }
  const s = toXY(startDeg), e = toXY(endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={CX} cy={CY} r={R} fill="none"
          stroke="color-mix(in srgb, var(--outline-variant) 50%, transparent)"
          strokeWidth={4} strokeLinecap="round"
        />
        <path
          d={`M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`}
          fill="none" stroke="var(--primary)" strokeWidth={4} strokeLinecap="round"
        />
        <text x={CX} y={CY + 6} textAnchor="middle"
          fontSize={17} fontWeight={700} fill="var(--on-surface)"
          fontFamily="var(--font-dm-sans, system-ui)">
          {bpm}
        </text>
      </svg>
      <div style={{
        display: 'flex', gap: 14, fontSize: 9,
        color: 'var(--on-surface-variant)', letterSpacing: 0.8,
        textTransform: 'uppercase',
      }}>
        <span>Andante</span>
        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Moderate</span>
        <span>Allegro</span>
      </div>
    </div>
  )
}

// ─── Waveform Canvas ──────────────────────────────────────────────────────────

function TanpuraWave({ playing }: { playing: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const phase = useRef(0)
  const raf = useRef<number>()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const draw = () => {
      const { width: w, height: h } = canvas
      ctx.clearRect(0, 0, w, h)
      ctx.beginPath()
      for (let x = 0; x <= w; x++) {
        const t = x / w
        const y = h / 2
          + Math.sin(t * Math.PI * 5 + phase.current) * h * 0.28
          + Math.sin(t * Math.PI * 9 + phase.current * 1.4) * h * 0.1
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      // fill below
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath()
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, 'rgba(45,212,191,0.45)')
      grad.addColorStop(1, 'rgba(45,212,191,0.02)')
      ctx.fillStyle = grad
      ctx.fill()
      // line
      ctx.beginPath()
      for (let x = 0; x <= w; x++) {
        const t = x / w
        const y = h / 2
          + Math.sin(t * Math.PI * 5 + phase.current) * h * 0.28
          + Math.sin(t * Math.PI * 9 + phase.current * 1.4) * h * 0.1
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = '#2DD4BF'
      ctx.lineWidth = 1.5
      ctx.stroke()
      if (playing) phase.current += 0.035
      raf.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf.current!)
  }, [playing])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <canvas ref={ref} width={280} height={52}
        style={{ width: '100%', height: 52, display: 'block', borderRadius: 6 }}
      />
      {/* Resonance slider */}
      <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'color-mix(in srgb, var(--outline-variant) 50%, transparent)' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '62%', background: 'var(--primary)', borderRadius: 2 }} />
        <div style={{
          position: 'absolute', left: 'calc(62% - 6px)', top: '50%', transform: 'translateY(-50%)',
          width: 12, height: 12, borderRadius: '50%',
          background: 'var(--primary)', boxShadow: '0 0 0 2px var(--surface-container-low)',
        }} />
      </div>
    </div>
  )
}

// ─── Studio View ──────────────────────────────────────────────────────────────

function StudioView({
  raga, playing, beat, bpm, onTogglePlay,
}: {
  raga: Raga; playing: boolean; beat: number; bpm: number; onTogglePlay: () => void
}) {
  const elapsed = Math.floor(beat * (60 / bpm))
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

      {/* ── Main content ── */}
      <div style={{
        flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column',
        padding: '18px 24px 16px',
        gap: 0,
        overflow: 'hidden',
      }}>

        {/* Raga header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16, flexShrink: 0 }}>
          <div>
            <div style={{
              fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase',
              color: 'var(--on-surface-variant)', marginBottom: 5, fontWeight: 500,
            }}>Active Raga</div>
            <div style={{ fontSize: 24, fontWeight: 650, color: 'var(--on-surface)', lineHeight: 1 }}>
              {raga.name}
              <span style={{ color: 'var(--on-surface-variant)', fontWeight: 400, fontSize: 18 }}> · {raga.time}</span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 12px', borderRadius: 20,
              border: '1.5px solid var(--primary)',
              fontSize: 9, letterSpacing: 1.5, fontWeight: 700,
              color: 'var(--primary)', textTransform: 'uppercase',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--primary)', animation: 'pulse 1.5s infinite',
                display: 'inline-block',
              }} />
              Live Rec
            </div>
          </div>
        </div>

        {/* Piano */}
        <div style={{
          flex: 1, minHeight: 0, maxHeight: 340,
          borderRadius: 16,
          background: '#EEF2F2',
          border: '1px solid #D4DCDC',
          padding: '16px 16px 16px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <Piano raga={raga} beat={beat} />
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', gap: 14, marginTop: 12, flexShrink: 0 }}>
          {/* Tempo */}
          <div style={{
            flex: 1,
            borderRadius: 14,
            background: 'color-mix(in srgb, var(--surface-container) 60%, transparent)',
            border: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)',
            padding: '12px 14px 10px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: 6, fontWeight: 500 }}>
              Master Tempo
            </div>
            <TempoKnob bpm={bpm} />
          </div>

          {/* Tanpura */}
          <div style={{
            flex: 1.4,
            borderRadius: 14,
            background: 'color-mix(in srgb, var(--surface-container) 60%, transparent)',
            border: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)',
            padding: '12px 16px 10px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 500 }}>
                Tanpura Resonance
              </span>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--primary)', display: 'inline-block',
                boxShadow: '0 0 6px var(--primary)',
              }} />
            </div>
            <TanpuraWave playing={playing} />
          </div>
        </div>

        {/* Transport */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          marginTop: 10, paddingTop: 10, flexShrink: 0,
          borderTop: '1px solid color-mix(in srgb, var(--outline-variant) 20%, transparent)',
        }}>
          <button style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>⏮</button>
          <button onClick={onTogglePlay} style={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            background: playing ? 'var(--primary)' : 'var(--surface-container-high)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: playing ? 'var(--on-primary)' : 'var(--on-surface)',
            transition: 'all 0.2s', boxShadow: playing ? '0 0 16px color-mix(in srgb, var(--primary) 40%, transparent)' : 'none',
          }}>
            {playing ? '⏸' : '▶'}
          </button>
          <button style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>⏭</button>

          <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontFamily: 'monospace', flexShrink: 0 }}>
            {fmt(elapsed)} / 40:00
          </span>

          <div style={{ flex: 1, position: 'relative', height: 3, borderRadius: 2, background: 'color-mix(in srgb, var(--outline-variant) 40%, transparent)', cursor: 'pointer' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${Math.min((elapsed / 2400) * 100, 100)}%`,
              background: 'var(--primary)', borderRadius: 2,
            }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>🔈</span>
            <div style={{ width: 56, height: 3, borderRadius: 2, background: 'color-mix(in srgb, var(--outline-variant) 40%, transparent)' }}>
              <div style={{ height: '100%', width: '70%', background: 'var(--on-surface-variant)', borderRadius: 2 }} />
            </div>
          </div>

          <span style={{ fontSize: 9, color: 'var(--on-surface-variant)', letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0 }}>
            {raga.name}
          </span>
        </div>
      </div>

      {/* ── AI Panel ── */}
      <div style={{
        width: 272, flexShrink: 0,
        borderLeft: '1px solid color-mix(in srgb, var(--outline-variant) 20%, transparent)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--surface-container-lowest)',
      }}>
        {/* Panel header */}
        <div style={{
          padding: '18px 16px 14px',
          borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 18%, transparent)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--on-surface)', letterSpacing: -0.2 }}>Neural Resonance</div>
          <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginTop: 2 }}>AI Resonant Studio Advisor</div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '14px 12px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {AI_MSGS.map((msg, i) =>
            msg.action ? (
              <button key={i} style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'var(--primary)', color: 'var(--on-primary)',
                border: 'none', fontSize: 11, fontWeight: 600,
                letterSpacing: 0.2, cursor: 'pointer',
                textAlign: 'left', lineHeight: 1.4,
                boxShadow: '0 2px 12px color-mix(in srgb, var(--primary) 30%, transparent)',
                transition: 'opacity 0.15s',
              }}>
                {msg.text}
              </button>
            ) : (
              <div key={i} style={{
                padding: '10px 12px', borderRadius: 10,
                background: 'var(--surface-container)',
                border: '1px solid color-mix(in srgb, var(--outline-variant) 20%, transparent)',
                fontSize: 11, lineHeight: 1.55, color: 'var(--on-surface-variant)',
              }}>
                {msg.text}
              </div>
            )
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: '10px 12px 14px',
          borderTop: '1px solid color-mix(in srgb, var(--outline-variant) 18%, transparent)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px',
            borderRadius: 10,
            background: 'var(--surface-container)',
            border: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)',
          }}>
            <input
              placeholder="Ask AI Resonant…"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 11, color: 'var(--on-surface)',
              }}
            />
            <button style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--primary)', fontSize: 14, lineHeight: 1, padding: 0,
            }}>↑</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Library View ─────────────────────────────────────────────────────────────

function LibraryView() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--on-surface)', margin: 0, letterSpacing: -0.5 }}>
            Raga Library
          </h1>
          <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', margin: '8px 0 0', maxWidth: 480, lineHeight: 1.6 }}>
            The Daylight Practice collection focuses on ragas traditionally performed during the transition from dawn to high sun.
          </p>
        </div>
        <button style={{
          padding: '6px 18px', borderRadius: 20,
          background: 'var(--primary)', color: 'var(--on-primary)',
          border: 'none', fontSize: 10, fontWeight: 700,
          letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
          flexShrink: 0, marginTop: 4,
        }}>Active</button>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginTop: 28 }}>
        {LIBRARY_RAGAS.map((r) => (
          <div key={r.name} style={{
            borderRadius: 18,
            background: 'var(--surface)',
            border: '1px solid color-mix(in srgb, var(--outline-variant) 35%, transparent)',
            padding: '22px 20px 18px',
            display: 'flex', flexDirection: 'column', gap: 6,
            transition: 'box-shadow 0.2s',
          }}>
            {/* Color accent line */}
            <div style={{ width: 28, height: 3, borderRadius: 2, background: r.color, marginBottom: 4 }} />
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--on-surface)', letterSpacing: -0.3 }}>{r.name}</div>
            <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontFamily: 'monospace', letterSpacing: 0.8 }}>
              {r.scale}
            </div>
            <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', flex: 1, marginTop: 2 }}>{r.mood}</div>
            <div style={{
              fontSize: 8, color: r.color, letterSpacing: 1.5,
              textTransform: 'uppercase', fontWeight: 600, marginTop: 4,
            }}>{r.thaat}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button style={{
                flex: 1, padding: '8px 0', borderRadius: 9,
                background: 'var(--primary)', color: 'var(--on-primary)',
                border: 'none', fontSize: 10, fontWeight: 700,
                letterSpacing: 0.8, textTransform: 'uppercase', cursor: 'pointer',
              }}>Explore</button>
              <button style={{
                flex: 1, padding: '8px 0', borderRadius: 9,
                background: 'transparent', color: 'var(--on-surface-variant)',
                border: '1px solid color-mix(in srgb, var(--outline-variant) 55%, transparent)',
                fontSize: 10, fontWeight: 600,
                letterSpacing: 0.8, textTransform: 'uppercase', cursor: 'pointer',
              }}>Browse</button>
            </div>
          </div>
        ))}
      </div>

      {/* Deep Dive */}
      <div style={{
        marginTop: 28, borderRadius: 20, overflow: 'hidden', position: 'relative',
        minHeight: 180, display: 'flex', alignItems: 'center',
        background: 'linear-gradient(135deg, #0a1a18 0%, #112422 60%, #1a0e00 100%)',
        border: '1px solid color-mix(in srgb, var(--primary) 15%, transparent)',
      }}>
        {/* Subtle glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 70% 50%, color-mix(in srgb, var(--primary) 8%, transparent), transparent 70%)',
        }} />
        <div style={{ position: 'relative', padding: '28px 32px', zIndex: 1, maxWidth: 520 }}>
          <div style={{
            fontSize: 9, color: 'var(--primary)', letterSpacing: 2.5,
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 10,
          }}>Deep Dive</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 10px', letterSpacing: -0.3 }}>
            Ahir Bhairav
          </h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: '0 0 20px', lineHeight: 1.6 }}>
            An intensive study module exploring the unique mixture of Bhairav and Kafi. Master the delicate movement between their characteristic phrases.
          </p>
          <button style={{
            padding: '9px 22px', borderRadius: 22,
            background: 'var(--primary)', color: 'var(--on-primary)',
            border: 'none', fontSize: 11, fontWeight: 700,
            letterSpacing: 0.5, cursor: 'pointer',
          }}>Start Deep Dive →</button>
        </div>
      </div>
    </div>
  )
}

// ─── Journal View ─────────────────────────────────────────────────────────────

function JournalView() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
      <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--on-surface)', margin: '0 0 6px', letterSpacing: -0.5 }}>
        Practice Journal
      </h1>
      <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', margin: '0 0 28px', lineHeight: 1.6 }}>
        A chronological record of your musical evolution. Review your raga history, track your mastery, and assess the depth of your focus.
      </p>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Master progression */}
        <div style={{
          borderRadius: 16, padding: '20px 22px',
          background: 'var(--surface)',
          border: '1px solid color-mix(in srgb, var(--outline-variant) 35%, transparent)',
        }}>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 500, marginBottom: 8 }}>
            Master Progression
          </div>
          <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--on-surface)', marginBottom: 4 }}>Yaman & Bhairav</div>
          <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginBottom: 14, lineHeight: 1.4 }}>
            Primary focus for last 10 days. 12 hours logged.
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'color-mix(in srgb, var(--outline-variant) 40%, transparent)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, width: '72%', background: 'var(--primary)', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>Progress</span>
            <span style={{ fontSize: 9, color: 'var(--primary)', fontWeight: 600 }}>72%</span>
          </div>
        </div>

        {/* Total hours */}
        <div style={{
          borderRadius: 16, padding: '20px 22px',
          background: 'var(--surface)',
          border: '1px solid color-mix(in srgb, var(--outline-variant) 35%, transparent)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 500, marginBottom: 12 }}>
            Total Practice
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 40, fontWeight: 700, color: 'var(--on-surface)', lineHeight: 1, letterSpacing: -1 }}>128</span>
            <span style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginLeft: 5, marginBottom: 4 }}>hrs</span>
          </div>
        </div>

        {/* Streak */}
        <div style={{
          borderRadius: 16, padding: '20px 22px',
          background: 'var(--surface)',
          border: '1px solid color-mix(in srgb, var(--outline-variant) 35%, transparent)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 500, marginBottom: 12 }}>
            Streak
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 40, fontWeight: 700, color: 'var(--primary)', lineHeight: 1, letterSpacing: -1 }}>12</span>
            <span style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginLeft: 5, marginBottom: 4 }}>days</span>
          </div>
        </div>
      </div>

      {/* Session history table */}
      <div style={{
        borderRadius: 18, overflow: 'hidden',
        border: '1px solid color-mix(in srgb, var(--outline-variant) 35%, transparent)',
        background: 'var(--surface)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 22px',
          borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 25%, transparent)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--on-surface)' }}>Session History</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              padding: '5px 14px', borderRadius: 7,
              background: 'transparent', color: 'var(--on-surface-variant)',
              border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
              fontSize: 10, cursor: 'pointer',
            }}>← More</button>
            <button style={{
              padding: '5px 14px', borderRadius: 7,
              background: 'var(--primary)', color: 'var(--on-primary)',
              border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer',
            }}>+ New Session</button>
          </div>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '120px 1fr 80px 80px 1fr 32px',
          padding: '10px 22px',
          fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase',
          color: 'var(--on-surface-variant)', fontWeight: 500,
          borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 18%, transparent)',
        }}>
          <span>Date</span><span>Raga / Focus</span><span>Duration</span><span>Accuracy</span><span>Notes</span><span />
        </div>

        {SESSION_HISTORY.map((s, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '120px 1fr 80px 80px 1fr 32px',
            padding: '16px 22px', alignItems: 'center',
            borderBottom: i < SESSION_HISTORY.length - 1
              ? '1px solid color-mix(in srgb, var(--outline-variant) 15%, transparent)'
              : 'none',
          }}>
            <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{s.date}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface)' }}>{s.raga}</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{s.dur}</span>
            <div>
              <div style={{ height: 3, borderRadius: 2, background: 'color-mix(in srgb, var(--outline-variant) 40%, transparent)', marginBottom: 3 }}>
                <div style={{ height: '100%', width: `${s.acc}%`, background: 'var(--primary)', borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>{s.acc}%</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{s.note}</span>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', fontSize: 16, padding: 0 }}>⋮</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Bottom Tab Bar ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'studio',  label: 'Studio',  icon: 'piano' },
  { id: 'library', label: 'Library', icon: 'library_music' },
  { id: 'journal', label: 'Journal', icon: 'menu_book' },
]

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div style={{
      height: 58, flexShrink: 0,
      display: 'flex', alignItems: 'stretch',
      borderTop: '1px solid color-mix(in srgb, var(--outline-variant) 20%, transparent)',
      background: 'var(--surface-container-lowest)',
    }}>
      {TABS.map((t) => {
        const active = tab === t.id
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 3,
            background: 'none', border: 'none', cursor: 'pointer',
            color: active ? 'var(--primary)' : 'var(--on-surface-variant)',
            borderTop: active ? '2px solid var(--primary)' : '2px solid transparent',
            transition: 'color 0.15s',
            padding: '8px 0 6px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: active ? 700 : 400 }}>
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function PreviewPage() {
  const { theme, toggle } = useTheme()
  const [tab, setTab] = useState<Tab>('studio')
  const [ragaIdx, setRagaIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [beat, setBeat] = useState(0)
  const bpm = 98

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setBeat((b) => b + 1), (60 / bpm) * 1000)
    return () => clearInterval(id)
  }, [playing])

  const raga = RAGAS[ragaIdx]

  const subTabs = {
    studio: ['Studio', 'Archive', 'Session'],
    library: ['Browse', 'Favourites', 'Recent'],
    journal: ['Log', 'Analytics', 'Goals'],
  }[tab]

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        background: 'var(--background)',
        color: 'var(--on-surface)',
        fontFamily: 'var(--font-dm-sans, var(--font-manrope, system-ui))',
        overflow: 'hidden',
      }}>

        {/* ── Navbar ── */}
        <nav style={{
          height: 48, flexShrink: 0,
          display: 'flex', alignItems: 'stretch',
          borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 20%, transparent)',
          background: 'var(--surface-container-lowest)',
          paddingLeft: 20,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', paddingRight: 24, flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 750, color: 'var(--primary)', letterSpacing: -0.5 }}>
              Saptaswara
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: 'color-mix(in srgb, var(--outline-variant) 25%, transparent)', margin: '10px 0' }} />

          {/* Sub-tabs */}
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            {subTabs.map((t, i) => (
              <button key={t} style={{
                padding: '0 18px', background: 'none', border: 'none',
                fontSize: 10, letterSpacing: 1.3, textTransform: 'uppercase', fontWeight: 600,
                color: i === 0 ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                borderBottom: i === 0 ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer', transition: 'color 0.15s',
              }}>{t}</button>
            ))}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Raga pills (studio only) */}
          {tab === 'studio' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 14 }}>
              {RAGAS.map((r, i) => (
                <button key={r.name} onClick={() => setRagaIdx(i)} style={{
                  padding: '3px 11px', borderRadius: 6,
                  background: i === ragaIdx
                    ? 'color-mix(in srgb, var(--primary) 15%, transparent)'
                    : 'transparent',
                  border: i === ragaIdx
                    ? '1px solid var(--primary)'
                    : '1px solid transparent',
                  color: i === ragaIdx ? 'var(--primary)' : 'var(--on-surface-variant)',
                  fontSize: 11, cursor: 'pointer', fontWeight: i === ragaIdx ? 650 : 400,
                  transition: 'all 0.15s',
                }}>{r.name}</button>
              ))}
            </div>
          )}

          {/* Theme toggle */}
          <div style={{ display: 'flex', alignItems: 'center', paddingRight: 16 }}>
            <button onClick={toggle} style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--surface-container)',
              border: '1px solid color-mix(in srgb, var(--outline-variant) 35%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 14,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
          </div>
        </nav>

        {/* ── Page content ── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {tab === 'studio' && (
            <StudioView
              raga={raga}
              playing={playing}
              beat={beat}
              bpm={bpm}
              onTogglePlay={() => setPlaying((p) => !p)}
            />
          )}
          {tab === 'library' && <LibraryView />}
          {tab === 'journal' && <JournalView />}
        </div>

        {/* ── Bottom nav ── */}
        <BottomNav tab={tab} setTab={setTab} />
      </div>
    </>
  )
}
