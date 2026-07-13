'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'saptaswara-onboarding-done'

type SkillLevel = 'Beginner' | 'Student' | 'Musician'
type Mood = 'Calm' | 'Romantic' | 'Devotional' | 'Melancholic' | 'Joyful'

interface RagaSuggestion {
  name: string
  tradition: string
  rasa: string
  time: string
  reason: string
}

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

export default function OnboardingModal() {
  const router = useRouter()
  const supabase = createClient()
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(1)
  const [skill, setSkill] = useState<SkillLevel | null>(null)
  const [mood, setMood] = useState<Mood | null>(null)
  const [raga, setRaga] = useState<RagaSuggestion | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) setShow(true)
  }, [])

  const persist = async (skillLevel: SkillLevel, onboardingMood: Mood, ragaName: string) => {
    localStorage.setItem(STORAGE_KEY, '1')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch('/api/users/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          skill_level: skillLevel,
          onboarding_mood: onboardingMood,
          preferred_ragas: [ragaName],
          onboarding_done: true,
        }),
      })
    } catch {}
  }

  const handleMoodSelect = async (m: Mood) => {
    setMood(m)
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/ai/mood', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ mood: m }),
      })
      const json = await res.json()
      if (json.ragas?.[0]) setRaga(json.ragas[0])
    } catch {}
    setLoading(false)
    setStep(3)
  }

  const handleOpenStudio = async () => {
    if (skill && mood && raga) await persist(skill, mood, raga.name)
    router.push(raga ? `/studio?raga_name=${encodeURIComponent(raga.name)}` : '/studio')
    setShow(false)
  }

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setShow(false)
  }

  if (!show) return null

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
              className="ml-auto font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30 hover:text-on-surface-variant transition-colors"
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
                  <span className="font-mono text-[9px] uppercase tracking-widest text-primary/70">Welcome</span>
                </div>
                <h2 className="font-display text-3xl font-light text-on-surface tracking-tight mb-2">
                  What brings you here?
                </h2>
                <p className="font-sans text-sm text-on-surface-variant/50">
                  This helps tailor your experience.
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
                      <div className="font-sans text-xs text-on-surface-variant/40">{opt.sub}</div>
                    </div>
                    <span className="material-symbols-outlined !text-base text-on-surface-variant/20 ml-auto group-hover:text-primary/40 transition-colors">arrow_forward</span>
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
                  className="flex items-center gap-1.5 text-on-surface-variant/40 hover:text-on-surface transition-colors mb-4 font-mono text-[9px] uppercase tracking-widest"
                >
                  <span className="material-symbols-outlined !text-sm">arrow_back</span>
                  Back
                </button>
                <h2 className="font-display text-3xl font-light text-on-surface tracking-tight mb-2">
                  What mood are you in?
                </h2>
                <p className="font-sans text-sm text-on-surface-variant/50">
                  We'll find a raga that matches.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MOOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleMoodSelect(opt.value)}
                    disabled={loading}
                    className={`flex flex-col items-center gap-2 px-4 py-5 rounded-2xl border transition-all disabled:opacity-50 ${opt.color} hover:scale-[1.03] active:scale-[0.98]`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <span className="font-mono text-[9px] uppercase tracking-widest font-bold">{opt.label}</span>
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
                <p className="font-sans text-sm text-on-surface-variant/50">
                  Based on your {mood?.toLowerCase()} mood.
                </p>
              </div>

              {loading ? (
                <div className="flex items-center gap-3 py-12 justify-center">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40">Finding your raga…</span>
                </div>
              ) : raga ? (
                <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 mb-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-primary/60 mb-1">{raga.tradition} · {raga.rasa}</div>
                      <div className="font-display text-4xl font-light text-on-surface">{raga.name}</div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 mt-1">{raga.time}</div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined !text-2xl text-primary/60">music_note</span>
                    </div>
                  </div>
                  <p className="font-sans text-sm text-on-surface-variant/60 leading-relaxed italic">
                    {raga.reason}
                  </p>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 mb-6">
                  <div className="font-display text-4xl font-light text-on-surface mb-2">Yaman</div>
                  <p className="font-sans text-sm text-on-surface-variant/50">An evening raga with a romantic, expansive character — perfect to start with.</p>
                </div>
              )}

              <button
                onClick={handleOpenStudio}
                className="w-full py-4 rounded-2xl font-medium text-white flex items-center justify-center gap-3 shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all"
                style={{ background: 'linear-gradient(to right, var(--primary), var(--accent))' }}
              >
                <span className="material-symbols-outlined !text-xl">piano</span>
                Open {raga?.name ?? 'Studio'} in Studio
              </button>

              <button
                onClick={handleSkip}
                className="w-full mt-3 py-3 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/30 hover:text-on-surface-variant transition-colors"
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
