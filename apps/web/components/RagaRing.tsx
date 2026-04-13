'use client'

import React from 'react'

// Maps swara name → semitone index (0 = Sa, 7 = Pa)
const SWARA_TO_SEMI: Record<string, number> = {
  Sa: 0, re: 1, Re: 2, ga: 3, Ga: 4, Ma: 5, ma: 6,
  Pa: 7, dha: 8, Dha: 9, ni: 10, Ni: 11,
}

const SEMI_LABELS = ['Sa', 're', 'Re', 'ga', 'Ga', 'Ma', 'ma', 'Pa', 'dha', 'Dha', 'ni', 'Ni']

// Semitones that are the "fixed" pillars (Sa and Pa) — always shown even if not in raga
const PILLAR_SEMIS = new Set([0, 7])

interface RagaRingProps {
  ragaName: string
  aroha: string[]
  avaroha: string[]
  vadi?: string
  samvadi?: string
  size?: number
}

export function RagaRing({ ragaName, aroha, avaroha, vadi, samvadi, size = 200 }: RagaRingProps) {
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.42
  const dotR   = size * 0.062
  const labelOffset = size * 0.1

  // Collect active semitones from aroha + avaroha
  const allNotes = new Set([...aroha, ...avaroha])
  const activeSemis = new Set<number>()
  allNotes.forEach(n => {
    const semi = SWARA_TO_SEMI[n]
    if (semi !== undefined) activeSemis.add(semi)
  })

  const vadiSemi   = vadi    !== undefined ? SWARA_TO_SEMI[vadi]    : undefined
  const samvadiSemi = samvadi !== undefined ? SWARA_TO_SEMI[samvadi] : undefined

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle track */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={1.5} />

        {/* Aroha arc — draw connecting lines between consecutive aroha notes */}
        {aroha.length > 1 && (() => {
          const points = aroha
            .map(n => SWARA_TO_SEMI[n])
            .filter(s => s !== undefined)
            .map(s => {
              const angle = (s / 12) * 2 * Math.PI - Math.PI / 2
              return { x: cx + outerR * Math.cos(angle), y: cy + outerR * Math.sin(angle) }
            })
          const d = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
          return <path d={d} fill="none" stroke="rgba(195,192,255,0.18)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        })()}

        {/* Render each of the 12 semitone positions */}
        {SEMI_LABELS.map((label, semi) => {
          const angle = (semi / 12) * 2 * Math.PI - Math.PI / 2
          const x = cx + outerR * Math.cos(angle)
          const y = cy + outerR * Math.sin(angle)
          const lx = cx + (outerR + labelOffset) * Math.cos(angle)
          const ly = cy + (outerR + labelOffset) * Math.sin(angle)

          const isActive  = activeSemis.has(semi) || PILLAR_SEMIS.has(semi)
          const isVadi    = semi === vadiSemi
          const isSamvadi = semi === samvadiSemi
          const isPillar  = PILLAR_SEMIS.has(semi)

          // Color hierarchy: vadi > samvadi > aroha/active > pillar > dim
          const fillColor = isVadi
            ? '#f59e0b'   // amber — king note
            : isSamvadi
            ? '#60a5fa'   // blue — minister note
            : isActive
            ? '#c3c0ff'   // primary — active raga note
            : isPillar
            ? '#464554'   // dim — Sa/Pa shown but not in raga (rare)
            : '#1e1e20'   // near-invisible

          const strokeColor = isVadi
            ? 'rgba(245,158,11,0.5)'
            : isSamvadi
            ? 'rgba(96,165,250,0.5)'
            : isActive
            ? 'rgba(195,192,255,0.3)'
            : 'transparent'

          const labelOpacity = isActive || isVadi || isSamvadi ? 1 : 0.15

          return (
            <g key={semi}>
              {/* Outer ring for vadi/samvadi */}
              {(isVadi || isSamvadi) && (
                <circle
                  cx={x} cy={y} r={dotR + 3}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={1.5}
                />
              )}
              {/* Main dot */}
              <circle cx={x} cy={y} r={dotR} fill={fillColor} />
              {/* Label */}
              <text
                x={lx} y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.055}
                fontFamily="'Space Grotesk', monospace"
                fontWeight={isVadi || isSamvadi ? '700' : '400'}
                fill={isVadi ? '#f59e0b' : isSamvadi ? '#60a5fa' : isActive ? '#c3c0ff' : '#464554'}
                opacity={labelOpacity}
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* Center label */}
        <text
          x={cx} y={cy - 8}
          textAnchor="middle"
          fontSize={size * 0.07}
          fontFamily="'DM Sans', sans-serif"
          fontWeight="300"
          fill="#e5e1e4"
          opacity={0.9}
        >
          {ragaName}
        </text>
        <text
          x={cx} y={cy + 10}
          textAnchor="middle"
          fontSize={size * 0.044}
          fontFamily="'DM Mono', monospace"
          fill="#918fa0"
          opacity={0.5}
          letterSpacing={1}
        >
          {aroha.length}↑ · {avaroha.length}↓ swaras
        </text>
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 text-center">
        {[
          { color: 'bg-amber-400',  label: vadi    ?? '—', sub: 'Vadi' },
          { color: 'bg-blue-400',   label: samvadi ?? '—', sub: 'Samvadi' },
          { color: 'bg-primary/60', label: '',              sub: 'Raga note' },
        ].map(({ color, label, sub }) => (
          <div key={sub} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
            <div className="text-left">
              {label && <p className="font-label text-[9px] font-bold text-on-surface/80 leading-none">{label}</p>}
              <p className="font-mono text-[8px] text-on-surface-variant/40 uppercase tracking-widest leading-none mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
