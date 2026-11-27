'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CURRICULUM_LESSONS, CURRICULUM_STAGES, type CurriculumLesson } from '@/lib/curriculum'

type LoadStatus = 'loading' | 'ready' | 'error'

interface PracticeSession {
  id?: string
  raga_name?: string
  started_at?: string
  created_at?: string
  duration_seconds?: number
  score?: number
}

function readCompletedLessons(payload: unknown): Set<string> {
  const completed = new Set<string>()
  const data = (payload as { data?: unknown } | null)?.data ?? payload
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const rows = record.lessons ?? record.completed_lessons ?? record.completedLessons ?? record.progress ?? data

  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (typeof row === 'string') {
        completed.add(row)
        continue
      }
      if (!row || typeof row !== 'object') continue
      const item = row as Record<string, unknown>
      if (item.completed !== true) continue
      const id = item.lesson_id ?? item.lessonId ?? item.id
      if (typeof id === 'string') completed.add(id)
    }
  } else if (rows && typeof rows === 'object') {
    for (const [id, value] of Object.entries(rows as Record<string, unknown>)) {
      if (value === true || (value && typeof value === 'object' && (value as Record<string, unknown>).completed === true)) {
        completed.add(id)
      }
    }
  }
  return completed
}

function readSessions(payload: unknown): PracticeSession[] {
  const data = (payload as { data?: unknown } | null)?.data ?? payload
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const rows = record.sessions ?? data
  return Array.isArray(rows) ? (rows as PracticeSession[]) : []
}

function formatSessionDate(value?: string): string {
  if (!value) return 'Recent session'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Recent session'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDuration(seconds?: number): string {
  if (typeof seconds !== 'number' || seconds <= 0) return '—'
  return `${Math.max(1, Math.round(seconds / 60))} min`
}

