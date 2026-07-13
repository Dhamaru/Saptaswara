'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import {
  Music,
  BookOpen,
  Library,
  Calendar,
  ChevronDown,
  Check,
  User,
  Sparkles,
  Activity,
  Heart,
} from 'lucide-react'

type SkillLevel = 'Beginner' | 'Student' | 'Musician'

interface ProfileData {
  email: string
  created_at: string
  skill_level: SkillLevel | null
  onboarding_mood: string | null
  onboarding_done: boolean
  compositions_count: number
  practice_sessions_count: number
  saved_ragas_count: number
  streak: number
  longest_streak: number
}

function computeStreak(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 }
  const unique = [...new Set(dates.map(d => d.slice(0, 10)))].sort().reverse()
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  let current = 0
  let longest = 0
  let streak = 0
  let prev: string | null = null

  for (const d of unique) {
    if (prev === null) {
      if (d === today || d === yesterday) { streak = 1 }
      else break
    } else {
      const diff = (new Date(prev).getTime() - new Date(d).getTime()) / 86400000
      if (diff === 1) { streak++ } else break
    }
    prev = d
    current = streak
  }

  // longest: scan all dates ascending
  const asc = [...unique].reverse()
  let run = 1
  for (let i = 1; i < asc.length; i++) {
    const diff = (new Date(asc[i]).getTime() - new Date(asc[i - 1]).getTime()) / 86400000
    if (diff === 1) { run++; longest = Math.max(longest, run) }
    else run = 1
  }
  longest = Math.max(longest, current, asc.length > 0 ? 1 : 0)
  return { current, longest }
}

const SKILL_LEVELS: SkillLevel[] = ['Beginner', 'Student', 'Musician']

const SKILL_COLORS: Record<SkillLevel, string> = {
  Beginner:  'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  Student:   'bg-primary/15 border-primary/30 text-primary-light',
  Musician:  'bg-amber-500/15 border-amber-500/30 text-amber-400',
}

