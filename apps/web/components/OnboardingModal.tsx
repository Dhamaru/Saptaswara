'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  fetchLearningPreferences,
  getMoodRaga,
  type MoodRagaSuggestion,
  type SkillLevel,
} from '@/lib/learningPreferences'

const STORAGE_KEY = 'saptaswara-onboarding-done'
const DEGRADED_KEY = 'saptaswara-onboarding-degraded'
export const OPEN_ONBOARDING_EVENT = 'saptaswara:open-onboarding'

type Mood = 'Calm' | 'Romantic' | 'Devotional' | 'Melancholic' | 'Joyful'

const SKILL_OPTIONS: { value: SkillLevel; label: string; sub: string; icon: string }[] = [
  { value: 'Beginner',  label: 'Beginner',  sub: 'Just starting out',         icon: 'school' },
  { value: 'Student',   label: 'Student',   sub: 'Learning under a teacher',  icon: 'menu_book' },
  { value: 'Musician',  label: 'Musician',  sub: 'Practicing independently',  icon: 'music_note' },
]

const MOOD_OPTIONS: { value: Mood; label: string; icon: string; color: string }[] = [
  { value: 'Calm',        label: 'Calm',       icon: '🌊', color: 'bg-sky-500/15 border-sky-400/30 text-sky-300' },
  { value: 'Romantic',    label: 'Romantic',   icon: '🌹', color: 'bg-rose-500/15 border-rose-400/30 text-rose-300' },
  { value: 'Devotional',  label: 'Devotional', icon: '🪔', color: 'bg-amber-500/15 border-amber-400/30 text-amber-300' },
  { value: 'Melancholic', label: 'Melancholic',icon: '🌙', color: 'bg-indigo-500/15 border-indigo-400/30 text-indigo-300' },
  { value: 'Joyful',      label: 'Joyful',     icon: '☀️', color: 'bg-yellow-500/15 border-yellow-400/30 text-yellow-300' },
]

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback']