export default function LearnPage() {
  const supabase = createClient()
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [sessions, setSessions] = useState<PracticeSession[]>([])
  const [progressStatus, setProgressStatus] = useState<LoadStatus>('loading')
  const [sessionsStatus, setSessionsStatus] = useState<LoadStatus>('loading')
  const [progressDegraded, setProgressDegraded] = useState(false)
  const [sessionsDegraded, setSessionsDegraded] = useState(false)
  const [savingLesson, setSavingLesson] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function requestHeaders(includeJson = false): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: Record<string, string> = {}
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
    if (includeJson) headers['Content-Type'] = 'application/json'
    return headers
  }

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      let headers: Record<string, string> = {}
      try {
        headers = await requestHeaders()
      } catch {
        // Cookie auth may still work if the browser session is unavailable.
      }

      try {
        const res = await fetch('/api/learn/progress', { headers, signal: controller.signal })
        if (!res.ok) throw new Error(`Progress request failed: ${res.status}`)
        const json = await res.json()
        if (!controller.signal.aborted) {
          setCompleted(readCompletedLessons(json))
          setProgressDegraded(json?.degraded === true)
          setProgressStatus('ready')
        }
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('Failed to load lesson progress:', err)
        setProgressStatus('error')
      }

      try {
        const res = await fetch('/api/practice/sessions?limit=5', { headers, signal: controller.signal })
        if (!res.ok) throw new Error(`Sessions request failed: ${res.status}`)
        const json = await res.json()
        if (!controller.signal.aborted) {
          setSessions(readSessions(json))
          setSessionsDegraded(json?.degraded === true)
          setSessionsStatus('ready')
        }
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('Failed to load recent practice:', err)
        setSessionsStatus('error')
      }
    }
    load()
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function markComplete(lesson: CurriculumLesson) {
    setSavingLesson(lesson.id)
    setActionError(null)
    try {
      const headers = await requestHeaders(true)
      const res = await fetch('/api/learn/progress', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ lessonId: lesson.id, completed: true }),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      setCompleted(prev => new Set(prev).add(lesson.id))
    } catch (err) {
      console.error('Failed to save lesson progress:', err)
      setActionError(`Could not save “${lesson.title}”. Please try again.`)
    } finally {
      setSavingLesson(null)
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 dot-pattern opacity-20" />
      <div className="absolute top-20 left-1/3 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pb-24 pt-28 md:pt-32" data-testid="learn-page">
        <header className="mb-14 space-y-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary/60 font-bold">
            Curriculum · {CURRICULUM_STAGES.length} stages
          </div>
          <h1 className="text-4xl sm:text-5xl font-light font-display tracking-tight text-gradient-subtle">
            Learn, step by step.
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-on-surface-variant/60">
            Four short stages build a habit: find the tonic, learn a raga&apos;s grammar, practise with
            guidance, then reflect. Open a lesson, try it, and mark it complete when you&apos;re done.
          </p>
          {progressStatus === 'ready' && (
            <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/40">
              {completed.size} of {CURRICULUM_LESSONS.length} lessons complete
            </p>
          )}
          {progressStatus === 'error' && (
            <p className="font-mono text-[10px] uppercase tracking-widest text-tertiary">
              Progress is temporarily unavailable — lessons are still open below.
            </p>
          )}
          {progressStatus === 'ready' && progressDegraded && (
            <p className="font-mono text-[10px] uppercase tracking-widest text-tertiary">
              Saved progress is temporarily unavailable — completion is shown for this visit only.
            </p>
          )}
        </header>

        {actionError && (
          <div role="alert" className="mb-8 px-5 py-3 rounded-2xl bg-error/10 border border-error/20 text-xs text-error">
            {actionError}
          </div>
        )}

        {CURRICULUM_STAGES.map(stage => {
          const lessons = CURRICULUM_LESSONS.filter(lesson => lesson.stage === stage.id)
          return (
            <section key={stage.id} className="mb-12" aria-labelledby={`learn-stage-${stage.id}`}>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary/60 font-bold">
                  Stage {stage.id}
                </span>
                <h2 id={`learn-stage-${stage.id}`} className="font-display text-2xl font-light text-on-surface">
                  {stage.title}
                </h2>
              </div>
              <p className="mb-5 text-xs text-on-surface-variant/50">{stage.description}</p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {lessons.map(lesson => {
                  const done = completed.has(lesson.id)
                  return (
                    <article
                      key={lesson.id}
                      data-testid={`lesson-${lesson.id}`}
                      className={`glass rounded-3xl p-5 flex flex-col gap-3 transition-all ${done ? 'border-primary/30' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-lg font-light text-on-surface">{lesson.title}</h3>
                        <span className={`shrink-0 font-mono text-[8px] uppercase tracking-widest ${
                          done ? 'text-primary' : 'text-on-surface-variant/40'
                        }`}>
                          {done ? 'Completed' : progressStatus === 'loading' ? 'Checking' : 'To do'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-on-surface-variant/60 flex-1">{lesson.description}</p>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40">
                        <span>{lesson.ragaName}</span>
                        <span>·</span>
                        <span>{lesson.estimatedMinutes} min</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Link href={lesson.href} className="btn-primary text-xs px-4 py-2.5">
                          {lesson.cta}
                        </Link>
                        <button
                          type="button"
                          onClick={() => markComplete(lesson)}
                          disabled={done || savingLesson === lesson.id}
                          className="px-4 py-2.5 rounded-2xl bg-surface-container-high/60 border border-outline-variant/10 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60 hover:text-primary hover:border-primary/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined !text-sm leading-none">
                            {done ? 'check_circle' : 'circle'}
                          </span>
                          {done ? 'Completed' : savingLesson === lesson.id ? 'Saving…' : 'Mark complete'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}

        <section className="glass rounded-3xl p-6" aria-labelledby="recent-practice">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 id="recent-practice" className="font-display text-xl font-light text-on-surface">Recent practice</h2>
            <Link href="/journal" className="font-mono text-[9px] uppercase tracking-widest text-primary/60 hover:text-primary">
              Full journal →
            </Link>
          </div>
          {sessionsStatus === 'loading' ? (
            <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/40">Loading recent practice…</p>
          ) : sessionsStatus === 'error' ? (
            <p className="text-xs text-on-surface-variant/50">
              Recent practice is temporarily unavailable. Your lessons and journal are still available.
            </p>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-on-surface-variant/50">
              No practice sessions yet. Try the 90s riyaz above to see your first one here.
            </p>
          ) : (
            <>
              {sessionsDegraded && (
                <p className="mb-3 font-mono text-[9px] uppercase tracking-widest text-tertiary">
                  Structured practice history is temporarily unavailable.
                </p>
              )}
              <ul className="divide-y divide-outline-variant/10" data-testid="recent-practice-list">
                {sessions.map((session, index) => (
                  <li key={session.id ?? `${session.raga_name ?? 'session'}-${index}`} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-display text-base font-light text-on-surface truncate">{session.raga_name || 'Untitled session'}</p>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40">
                        {formatSessionDate(session.started_at ?? session.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {typeof session.score === 'number' && (
                        <p className="font-mono text-xs text-primary">{session.score}%</p>
                      )}
                      <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40">
                        {formatDuration(session.duration_seconds)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
