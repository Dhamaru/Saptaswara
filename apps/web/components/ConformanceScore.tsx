'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { PitchListener } from '@/lib/pitchDetector'
import { hzToSwara } from '@/lib/hzToSwara'

interface ConformanceScoreProps {
  isRecording: boolean
  aroha?: string[]
  avaroha?: string[]
  ragaName?: string
}

interface ScoreResult {
  score: number
  dominantSwara: string | null
  breakdown: Record<string, number>
  nonRagaCount: number
}

function normalizeNote(note: string): string {
  return note.replace(/['\^.]/g, '').trim()
}

export function ConformanceScore({ isRecording, aroha, avaroha, ragaName }: ConformanceScoreProps) {
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const samplesRef = useRef<string[]>([])
  const listenerRef = useRef<PitchListener | null>(null)
  const wasRecordingRef = useRef(false)

  const ragaNotes = React.useMemo(() => {
    const all = [...(aroha ?? []), ...(avaroha ?? [])]
    return new Set(all.map(normalizeNote))
  }, [aroha, avaroha])

  const startCapture = useCallback(async () => {
    if (listenerRef.current) return
    samplesRef.current = []
    try {
      const listener = new PitchListener()
      listenerRef.current = listener
      await listener.start((result) => {
        if (!result) return
        const swara = hzToSwara(result.hz)
        if (swara && (result as any).clarity > 0.85) {
          samplesRef.current.push(normalizeNote(swara.note))
        }
      })
    } catch {}
  }, [])

  const stopCapture = useCallback(() => {
    listenerRef.current?.stop()
    listenerRef.current = null

    const samples = samplesRef.current
    if (!samples.length || !ragaNotes.size) return

    const breakdown: Record<string, number> = {}
    let ragaHits = 0
    let nonRagaCount = 0

    for (const note of samples) {
      breakdown[note] = (breakdown[note] ?? 0) + 1
      if (ragaNotes.has(note)) ragaHits++
      else nonRagaCount++
    }

    const score = Math.round((ragaHits / samples.length) * 100)
    const dominantSwara = Object.entries(breakdown).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    setScoreResult({ score, dominantSwara, breakdown, nonRagaCount })
    setDismissed(false)
  }, [ragaNotes])

  useEffect(() => {
    if (isRecording && !wasRecordingRef.current) {
      startCapture()
    } else if (!isRecording && wasRecordingRef.current) {
      stopCapture()
    }
    wasRecordingRef.current = isRecording
  }, [isRecording, startCapture, stopCapture])

  useEffect(() => () => { listenerRef.current?.stop() }, [])

  if (!scoreResult || dismissed || !ragaName) return null

  const { score, dominantSwara, breakdown, nonRagaCount } = scoreResult
  const topNotes = Object.entries(breakdown)
    .filter(([n]) => ragaNotes.has(n))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const tone = score >= 80
    ? `You stayed in ${ragaName} for most of this — great!`
    : score >= 60
    ? `Good effort in ${ragaName}. A few notes drifted outside the raga.`
    : `Keep practising ${ragaName}'s notes — you'll get there!`

  return (
    <div className="mt-4 p-4 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 animate-fade-in">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display text-lg font-light border ${
            score >= 80 ? 'bg-secondary/15 border-secondary/30 text-secondary'
            : score >= 60 ? 'bg-amber-500/15 border-amber-400/30 text-amber-400'
            : 'bg-primary/10 border-primary/20 text-primary'
          }`}>
            {score}%
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40">Raga Conformance</div>
            <div className="font-sans text-xs text-on-surface-variant/70 italic mt-0.5">{tone}</div>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-on-surface-variant/30 hover:text-on-surface-variant transition-colors"
        >
          <span className="material-symbols-outlined !text-base">close</span>
        </button>
      </div>

      {/* Note breakdown */}
      <div className="flex flex-wrap gap-1.5">
        {topNotes.map(([note, count]) => (
          <div key={note} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/8 border border-primary/15">
            <span className="font-mono text-xs text-on-surface font-medium">{note}</span>
            <span className="font-mono text-[8px] text-primary/50">{count}</span>
          </div>
        ))}
        {nonRagaCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/8 border border-red-400/15">
            <span className="font-mono text-[8px] text-red-400/70">{nonRagaCount} outside raga</span>
          </div>
        )}
        {dominantSwara && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/8 border border-amber-400/15 ml-auto">
            <span className="font-mono text-[8px] text-amber-400/70">dominant: {dominantSwara}</span>
          </div>
        )}
      </div>
    </div>
  )
}