export default function OnboardingModal() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [checking, setChecking] = useState(true)
  const [show, setShow] = useState(false)
  const [forceOpen, setForceOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [skill, setSkill] = useState<SkillLevel | null>(null)
  const [mood, setMood] = useState<Mood | null>(null)
  const [raga, setRaga] = useState<MoodRagaSuggestion | null>(null)
  const [saving, setSaving] = useState(false)

  // Profile can re-open the flow without adding a dedicated route.
  useEffect(() => {
    const open = () => setForceOpen(true)
    window.addEventListener(OPEN_ONBOARDING_EVENT, open)
    return () => window.removeEventListener(OPEN_ONBOARDING_EVENT, open)
  }, [])

  useEffect(() => {
    let active = true
    const isPublic = PUBLIC_ROUTES.includes(pathname ?? '') || (pathname ?? '').startsWith('/preview')

    if (isPublic && !forceOpen) {
      setChecking(false)
      setShow(false)
      return () => { active = false }
    }

    ;(async () => {
      setChecking(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          if (active) setShow(false)
          return
        }

        const { preferences, degraded } = await fetchLearningPreferences()
        if (!active) return

        if (degraded) {
          // Cache is authoritative only while the database is unavailable.
          const cachedDone = localStorage.getItem(STORAGE_KEY) === '1'
          setShow(forceOpen || !cachedDone)
        } else {
          if (preferences.onboarding_done) {
            localStorage.setItem(STORAGE_KEY, '1')
            localStorage.removeItem(DEGRADED_KEY)
          }
          setShow(forceOpen || !preferences.onboarding_done)
        }
      } catch {
        if (active) setShow(localStorage.getItem(STORAGE_KEY) !== '1')
      } finally {
        if (active) setChecking(false)
      }
    })()

    return () => { active = false }
  }, [pathname, forceOpen, supabase])

  const persistPreferences = async (body: Record<string, unknown>) => {
    setSaving(true)
    let persisted = false

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const res = await fetch('/api/users/preferences', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(body),
        })
        persisted = res.ok
      }
    } catch {
      persisted = false
    }

    // Local cache keeps the flow usable while a migration is pending. The
    // degraded marker prevents this cache from overriding a healthy DB later.
    if (persisted) {
      localStorage.setItem(STORAGE_KEY, '1')
      localStorage.removeItem(DEGRADED_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, '1')
      localStorage.setItem(DEGRADED_KEY, '1')
    }

    setSaving(false)
    return persisted
  }

  const handleMoodSelect = (m: Mood) => {
    setMood(m)
    setRaga(getMoodRaga(m))
    setStep(3)
  }

  const handleOpenStudio = async () => {
    const suggestion = raga ?? getMoodRaga(mood)
    await persistPreferences({
      ...(skill ? { skill_level: skill } : {}),
      ...(mood ? { onboarding_mood: mood } : {}),
      preferred_ragas: [suggestion.name],
      onboarding_done: true,
    })

    setForceOpen(false)
    setShow(false)
    router.push(`/riyaz?raga_name=${encodeURIComponent(suggestion.name)}`)
  }

  const handleSkip = async () => {
    await persistPreferences({
      ...(skill ? { skill_level: skill } : {}),
      ...(mood ? { onboarding_mood: mood } : {}),
      ...(raga ? { preferred_ragas: [raga.name] } : {}),
      onboarding_done: true,
    })
    setForceOpen(false)
    setShow(false)
  }

  if (checking || !show) return null

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-lg bg-surface-lowest rounded-[32px] border border-outline-variant/10 shadow-2xl overflow-hidden">

        {/* Progress bar */}
        <div className="h-0.5 bg-outline-variant/10">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-8 md:p-10">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-primary' : 'bg-outline-variant/20'
                } ${s === step ? 'w-8' : 'w-4'}`}
              />
            ))}
            <button
              onClick={handleSkip}
              disabled={saving}
              className="ml-auto font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50 hover:text-on-surface transition-colors disabled:opacity-50"
            >
              Skip
            </button>
          </div>

          {/* ── Step 1: Skill level ── */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
                  <span className="material-symbols-outlined !text-sm text-primary/70">waving_hand</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary/70">Welcome</span>
                </div>
                <h2 className="font-display text-3xl font-light text-on-surface tracking-tight mb-2">
                  What brings you here?
                </h2>
                <p className="font-sans text-sm text-on-surface-variant/60">
                  This helps tailor your practice path.
                </p>
              </div>
              <div className="space-y-3">
                {SKILL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSkill(opt.value); setStep(2) }}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-all">
                      <span className="material-symbols-outlined !text-lg text-primary/60">{opt.icon}</span>
                    </div>
                    <div>
                      <div className="font-display text-lg font-light text-on-surface group-hover:text-primary transition-colors">{opt.label}</div>
                      <div className="font-sans text-xs text-on-surface-variant/50">{opt.sub}</div>
                    </div>
                    <span className="material-symbols-outlined !text-base text-on-surface-variant/30 ml-auto group-hover:text-primary/50 transition-colors">arrow_forward</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Mood ── */}
          {step === 2 && (
            <div className="animate-fade-in">
              <div className="mb-8">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-on-surface-variant/50 hover:text-on-surface transition-colors mb-4 font-mono text-[10px] uppercase tracking-widest"
                >
                  <span className="material-symbols-outlined !text-sm">arrow_back</span>
                  Back
                </button>
                <h2 className="font-display text-3xl font-light text-on-surface tracking-tight mb-2">
                  What mood are you in?
                </h2>
                <p className="font-sans text-sm text-on-surface-variant/60">
                  We'll suggest a raga to begin with — no AI call needed.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MOOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleMoodSelect(opt.value)}
                    className={`flex flex-col items-center gap-2 px-4 py-5 rounded-2xl border transition-all hover:scale-[1.03] active:scale-[0.98] ${opt.color}`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest font-bold">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Raga recommendation ── */}
          {step === 3 && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h2 className="font-display text-3xl font-light text-on-surface tracking-tight mb-2">
                  Your first raga
                </h2>
                <p className="font-sans text-sm text-on-surface-variant/60">
                  Based on your {mood?.toLowerCase()} mood.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 mb-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-primary/70 mb-1">
                      {raga?.tradition} · {raga?.rasa}
                    </div>
                    <div className="font-display text-4xl font-light text-on-surface">{raga?.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50 mt-1">{raga?.time}</div>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined !text-2xl text-primary/60">music_note</span>
                  </div>
                </div>
                <p className="font-sans text-sm text-on-surface-variant/70 leading-relaxed italic">
                  {raga?.reason}
                </p>
              </div>

              <button
                onClick={handleOpenStudio}
                disabled={saving}
                className="w-full py-4 rounded-2xl font-medium text-white flex items-center justify-center gap-3 shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:hover:scale-100"
                style={{ background: 'linear-gradient(to right, var(--primary), var(--accent))' }}
              >
                <span className="material-symbols-outlined !text-xl">piano</span>
                {saving ? 'Saving your path…' : `Start practising ${raga?.name}`}
              </button>

              <button
                onClick={handleSkip}
                disabled={saving}
                className="w-full mt-3 py-3 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50 hover:text-on-surface transition-colors disabled:opacity-50"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
