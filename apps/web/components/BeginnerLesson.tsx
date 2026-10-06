'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { audioEngine } from '@/lib/audio'
import { swaraToFrequency } from '@/lib/musicalMath'

type NoteEvent = { note: string; id: number } | null

interface BeginnerLessonProps {
  playedNote: NoteEvent
  isStarted: boolean
}

const EXERCISES = [
  { title: 'Find Sa', notes: ['Sa'], hint: 'Sa is your home note. Play it once.' },
  { title: 'Sa → Re', notes: ['Sa', 'Re'], hint: 'Play Sa, then Re.' },
  { title: 'Sa → Re → Ga', notes: ['Sa', 'Re', 'Ga'], hint: 'Build your first three-note phrase.' },
]

export function BeginnerLesson({ playedNote, isStarted }: BeginnerLessonProps) {
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'listening' | 'correct' | 'try-again'>('idle')
  const [lastEventId, setLastEventId] = useState(-1)
  const exercise = EXERCISES[exerciseIndex]

  const expected = useMemo(() => exercise.notes[progress], [exercise, progress])

  useEffect(() => {
    if (!playedNote || playedNote.id === lastEventId) return
    setLastEventId(playedNote.id)
    const received = playedNote.note.replace(/[\^'.]/g, '').trim()
    if (received !== expected) {
      setStatus('try-again')
      return
    }

    const nextProgress = progress + 1
    if (nextProgress >= exercise.notes.length) {
      setProgress(nextProgress)
      setStatus('correct')
    } else {
      setProgress(nextProgress)
      setStatus('listening')
    }
  }, [playedNote, lastEventId, expected, progress, exercise])

  const reset = (index = exerciseIndex) => {
    setExerciseIndex(index)
    setProgress(0)
    setStatus('idle')
  }

  const playSequence = async (notes: string[]) => {
    if (!isStarted) return
    for (const note of notes) {
      audioEngine?.playSwara(swaraToFrequency(note), '8n', undefined, 0.8)
      await new Promise(resolve => setTimeout(resolve, 460))
    }
  }

  const statusText = status === 'correct'
    ? 'Wonderful — you completed this exercise.'
    : status === 'try-again'
      ? `Try ${expected} next. The keyboard will show you the note names.`
      : status === 'listening'
        ? `Good. Now play ${expected}.`
        : exercise.hint

  return (
    <section data-testid="beginner-lesson" className="p-5 rounded-3xl bg-primary/5 border border-primary/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary/70 font-bold">Start here · interactive lesson</div>
          <h3 className="mt-1 text-xl font-display text-on-surface">{exercise.title}</h3>
          <p className="mt-1 text-sm text-on-surface-variant/70">{statusText}</p>
        </div>
        <div className="flex gap-2">
          <button data-testid="lesson-show-me" onClick={() => playSequence(exercise.notes)} disabled={!isStarted} className="px-3 py-2 rounded-xl border border-primary/30 text-primary font-mono text-[9px] uppercase tracking-wider disabled:opacity-30">Show me</button>
          <button data-testid="lesson-play-with-me" onClick={() => playSequence(exercise.notes)} disabled={!isStarted} className="px-3 py-2 rounded-xl bg-primary/15 text-primary font-mono text-[9px] uppercase tracking-wider disabled:opacity-30">Play with me</button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {exercise.notes.map((note, index) => (
          <span key={note} className={`px-3 py-1.5 rounded-lg border font-mono text-xs ${index < progress ? 'bg-secondary/15 border-secondary/30 text-secondary' : index === progress ? 'bg-primary/15 border-primary/30 text-primary' : 'border-outline-variant/20 text-on-surface-variant/40'}`}>{note}</span>
        ))}
        <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-on-surface-variant/40">{progress}/{exercise.notes.length}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {EXERCISES.map((item, index) => (
          <button key={item.title} onClick={() => reset(index)} className={`px-2.5 py-1.5 rounded-lg font-mono text-[8px] uppercase tracking-wider ${index === exerciseIndex ? 'bg-on-surface/10 text-on-surface' : 'text-on-surface-variant/40 hover:text-on-surface'}`}>{index + 1}. {item.title}</button>
        ))}
        <button onClick={() => reset()} className="ml-auto px-2.5 py-1.5 rounded-lg font-mono text-[8px] uppercase tracking-wider text-on-surface-variant/50 hover:text-on-surface">Reset</button>
      </div>
    </section>
  )
}
