import { NextResponse } from 'next/server'
import { createClient as createApiClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import {
  diagnosePracticeSession,
  type PracticeDiagnosis,
  type PracticeSessionStats,
  type RagaGrammarContext,
} from '@saptaswara/core'
import { z } from 'zod'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rateLimit'

const StatsSchema = z.object({
  total: z.number().int().min(0).max(10000),
  correct: z.number().int().min(0).max(10000),
  wrongVariety: z.number().int().min(0).max(10000),
  varjya: z.number().int().min(0).max(10000),
  vadiHits: z.number().int().min(0).max(10000),
  noteCounts: z.record(z.string(), z.number().int().min(0).max(10000)),
}).strict()

const GrammarSchema = z.object({
  name: z.string().max(100).nullish(),
  vadi: z.string().max(100).nullish(),
  samvadi: z.string().max(100).nullish(),
  varjyaSwaras: z.array(z.string().max(100)).nullish(),
}).strict()

const CreateSessionSchema = z.object({
  ragaId: z.string().uuid().nullable().optional(),
  ragaName: z.string().min(1, 'ragaName is required').max(100),
  startedAt: z.string().datetime({ offset: true }).optional(),
  endedAt: z.string().datetime({ offset: true }).optional(),
  durationSeconds: z.number().int().min(0).max(86400).default(0),
  lessonId: z.string().max(100).nullable().optional(),
  stage: z.string().max(100).nullable().optional(),
  stats: StatsSchema,
  grammar: GrammarSchema.optional(),
  // The riyaz client sends its locally computed score; the server always
  // recomputes it from stats, so this field is accepted but ignored.
  score: z.number().int().min(0).max(100).optional(),
}).strict()

type MasteryLevel = 'Exploring' | 'Developing' | 'Proficient' | 'Strong'

function masteryLevel(bestScore: number): MasteryLevel {
  if (bestScore >= 90) return 'Strong'
  if (bestScore >= 70) return 'Proficient'
  if (bestScore >= 40) return 'Developing'
  return 'Exploring'
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: string }).code
  const message = (error as { message?: string }).message ?? ''
  return code === 'PGRST205' || code === '42P01' || /schema cache|does not exist/i.test(message)
}

function storageUnavailable(where: string, error: unknown) {
  console.error(`[practice sessions ${where}] storage unavailable:`, error)
  return NextResponse.json(
    { error: 'practice_storage_unavailable', degraded: true },
    { status: 503 }
  )
}

/** Extract and validate Bearer token; returns null if missing or malformed. */
function extractToken(req: Request): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7).trim()
  return token.length > 0 ? token : null
}

/** Resolves the authenticated user via cookies first, fallback to Bearer token. */
async function resolveUserAndClient(req: Request) {
  try {
    const serverClient = await createServerClient()
    const { data: { user }, error } = await serverClient.auth.getUser()
    if (user && !error) return { user, supabase: serverClient }
  } catch {
    // Cookie auth unavailable — fall through to Bearer token
  }

  const token = extractToken(req)
  if (token) {
    const apiClient = createApiClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user }, error } = await apiClient.auth.getUser()
    if (user && !error) return { user, supabase: apiClient }
  }

  return { user: null, supabase: null }
}

