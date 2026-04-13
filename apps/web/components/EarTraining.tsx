'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { audioEngine } from '@/lib/audio'
import type { Raga } from '@saptaswara/core'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Question {
  swara: string
  frequency: number
  choices: string[]
}

interface Round {
  question: Question
  answered: string | null
  correct: boolean | null
}

// ── Swara → frequency mapping (C4 = Sa = 261.63 Hz) ─────────────────────────

const BASE_FREQ = 261.63 // Sa = C4

const SWARA_SEMITONES: Record<string, number> = {
  Sa: 0, re: 1, Re: 2, ga: 3, Ga: 4, Ma: 5, ma: 6,
  Pa: 7, dha: 8, Dha: 9, ni: 10, Ni: 11,
}

function swaraToFreq(swara: string, octave: 0 | 1 = 0): number {
  const semi = SWARA_SEMITONES[swara] ?? 0
  return BASE_FREQ * Math.pow(2, (semi + octave * 12) / 12)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Build a question from the active raga's notes ─────────────────────────────

function buildQuestion(raga: Raga | null, previousSwara?: string): Question {
  // All swaras available — if raga selected, prefer its notes but also include all 12
  const pool: string[] = raga?.aroha?.length
    ? [...new Set([...(raga.aroha as string[]), ...(raga.avaroha as string[] || [])])]
    : Object.keys(SWARA_SEMITONES)

  // Avoid repeating the same swara twice in a row
  const filtered = pool.length > 1 ? pool.filter(s => s !== previousSwara) : pool
  const answer = filtered[Math.floor(Math.random() * filtered.length)]

  // Build wrong choices: pick from the full pool excluding answer
  const wrongPool = Object.keys(SWARA_SEMITONES).filter(s => s !== answer)
  const wrongs = shuffle(wrongPool).slice(0, 3)

  const choices = shuffle([answer, ...wrongs])
  return {
    swara: answer,
    frequency: swaraToFreq(answer),
    choices,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface EarTrainingProps {
  raga: Raga | null
  onClose: () => void
}

const TOTAL_ROUNDS = 10

export function EarTraining({ raga, onClose }: EarTrainingProps) {
  const [rounds, setRounds] = useState<Round[]>([])
  const [currentQ, setCurrentQ] = useState<Question>(() => buildQuestion(raga))
  const [phase, setPhase] = useState<'playing' | 'waiting' | 'answered' | 'finished'>('waiting')
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const lastSwaraRef = useRef<string | undefined>(undefined)

  const roundNumber = rounds.length + 1

  const playNote = useCallback(() => {
    if (!audioEngine?.isStarted) return
    setPhase('playing')
    audioEngine.playSwara(currentQ.frequency, '2n')
    setTimeout(() => setPhase('waiting'), 1200)
  }, [currentQ])

  // Auto-play on mount and on each new question
  useEffect(() => {
    const t = setTimeout(playNote, 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ.swara])

  const handleAnswer = useCallback((choice: string) => {
    if (phase !== 'waiting') return
    const correct = choice === currentQ.swara
    const newRound: Round = { question: currentQ, answered: choice, correct }
    const newRounds = [...rounds, newRound]
    const newScore = score + (correct ? 1 : 0)
    const newStreak = correct ? streak + 1 : 0

    setRounds(newRounds)
    setScore(newScore)
    setStreak(newStreak)
    setPhase('answered')

    // Auto-advance after 1.4s
    setTimeout(() => {
      if (newRounds.length >= TOTAL_ROUNDS) {
        setPhase('finished')
      } else {
        lastSwaraRef.current = currentQ.swara
        const next = buildQuestion(raga, lastSwaraRef.current)
        setCurrentQ(next)
        setPhase('waiting')
      }
    }, 1400)
  }, [phase, currentQ, rounds, score, streak, raga])

  const handleRestart = useCallback(() => {
    setRounds([])
    setScore(0)
    setStreak(0)
    lastSwaraRef.current = undefined
    const q = buildQuestion(raga)
    setCurrentQ(q)
    setPhase('waiting')
  }, [raga])

  const pct = Math.round((score / TOTAL_ROUNDS) * 100)
  const grade = pct >= 90 ? 'Excellent' : pct >= 70 ? 'Good' : pct >= 50 ? 'Keep Practising' : 'Try Again'

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-surface rounded-[32px] border border-outline-variant/10 shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined !text-base text-secondary/70">hearing</span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-secondary/70 font-bold">Ear Training</span>
            </div>
            <h2 className="font-display text-xl font-light text-on-surface tracking-tight">
              {raga ? `${raga.name} · Swara Identification` : 'Swara Identification'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-container-high transition-all text-on-surface-variant/40">
            <span className="material-symbols-outlined !text-lg">close</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-8 mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30">Round {Math.min(roundNumber, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}</span>
            <span className="font-mono text-[8px] uppercase tracking-widest text-secondary/60 font-bold">Score {score}</span>
          </div>
          <div className="h-1 bg-surface-container-low rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-secondary to-primary transition-all duration-500"
              style={{ width: `${(rounds.length / TOTAL_ROUNDS) * 100}%` }}
            />
          </div>
          {streak >= 3 && phase !== 'finished' && (
            <p className="font-mono text-[8px] text-amber-400 mt-1">🔥 {streak} in a row!</p>
          )}
        </div>

        {/* Main content */}
        {phase === 'finished' ? (
          /* Results screen */
          <div className="px-8 pb-8 text-center">
            <div className="mb-6">
              <div className="text-6xl font-display font-light text-on-surface mb-2">{pct}%</div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold">{grade}</p>
              <p className="font-sans text-sm text-on-surface-variant/60 mt-2">{score} correct out of {TOTAL_ROUNDS}</p>
            </div>
            {/* Round recap */}
            <div className="flex justify-center gap-2 flex-wrap mb-8">
              {rounds.map((r, i) => (
                <div
                  key={i}
                  title={`Q${i + 1}: ${r.question.swara} — you answered ${r.answered}`}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-[8px] font-bold ${
                    r.correct ? 'bg-secondary/20 text-secondary border border-secondary/30' : 'bg-error/20 text-error border border-error/30'
                  }`}
                >
                  {r.question.swara.length <= 2 ? r.question.swara : r.question.swara.slice(0, 2)}
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRestart}
                className="px-6 py-3 bg-primary/15 border border-primary/30 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-primary font-bold hover:bg-primary/25 transition-all active:scale-95"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-surface-container-high border border-outline-variant/10 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/60 hover:text-on-surface transition-all active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Active question screen */
          <div className="px-8 pb-8">
            {/* Note player */}
            <div className="flex flex-col items-center gap-4 mb-8">
              <button
                onClick={playNote}
                disabled={phase === 'playing'}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  phase === 'playing'
                    ? 'bg-secondary/30 border-2 border-secondary/60 animate-pulse'
                    : 'bg-surface-container-high border-2 border-outline-variant/20 hover:border-primary/40 hover:bg-primary/10'
                }`}
              >
                <span className={`material-symbols-outlined !text-3xl ${phase === 'playing' ? 'text-secondary' : 'text-on-surface-variant/50'}`}>
                  {phase === 'playing' ? 'graphic_eq' : 'play_circle'}
                </span>
              </button>
              <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40">
                {phase === 'playing' ? 'Listen…' : 'Tap to replay the note'}
              </p>
            </div>

            {/* Answer choices */}
            <div className="grid grid-cols-2 gap-3">
              {currentQ.choices.map(choice => {
                const isAnswered = phase === 'answered'
                const isCorrectAnswer = choice === currentQ.swara
                const isUserChoice = phase === 'answered' && rounds[rounds.length - 1]?.answered === choice

                let cls = 'border-outline-variant/15 bg-surface-container-low text-on-surface-variant/70 hover:border-primary/30 hover:text-on-surface'
                if (isAnswered) {
                  if (isCorrectAnswer) cls = 'border-secondary/50 bg-secondary/15 text-secondary'
                  else if (isUserChoice) cls = 'border-error/40 bg-error/10 text-error/80'
                  else cls = 'border-outline-variant/10 bg-surface-container-low/30 text-on-surface-variant/30'
                }

                return (
                  <button
                    key={choice}
                    onClick={() => handleAnswer(choice)}
                    disabled={phase !== 'waiting'}
                    className={`py-4 rounded-2xl border font-label text-lg font-bold transition-all active:scale-95 disabled:cursor-default flex items-center justify-center gap-2 ${cls}`}
                  >
                    {isAnswered && isCorrectAnswer && (
                      <span className="material-symbols-outlined !text-sm">check_circle</span>
                    )}
                    {isAnswered && isUserChoice && !isCorrectAnswer && (
                      <span className="material-symbols-outlined !text-sm">cancel</span>
                    )}
                    {choice}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
