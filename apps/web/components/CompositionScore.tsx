'use client'

import React, { useMemo } from 'react'
import { stripOctave, getVarjyaNotes } from '@/lib/ragaUtils'

interface StepEvent {
  label: string
  velocity: number
}

interface CompositionScoreProps {
  sequence: (StepEvent | null)[]
  aroha?: string[]
  avaroha?: string[]
  vadi?: string
  samvadi?: string
  ragaName?: string
}

interface ScoreBreakdown {
  total: number
  inRaga: number
  varjya: number
  vadiUsed: boolean
  samvadiUsed: boolean
  uniqueSwaras: number
  score: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  label: string
}

function computeScore(
  sequence: (StepEvent | null)[],
  aroha: string[],
  avaroha: string[],
  vadi?: string,
  samvadi?: string,
): ScoreBreakdown | null {
  const filled = sequence.filter((s): s is StepEvent => s !== null && !!s.label)
  if (!filled.length || (!aroha.length && !avaroha.length)) return null

  const allowed = new Set([...aroha, ...avaroha].map(stripOctave))
  const varjyaSet = getVarjyaNotes(aroha, avaroha)
  const vadiBase = vadi ? stripOctave(vadi) : ''
  const samvadiBase = samvadi ? stripOctave(samvadi) : ''

  let inRaga = 0
  let varjya = 0
  let vadiUsed = false
  let samvadiUsed = false
  const uniqueSet = new Set<string>()

  for (const step of filled) {
    const bare = stripOctave(step.label)
    uniqueSet.add(bare)
    if (varjyaSet.has(bare)) {
      varjya++
    } else if (allowed.has(bare)) {
      inRaga++
      if (bare === vadiBase)    vadiUsed = true
      if (bare === samvadiBase) samvadiUsed = true
    }
  }

  const total = filled.length
  // Score formula: 70 pts for in-raga purity + 15 vadi + 10 samvadi + 5 variety
  const purity = Math.round((inRaga / total) * 70)
  const vadiBonus    = vadiUsed    ? 15 : 0
  const samvadiBonus = samvadiUsed ? 10 : 0
  const varietyBonus = uniqueSet.size >= 4 ? 5 : 0
  const score = Math.min(100, purity + vadiBonus + samvadiBonus + varietyBonus)

  const grade: ScoreBreakdown['grade'] =
    score >= 90 ? 'S' :
    score >= 75 ? 'A' :
    score >= 55 ? 'B' :
    score >= 35 ? 'C' : 'D'

  const label =
    score >= 90 ? 'Pristine raga grammar' :
    score >= 75 ? 'Strong conformance' :
    score >= 55 ? 'Developing — add vadi/samvadi' :
    score >= 35 ? 'Needs more raga notes' :
    'Many forbidden notes'

  return { total, inRaga, varjya, vadiUsed, samvadiUsed, uniqueSwaras: uniqueSet.size, score, grade, label }
}

const GRADE_STYLES: Record<ScoreBreakdown['grade'], string> = {
  S: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300',
  A: 'bg-primary/15 border-primary/40 text-primary-light',
  B: 'bg-amber-500/15 border-amber-400/40 text-amber-300',
  C: 'bg-orange-500/15 border-orange-400/40 text-orange-300',
  D: 'bg-red-500/15 border-red-400/40 text-red-300',
}

export function CompositionScore({ sequence, aroha, avaroha, vadi, samvadi, ragaName }: CompositionScoreProps) {
  const result = useMemo(
    () => computeScore(sequence, aroha ?? [], avaroha ?? [], vadi, samvadi),
    [sequence, aroha, avaroha, vadi, samvadi]
  )

  if (!result || !ragaName) return null

  const { score, grade, label, total, inRaga, varjya, vadiUsed, samvadiUsed, uniqueSwaras } = result

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-surface-container-low/30 border border-outline-variant/8 flex-wrap">
      {/* Grade badge */}
      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-mono text-sm font-bold shrink-0 ${GRADE_STYLES[grade]}`}>
        {grade}
      </div>

      {/* Score + label */}
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-base font-bold text-on-surface">{score}</span>
          <span className="font-mono text-[9px] text-on-surface-variant/40 uppercase tracking-widest">/ 100</span>
        </div>
        <div className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40">{label}</div>
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px h-6 bg-outline-variant/10 mx-1" />

      {/* Pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="px-2 py-0.5 rounded-lg font-mono text-[8px] bg-surface-container-high/60 text-on-surface-variant/50">
          {inRaga}/{total} in raga
        </span>
        {varjya > 0 && (
          <span className="px-2 py-0.5 rounded-lg font-mono text-[8px] bg-red-500/10 border border-red-400/20 text-red-400/70">
            {varjya} varjya
          </span>
        )}
        {vadiUsed && (
          <span className="px-2 py-0.5 rounded-lg font-mono text-[8px] bg-amber-400/10 border border-amber-400/20 text-amber-300/80">
            Vadi ✓
          </span>
        )}
        {samvadiUsed && (
          <span className="px-2 py-0.5 rounded-lg font-mono text-[8px] bg-sky-400/10 border border-sky-400/20 text-sky-300/80">
            Samvadi ✓
          </span>
        )}
        <span className="px-2 py-0.5 rounded-lg font-mono text-[8px] bg-surface-container-high/60 text-on-surface-variant/40">
          {uniqueSwaras} unique swaras
        </span>
      </div>
    </div>
  )
}