const MOOD_COLORS: Record<string, string> = {
  Calm:        'bg-sky-500/10 border-sky-400/25 text-sky-400',
  Devotional:  'bg-violet-500/10 border-violet-400/25 text-violet-400',
  Energetic:   'bg-rose-500/10 border-rose-400/25 text-rose-400',
  Melancholic: 'bg-blue-500/10 border-blue-400/25 text-blue-400',
  Romantic:    'bg-pink-500/10 border-pink-400/25 text-pink-400',
  Serene:      'bg-cyan-500/10 border-cyan-400/25 text-cyan-400',
  Vibrant:     'bg-orange-500/10 border-orange-400/25 text-orange-400',
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-surface-container-low/40 animate-pulse ${className ?? ''}`} />
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedRagas, setSavedRagas] = useState<{ id: string; name: string }[]>([])
  const [practiceDates, setPracticeDates] = useState<string[]>([])

  // Skill-level dropdown state
  const [skillDropdownOpen, setSkillDropdownOpen] = useState(false)
  const [skillSaving, setSkillSaving] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSkillDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    document.title = 'My Profile — Saptaswara'
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    ;(async () => {
      try {
        // 1. Session check — redirect if unauthenticated
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/login?next=/profile')
          return
        }

        const { user } = session
        const token = session.access_token

        // 2. Parallel fetch: preferences + projects
        const [prefsRes, projectsRes] = await Promise.all([
          fetch('/api/users/preferences', {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }),
          fetch('/api/projects', {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }),
        ])

        const prefsJson   = prefsRes.ok   ? await prefsRes.json()   : {}
        const projectsJson = projectsRes.ok ? await projectsRes.json() : []

        const prefs      = prefsJson.preferences ?? {}
        const projectCount = Array.isArray(projectsJson) ? projectsJson.length : 0

        // 3. Practice logs: dates for streak + total count
        const { data: logRows } = await supabase
          .from('practice_logs')
          .select('logged_at')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(365)
        const logsCount = logRows?.length ?? 0
        setPracticeDates((logRows ?? []).map((r: any) => (r.logged_at ?? r.created_at ?? '').slice(0, 10)))
        const { current: streak, longest: longest_streak } = computeStreak(
          (logRows ?? []).map((r: any) => r.logged_at ?? r.created_at ?? '')
        )

        // 4. Favourite ragas from localStorage
        let savedRagasCount = 0
        let favIds: string[] = []
        try {
          const raw = localStorage.getItem('saptaswara-favourites')
          if (raw) {
            const arr = JSON.parse(raw)
            if (Array.isArray(arr)) { favIds = arr; savedRagasCount = arr.length }
          }
        } catch {}
        if (favIds.length > 0) {
          try {
            const { data: ragaRows } = await supabase
              .from('ragas')
              .select('id, name')
              .in('id', favIds.slice(0, 12))
            if (ragaRows) setSavedRagas(ragaRows)
          } catch {}
        }

        setData({
          email:                   user.email ?? '',
          created_at:              user.created_at ?? '',
          skill_level:             prefs.skill_level   ?? null,
          onboarding_mood:         prefs.onboarding_mood ?? null,
          onboarding_done:         !!prefs.onboarding_done,
          compositions_count:      projectCount,
          practice_sessions_count: logsCount,
          saved_ragas_count:       savedRagasCount,
          streak,
          longest_streak,
        })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('[profile] fetch error', err)
      } finally {
        setLoading(false)
      }
    })()

    return () => controller.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSkillChange(level: SkillLevel) {
    if (!data || skillSaving) return
    setSkillDropdownOpen(false)
    setSkillSaving(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/users/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ skill_level: level }),
      })

      if (res.ok) {
        setData(prev => prev ? { ...prev, skill_level: level } : prev)
      }
    } catch (err) {
      console.error('[profile] skill patch error', err)
    } finally {
      setSkillSaving(false)
    }
  }

  // ── Avatar initial ─────────────────────────────────────────────────────────
  const avatarLetter = data?.email?.charAt(0).toUpperCase() ?? '?'

  // ── Member since ───────────────────────────────────────────────────────────
  const memberSince = data?.created_at
    ? new Date(data.created_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—'

  const moodColor =
    data?.onboarding_mood && MOOD_COLORS[data.onboarding_mood]
      ? MOOD_COLORS[data.onboarding_mood]
      : 'bg-surface-container-high/40 border-outline-variant/20 text-on-surface-variant/60'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-lowest overflow-x-hidden">
      <Navbar />

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 dot-pattern opacity-[0.12]" />
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/4 rounded-full blur-[100px]" />
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-6 pt-28 pb-20 space-y-8 animate-fade-in">

        {/* ── Page label ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-on-surface-variant/50 font-bold">
            Resonance Identity
          </span>
        </div>

        {/* ── Hero card ───────────────────────────────────────────────────── */}
        <div className="relative rounded-[32px] bg-surface-container-lowest border border-outline-variant/10 p-8 md:p-10">
          {/* Subtle radial gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-7">
            {/* Avatar */}
            {loading ? (
              <SkeletonBlock className="w-20 h-20 shrink-0 rounded-3xl" />
            ) : (
              <div
                className="w-20 h-20 shrink-0 rounded-3xl flex items-center justify-center text-3xl font-black text-on-primary shadow-glow select-none"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
              >
                {avatarLetter}
              </div>
            )}

            {/* Identity details */}
            <div className="flex-1 min-w-0 space-y-2">
              {loading ? (
                <>
                  <SkeletonBlock className="h-5 w-52" />
                  <SkeletonBlock className="h-3.5 w-36" />
                </>
              ) : (
                <>
                  <p className="font-sans text-lg font-semibold text-on-surface truncate">
                    {data?.email}
                  </p>
                  <div className="flex items-center gap-2 text-on-surface-variant/40">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span className="font-mono text-[9px] uppercase tracking-widest">
                      Member since {memberSince}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Skill level badge + dropdown */}
            <div className="relative shrink-0" ref={dropdownRef}>
              {loading ? (
                <SkeletonBlock className="h-8 w-28 rounded-full" />
              ) : (
                <>
                  <button
                    onClick={() => setSkillDropdownOpen(v => !v)}
                    disabled={skillSaving}
                    title="Change skill level"
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full border font-mono text-[9px] uppercase tracking-widest font-bold transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                      data?.skill_level
                        ? SKILL_COLORS[data.skill_level]
                        : 'bg-surface-container-high/40 border-outline-variant/20 text-on-surface-variant/50'
                    }`}
                  >
                    {skillSaving ? (
                      <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <User className="w-2.5 h-2.5" />
                    )}
                    {data?.skill_level ?? 'Set Level'}
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${skillDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {skillDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-40 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-2xl overflow-hidden z-50 animate-fade-in">
                      {SKILL_LEVELS.map(level => (
                        <button
                          key={level}
                          onClick={() => handleSkillChange(level)}
                          className={`w-full flex items-center justify-between px-4 py-3 font-mono text-[9px] uppercase tracking-widest transition-colors hover:bg-primary/8 ${
                            data?.skill_level === level
                              ? 'text-primary bg-primary/10'
                              : 'text-on-surface-variant/60'
                          }`}
                        >
                          {level}
                          {data?.skill_level === level && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: <Music className="w-5 h-5" />,
              label: 'Compositions',
              value: data?.compositions_count ?? 0,
              color: 'text-primary-light',
              blob: 'bg-primary/10',
            },
            {
              icon: <Activity className="w-5 h-5" />,
              label: 'Practice Sessions',
              value: data?.practice_sessions_count ?? 0,
              color: 'text-emerald-400',
              blob: 'bg-emerald-500/10',
            },
            {
              icon: <Heart className="w-5 h-5" />,
              label: 'Saved Ragas',
              value: data?.saved_ragas_count ?? 0,
              color: 'text-rose-400',
              blob: 'bg-rose-500/10',
            },
          ].map(stat => (
            <div
              key={stat.label}
              className="relative overflow-hidden rounded-3xl bg-surface-container-lowest border border-outline-variant/10 p-5 flex flex-col gap-3 group"
            >
              <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${stat.blob} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

              {loading ? (
                <>
                  <SkeletonBlock className="h-8 w-8 rounded-xl" />
                  <SkeletonBlock className="h-7 w-14" />
                  <SkeletonBlock className="h-2.5 w-20" />
                </>
              ) : (
                <>
                  <div className={`${stat.color} opacity-70`}>{stat.icon}</div>
                  <span className="font-display text-3xl font-light text-on-surface tracking-tight">
                    {stat.value}
                  </span>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40">
                    {stat.label}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>

        {/* ── Practice streak ─────────────────────────────────────────────── */}
        <div className="rounded-[28px] bg-surface-container-lowest border border-outline-variant/10 px-7 py-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">🔥</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40">Practice Streak</span>
          </div>
          {loading ? (
            <div className="flex gap-6">
              <SkeletonBlock className="h-10 w-20" />
              <SkeletonBlock className="h-10 w-20" />
            </div>
          ) : (
            <div className="flex items-end gap-8">
              <div>
                <span className="font-display text-5xl font-light text-on-surface tracking-tight">
                  {data?.streak ?? 0}
                </span>
                <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 ml-2">day{data?.streak !== 1 ? 's' : ''} current</span>
              </div>
              <div className="pb-1">
                <span className="font-display text-2xl font-light text-on-surface-variant/50">{data?.longest_streak ?? 0}</span>
                <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30 ml-2">best</span>
              </div>
              {(data?.streak ?? 0) === 0 && (
                <p className="font-mono text-[9px] text-on-surface-variant/30 pb-1">Log a session today to start your streak.</p>
              )}
            </div>
          )}
        </div>

        {/* ── Preferred mood ──────────────────────────────────────────────── */}
        <div className="rounded-[28px] bg-surface-container-lowest border border-outline-variant/10 px-7 py-6 flex items-center gap-5">
          <div className="w-10 h-10 rounded-2xl glass-gold flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary-light" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 block">
              Preferred Mood
            </span>
            {loading ? (
              <SkeletonBlock className="h-4 w-24" />
            ) : data?.onboarding_mood ? (
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full border font-mono text-[9px] uppercase tracking-widest font-bold ${moodColor}`}
              >
                {data.onboarding_mood}
              </span>
            ) : (
              <span className="font-sans text-sm text-on-surface-variant/40 italic">
                Not set — complete onboarding to personalise your experience.
              </span>
            )}
          </div>
          {!loading && !data?.onboarding_done && (
            <Link
              href="/dashboard"
              className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
            >
              Complete setup →
            </Link>
          )}
        </div>

        {/* ── Practice analytics ──────────────────────────────────────────── */}
        {practiceDates.length > 0 && (
          <div className="rounded-[28px] bg-surface-container-lowest border border-outline-variant/10 px-7 py-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="material-symbols-outlined !text-base text-primary/50">bar_chart</span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40">Practice Activity — Last 12 Weeks</span>
            </div>
            {(() => {
              const today = new Date()
              const dateSet = new Set(practiceDates)
              const weeks: { label: string; days: number }[] = []
              for (let w = 11; w >= 0; w--) {
                let days = 0
                const weekStart = new Date(today)
                weekStart.setDate(today.getDate() - w * 7 - today.getDay())
                const label = weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                for (let d = 0; d < 7; d++) {
                  const day = new Date(weekStart)
                  day.setDate(weekStart.getDate() + d)
                  if (dateSet.has(day.toISOString().slice(0, 10))) days++
                }
                weeks.push({ label, days })
              }
              const maxDays = Math.max(...weeks.map(w => w.days), 1)
              return (
                <div className="flex items-end gap-1.5 h-20">
                  {weeks.map((week, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        className="w-full rounded-t-sm transition-all duration-500"
                        style={{
                          height: `${Math.max(4, (week.days / maxDays) * 64)}px`,
                          background: week.days === 0
                            ? 'rgba(255,255,255,0.05)'
                            : `rgba(99,102,241,${0.25 + (week.days / maxDays) * 0.65})`,
                        }}
                        title={`${week.label}: ${week.days} day${week.days !== 1 ? 's' : ''}`}
                      />
                      {i % 3 === 0 && (
                        <span className="font-mono text-[6px] text-on-surface-variant/25 whitespace-nowrap hidden sm:block">{week.label}</span>
                      )}
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {/* ── Saved ragas quick-launch ────────────────────────────────────── */}
        {savedRagas.length > 0 && (
          <div className="space-y-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-on-surface-variant/35 block px-1">
              Saved Ragas
            </span>
            <div className="flex flex-wrap gap-2">
              {savedRagas.map(r => (
                <div key={r.id} className="flex items-center gap-0.5 rounded-xl bg-surface-container-lowest border border-outline-variant/10 overflow-hidden">
                  <span className="px-3 py-2 font-display text-sm font-light text-on-surface">{r.name}</span>
                  <Link
                    href={`/studio?raga_name=${encodeURIComponent(r.name)}`}
                    title="Open in Studio"
                    className="px-2 py-2 text-on-surface-variant/30 hover:text-primary hover:bg-primary/8 transition-all"
                  >
                    <Music className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/riyaz?raga_name=${encodeURIComponent(r.name)}`}
                    title="Open in Saadhana"
                    className="px-2 py-2 text-on-surface-variant/30 hover:text-secondary hover:bg-secondary/8 transition-all border-l border-outline-variant/10"
                  >
                    <Activity className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Quick navigation ────────────────────────────────────────────── */}
        <div className="space-y-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-on-surface-variant/35 block px-1">
            Quick Access
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                href:  '/studio',
                icon:  <Music className="w-5 h-5" />,
                label: 'Go to Studio',
                sub:   'Compose & play',
              },
              {
                href:  '/library',
                icon:  <Library className="w-5 h-5" />,
                label: 'Browse Library',
                sub:   'Explore ragas',
              },
              {
                href:  '/journal',
                icon:  <BookOpen className="w-5 h-5" />,
                label: 'Open Journal',
                sub:   'Log practice',
              },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 hover:border-primary/25 hover:bg-primary/5 transition-all"
              >
                <div className="w-10 h-10 rounded-xl glass-light flex items-center justify-center text-on-surface-variant/40 group-hover:text-primary-light group-hover:bg-primary/10 transition-all shrink-0">
                  {link.icon}
                </div>
                <div className="min-w-0">
                  <p className="font-sans text-sm font-semibold text-on-surface leading-tight">
                    {link.label}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/35 mt-0.5">
                    {link.sub}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}
