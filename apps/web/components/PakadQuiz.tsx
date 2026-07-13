'use client'

import { useState, useCallback, useRef } from 'react'
import { swaraToFrequency } from '@/lib/musicalMath'
import { getAudioEngine } from '@/lib/audio'

interface Raga {
  id: string
  name: string
  raga_phrases?: { sequence: string[] }[]
  aroha?: string[]
}

interface Props {
  ragas: Raga[]
  onClose: () => void
}

function pickDistractors(correct: Raga, all: Raga[], count = 3): Raga[] {
  const others = all.filter(r => r.id !== correct.id && r.raga_phrases?.length)
  const shuffled = [...others].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function PakadQuiz({ ragas, onClose }: Props) {
  const eligibleRagas = ragas.filter(r => r.raga_phrases?.length && r.raga_phrases[0].sequence?.length >= 3)

  const [score, setScore] = useState(0)
  const [round, setRound] = useState(0)
  const [answered, setAnswered] = useState<'correct' | 'wrong' | null>(null)
  const [chosen, setChosen] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const correct = eligibleRagas[round % eligibleRagas.length]
  const options = correct
    ? shuffle([correct, ...pickDistractors(correct, eligibleRagas)])
    : []

  const playPakad = useCallback(async () => {
    if (!correct || isPlaying) return
    const engine = getAudioEngine()
    if (!engine) return
    if (!engine.isStarted) await engine.start()

    const seq: string[] = correct.raga_phrases![0].sequence
    setIsPlaying(true)
    const msPer = 500

    seq.forEach((swara, i) => {
      const t = setTimeout(() => {
        const freq = swaraToFrequency(swara.replace(/[\^'.]/g, '').trim(), 261.63, 4)
        if (freq) engine.playSwara(freq, '4n')
        if (i === seq.length - 1) setTimeout(() => setIsPlaying(false), 600)
      }, i * msPer)
      if (timeoutRef.current === null) timeoutRef.current = t
    })
  }, [correct, isPlaying])

  function handleAnswer(raga: Raga) {
    if (answered) return
    const isCorrect = raga.id === correct.id
    setChosen(raga.id)
    setAnswered(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) setScore(s => s + 1)
  }

  function nextRound() {
    setRound(r => r + 1)
    setAnswered(null)
    setChosen(null)
    setIsPlaying(false)
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
  }

  if (eligibleRagas.length < 4) {
    return (
      <div className="p-6 text-center">
        <p className="font-mono text-[9px] text-on-surface-variant/40 uppercase tracking-widest">
          Not enough ragas with pakad phrases to run quiz.
        </p>
        <button onClick={onClose} className="mt-4 font-mono text-[9px] uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">Close</button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40">Pakad Quiz</div>
          <div className="font-mono text-[8px] text-primary/50 mt-0.5">Round {round + 1} · Score {score}</div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/30 hover:text-error transition-colors">
          <span className="material-symbols-outlined !text-base">close</span>
        </button>
      </div>

      {/* Play button */}
      <div className="text-center py-4">
        <button
          onClick={playPakad}
          disabled={isPlaying}
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-all active:scale-95 ${
            isPlaying
              ? 'bg-primary/30 border-2 border-primary/50 text-primary/60'
              : 'bg-primary/15 border-2 border-primary/30 text-primary hover:bg-primary/25 hover:scale-105'
          }`}
        >
          <span className="material-symbols-outlined !text-3xl">{isPlaying ? 'music_note' : 'play_circle'}</span>
        </button>
        <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30 mt-2">
          {isPlaying ? 'Playing pakad…' : 'Tap to hear pakad'}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        {options.map(opt => {
          let cls = 'bg-surface-container-low/50 border-outline-variant/15 text-on-surface hover:border-primary/30 hover:bg-primary/5'
          if (answered && opt.id === correct.id) cls = 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
          else if (answered && opt.id === chosen) cls = 'bg-red-500/15 border-red-400/40 text-red-300'
          return (
            <button
              key={opt.id}
              onClick={() => handleAnswer(opt)}
              disabled={!!answered}
              className={`px-4 py-3 rounded-xl border font-display text-sm font-light text-left transition-all disabled:cursor-default ${cls}`}
            >
              {opt.name}
            </button>
          )
        })}
      </div>

      {/* Result */}
      {answered && (
        <div className="flex items-center justify-between pt-1">
          <span className={`font-mono text-[9px] uppercase tracking-widest font-bold ${answered === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
            {answered === 'correct' ? '✓ Correct!' : `✗ It was ${correct.name}`}
          </span>
          <button
            onClick={nextRound}
            className="px-4 py-2 rounded-xl bg-primary/15 border border-primary/30 font-mono text-[9px] uppercase tracking-widest text-primary hover:bg-primary/25 transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
