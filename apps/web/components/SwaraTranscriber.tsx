'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { PitchListener } from '@/lib/pitchDetector'
import { hzToSwara, swaraDisplay, tuningLabel } from '@/lib/hzToSwara'
import type { SwaraResult } from '@/lib/hzToSwara'
import { isVarjya, getSwaraFeedback, type SwaraFeedback } from '@/lib/ragaUtils'

export interface SessionStats {
  total: number
  correct: number
  wrongVariety: number
  varjya: number
  vadiHits: number
}

interface SwaraTranscriberProps {
  aroha?: string[]
  avaroha?: string[]
  vadi?: string
  samvadi?: string
  onInsert?: (note: string, octave: number) => void
  onSessionEnd?: (stats: SessionStats) => void
}

interface HistoryEntry {
  result: SwaraResult
  varjya: boolean
  ts: number
}

const TUNING_COLORS = {
  perfect: 'text-emerald-400',
  close:   'text-amber-400',
  off:     'text-red-400',
}

const TUNING_LABELS = {
  perfect: 'In tune',
  close:   'Close',
  off:     'Off',
}

export function SwaraTranscriber({ aroha, avaroha, vadi, samvadi, onInsert, onSessionEnd }: SwaraTranscriberProps) {
  const [open, setOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [current, setCurrent] = useState<SwaraResult | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const listenerRef  = useRef<PitchListener | null>(null)
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // BUG-024: guard against double-start (StrictMode double-invoke / rapid clicks)
  const startingRef  = useRef(false)

  const sessionStatsRef = useRef<SessionStats>({ total: 0, correct: 0, wrongVariety: 0, varjya: 0, vadiHits: 0 })

  const stopListening = useCallback(() => {
    listenerRef.current?.stop()
    listenerRef.current = null
    startingRef.current = false
    // BUG-025: always null the ref after clearing so there's only one live timer
    if (silenceTimer.current) { clearTimeout(silenceTimer.current); silenceTimer.current = null }
    setListening(false)
    setCurrent(null)
    if (onSessionEnd && sessionStatsRef.current.total > 0) {
      onSessionEnd({ ...sessionStatsRef.current })
    }
    sessionStatsRef.current = { total: 0, correct: 0, wrongVariety: 0, varjya: 0, vadiHits: 0 }
  }, [onSessionEnd])

  const startListening = useCallback(async () => {
    // BUG-024: prevent re-entrant start
    if (startingRef.current || listenerRef.current) return
    startingRef.current = true
    setError(null)
    try {
      const listener = new PitchListener()
      listenerRef.current = listener
      setListening(true)

      let lastNote = ''
      let noteStart = Date.now()

      await listener.start((result) => {
        if (!result) {
          // Silence — reset display after 400 ms
          if (silenceTimer.current) clearTimeout(silenceTimer.current)
          silenceTimer.current = setTimeout(() => setCurrent(null), 400)
          return
        }
        if (silenceTimer.current) {
          clearTimeout(silenceTimer.current)
          silenceTimer.current = null
        }

        const swara = hzToSwara(result.hz)
        if (!swara) return

        setCurrent(swara)

        // Log to history when note is held for >200 ms and is different from last
        const key = `${swara.note}-${swara.octave}`
        if (key !== lastNote) {
          if (Date.now() - noteStart > 200) {
            const fb = getSwaraFeedback(swara.note, aroha, avaroha, vadi, samvadi)
            const varjya = fb?.kind === 'varjya'
            setHistory(h => [{ result: swara, varjya, ts: Date.now() }, ...h].slice(0, 8))
            // accumulate session stats
            sessionStatsRef.current.total++
            if (fb?.kind === 'vadi') { sessionStatsRef.current.correct++; sessionStatsRef.current.vadiHits++ }
            else if (fb?.kind === 'samvadi' || fb?.kind === 'correct') sessionStatsRef.current.correct++
            else if (fb?.kind === 'wrong-variety') sessionStatsRef.current.wrongVariety++
            else if (fb?.kind === 'varjya') sessionStatsRef.current.varjya++
          }
          lastNote = key
          noteStart = Date.now()
        }
      })
    } catch (e: unknown) {
      // BUG-024: reset guard on error so the user can retry
      startingRef.current = false
      listenerRef.current = null
      setError(e instanceof Error ? e.message : 'Microphone access denied')
      setListening(false)
    }
  }, [aroha, avaroha])

  // Clean up on unmount
  useEffect(() => () => stopListening(), [stopListening])

  const handleToggle = () => {
    if (listening) stopListening()
    else startListening()
  }

  const handleClose = () => {
    stopListening()
    setOpen(false)
    setHistory([])
    setError(null)
  }

  const currentVarjya = current ? isVarjya(current.note, aroha, avaroha) : false
  const tuning = current ? tuningLabel(current.cents) : null
  const feedback: SwaraFeedback | null = current
    ? getSwaraFeedback(current.note, aroha, avaroha, vadi, samvadi)
    : null

  return (
    <>
      {/* Mic trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Swara Transcriber — sing and see your notes"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-mono text-[8px] uppercase tracking-widest font-bold transition-all ${
          open
            ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
            : 'border-outline-variant/10 text-on-surface-variant/30 hover:text-on-surface-variant hover:border-outline-variant/20'
        }`}
      >
        <span className="material-symbols-outlined !text-sm">mic</span>
        {open ? 'Transcriber' : 'Sing'}
      </button>

      {/* Transcriber panel */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 mx-4 rounded-3xl bg-[#0b0b16] border border-outline-variant/15 shadow-2xl p-5 animate-slide-up">

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-rose-500/15 flex items-center justify-center">
                <span className="material-symbols-outlined !text-sm text-rose-400">mic</span>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest font-bold text-on-surface/70">Swara Transcriber</p>
                <p className="font-mono text-[7px] uppercase tracking-widest text-on-surface-variant/30">Sing or hum — see your swaras in real time</p>
              </div>
            </div>
            <button onClick={handleClose} className="w-7 h-7 rounded-xl border border-outline-variant/10 flex items-center justify-center text-on-surface-variant/30 hover:text-on-surface transition-all">
              <span className="material-symbols-outlined !text-sm">close</span>
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-sans text-xs">
              <span className="material-symbols-outlined !text-sm flex-shrink-0">error</span>
              {error}
            </div>
          )}

          {/* Live display */}
          <div className={`rounded-2xl border p-5 mb-4 flex flex-col items-center justify-center min-h-[96px] transition-all ${
            listening
              ? feedback?.kind === 'vadi'
                ? 'bg-amber-500/8 border-amber-400/25'
                : feedback?.kind === 'samvadi'
                  ? 'bg-sky-500/8 border-sky-400/25'
                  : feedback?.kind === 'wrong-variety'
                    ? 'bg-orange-500/8 border-orange-400/25'
                    : feedback?.kind === 'varjya'
                      ? 'bg-red-500/8 border-red-500/25'
                      : current
                        ? 'bg-emerald-500/8 border-emerald-500/20'
                        : 'bg-surface-container-low border-outline-variant/10'
              : 'bg-surface-container-low/30 border-outline-variant/5'
          }`}>
            {listening ? (
              current ? (
                <>
                  <p className={`font-display text-5xl font-light mb-1 ${
                    feedback?.kind === 'vadi' ? 'text-amber-400'
                    : feedback?.kind === 'samvadi' ? 'text-sky-400'
                    : feedback?.kind === 'wrong-variety' ? 'text-orange-400'
                    : feedback?.kind === 'varjya' ? 'text-red-400'
                    : 'text-on-surface'
                  }`}>
                    {swaraDisplay(current)}
                  </p>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 mb-2">
                    octave {current.octave} · {current.semitone === 0 ? 'Sa' : ''}{Math.abs(current.cents)}¢ {current.cents >= 0 ? 'sharp' : 'flat'}
                  </p>
                  {tuning && (
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${tuning === 'perfect' ? 'bg-emerald-400' : tuning === 'close' ? 'bg-amber-400' : 'bg-red-400'}`} />
                      <span className={`font-mono text-[8px] uppercase tracking-widest font-bold ${TUNING_COLORS[tuning]}`}>
                        {TUNING_LABELS[tuning]} ({current.cents > 0 ? '+' : ''}{current.cents}¢)
                      </span>
                    </div>
                  )}
                  {feedback && (
                    <div className={`mt-3 px-3 py-2 rounded-xl border flex flex-col items-center gap-0.5 ${
                      feedback.kind === 'vadi'
                        ? 'bg-amber-500/15 border-amber-400/30'
                        : feedback.kind === 'samvadi'
                          ? 'bg-sky-500/15 border-sky-400/30'
                          : feedback.kind === 'correct'
                            ? 'bg-emerald-500/10 border-emerald-400/20'
                            : feedback.kind === 'wrong-variety'
                              ? 'bg-orange-500/15 border-orange-400/30'
                              : 'bg-red-500/10 border-red-500/25'
                    }`}>
                      <span className={`font-mono text-[9px] uppercase tracking-widest font-bold ${
                        feedback.kind === 'vadi' ? 'text-amber-400'
                        : feedback.kind === 'samvadi' ? 'text-sky-400'
                        : feedback.kind === 'correct' ? 'text-emerald-400'
                        : feedback.kind === 'wrong-variety' ? 'text-orange-400'
                        : 'text-red-400'
                      }`}>
                        {feedback.message}
                      </span>
                      {feedback.hint && (
                        <span className="font-mono text-[7px] text-on-surface-variant/40 tracking-wide">
                          {feedback.hint}
                        </span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-3 text-on-surface-variant/30">
                  <span className="material-symbols-outlined !text-xl animate-pulse">hearing</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest">Listening… sing a note</span>
                </div>
              )
            ) : (
              <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/25">Press Start to begin</p>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleToggle}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-mono text-[9px] uppercase tracking-widest font-bold transition-all ${
                listening
                  ? 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25'
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-400 hover:bg-rose-500/20'
              }`}
            >
              <span className={`material-symbols-outlined !text-sm ${listening ? 'animate-pulse' : ''}`}>
                {listening ? 'stop' : 'mic'}
              </span>
              {listening ? 'Stop' : 'Start Listening'}
            </button>

            {onInsert && current && (
              <button
                onClick={() => onInsert(current.note, current.octave)}
                disabled={currentVarjya}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/25 text-primary font-mono text-[9px] uppercase tracking-widest font-bold hover:bg-primary/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined !text-sm">add</span>
                Insert
              </button>
            )}
          </div>

          {/* History strip */}
          {history.length > 0 && (
            <div>
              <p className="font-mono text-[7px] uppercase tracking-widest text-on-surface-variant/30 mb-2">Recent notes</p>
              <div className="flex gap-1.5 flex-wrap">
                {history.map((h, i) => (
                  <span
                    key={h.ts}
                    className={`font-display text-sm px-2 py-1 rounded-lg border ${
                      h.varjya
                        ? 'bg-red-500/10 border-red-500/25 text-red-400'
                        : i === 0
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          : 'bg-surface-container-low border-outline-variant/10 text-on-surface/50'
                    }`}
                  >
                    {swaraDisplay(h.result)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