export async function GET(req: Request) {
  try {
    const { user, supabase } = await resolveUserAndClient(req)
    if (!user || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const rl = await checkRateLimit(user.id, 'read')
    if (!rl.allowed) return rateLimitedResponse(rl)

    const rawLimit = new URL(req.url).searchParams.get('limit')
    const requested = rawLimit === null ? 20 : Number(rawLimit)
    const limit = Number.isFinite(requested)
      ? Math.min(50, Math.max(1, Math.trunc(requested)))
      : 20

    const [sessionsResult, progressResult] = await Promise.all([
      supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('user_raga_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('last_practiced_at', { ascending: false })
        .limit(50),
    ])

    const error = sessionsResult.error ?? progressResult.error
    if (error) {
      if (isMissingTableError(error)) {
        console.error('[practice sessions GET] storage unavailable:', error)
        return NextResponse.json({ sessions: [], progress: [], degraded: true })
      }
      console.error('[practice sessions GET]', error)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({
      sessions: sessionsResult.data ?? [],
      progress: progressResult.data ?? [],
      degraded: false,
    })
  } catch (error) {
    console.error('[practice sessions GET]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = CreateSessionSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid session' },
        { status: 400 }
      )
    }

    const { ragaId, ragaName, startedAt, endedAt, durationSeconds, lessonId, stage, stats, grammar } = parsed.data

    if (stats.correct > stats.total) {
      return NextResponse.json({ error: 'correct cannot exceed total' }, { status: 400 })
    }

    const { user, supabase } = await resolveUserAndClient(req)
    if (!user || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const rl = await checkRateLimit(user.id, 'write')
    if (!rl.allowed) return rateLimitedResponse(rl)

    const now = new Date().toISOString()
    const score = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    const grammarContext: RagaGrammarContext = grammar ?? { name: ragaName }
    const diagnosis: PracticeDiagnosis = diagnosePracticeSession(
      stats as PracticeSessionStats,
      grammarContext
    )

    const { data: session, error: insertError } = await supabase
      .from('practice_sessions')
      .insert({
        user_id: user.id,
        raga_id: ragaId ?? null,
        raga_name: ragaName,
        started_at: startedAt ?? now,
        ended_at: endedAt ?? now,
        duration_seconds: durationSeconds,
        lesson_id: lessonId ?? null,
        stage: stage ?? null,
        session_stats: stats,
        score,
        feedback: diagnosis,
      })
      .select()
      .single()

    if (insertError) {
      if (isMissingTableError(insertError)) return storageUnavailable('insert', insertError)
      console.error('[practice sessions insert]', insertError)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    let ragaProgress: unknown = null
    if (ragaId) {
      const { data: existing, error: readError } = await supabase
        .from('user_raga_progress')
        .select('sessions_count, best_score')
        .eq('user_id', user.id)
        .eq('raga_id', ragaId)
        .maybeSingle()

      if (readError) {
        if (isMissingTableError(readError)) return storageUnavailable('raga progress read', readError)
        console.error('[practice sessions raga progress read]', readError)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
      }

      const bestScore = Math.max(existing?.best_score ?? 0, score)
      const { data: updated, error: upsertError } = await supabase
        .from('user_raga_progress')
        .upsert(
          {
            user_id: user.id,
            raga_id: ragaId,
            raga_name: ragaName,
            sessions_count: (existing?.sessions_count ?? 0) + 1,
            best_score: bestScore,
            latest_score: score,
            mastery_level: masteryLevel(bestScore),
            last_practiced_at: endedAt ?? now,
            updated_at: now,
          },
          { onConflict: 'user_id,raga_id' }
        )
        .select()
        .single()

      if (upsertError) {
        if (isMissingTableError(upsertError)) return storageUnavailable('raga progress upsert', upsertError)
        console.error('[practice sessions raga progress upsert]', upsertError)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
      }
      ragaProgress = updated
    }

    let lessonProgress: unknown = null
    if (lessonId && score >= 80) {
      const { data: existing, error: readError } = await supabase
        .from('user_lesson_progress')
        .select('best_score')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle()

      if (readError) {
        if (isMissingTableError(readError)) return storageUnavailable('lesson progress read', readError)
        console.error('[practice sessions lesson progress read]', readError)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
      }

      const { data: updated, error: upsertError } = await supabase
        .from('user_lesson_progress')
        .upsert(
          {
            user_id: user.id,
            lesson_id: lessonId,
            completed: true,
            best_score: Math.max(existing?.best_score ?? 0, score),
            completed_at: now,
            updated_at: now,
          },
          { onConflict: 'user_id,lesson_id' }
        )
        .select()
        .single()

      if (upsertError) {
        if (isMissingTableError(upsertError)) return storageUnavailable('lesson progress upsert', upsertError)
        console.error('[practice sessions lesson progress upsert]', upsertError)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
      }
      lessonProgress = updated
    }

    return NextResponse.json({
      success: true,
      session,
      diagnosis,
      progress: { raga: ragaProgress, lesson: lessonProgress },
    })
  } catch (error) {
    console.error('[practice sessions POST]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
