import { NextResponse } from 'next/server'
import { createClient as createApiClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rateLimit'

const LessonProgressSchema = z.object({
  lessonId: z.string().min(1, 'lessonId is required').max(100),
  completed: z.boolean().optional(),
  score: z.number().int().min(0).max(100).optional(),
}).strict()

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: string }).code
  const message = (error as { message?: string }).message ?? ''
  return code === 'PGRST205' || code === '42P01'
    || /relation .* does not exist|could not find the table .* in the schema cache/i.test(message)
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

    const { data, error } = await supabase
      .from('user_lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[lesson progress GET]', error)
      if (isMissingTableError(error)) {
        return NextResponse.json({ progress: [], degraded: true })
      }
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({ progress: data ?? [] })
  } catch (error) {
    console.error('[lesson progress GET]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = LessonProgressSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid lesson progress' },
        { status: 400 }
      )
    }

    const { lessonId, completed, score } = parsed.data
    if (completed === undefined && score === undefined) {
      return NextResponse.json(
        { error: 'At least one of completed or score is required' },
        { status: 400 }
      )
    }

    const { user, supabase } = await resolveUserAndClient(req)
    if (!user || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const rl = await checkRateLimit(user.id, 'write')
    if (!rl.allowed) return rateLimitedResponse(rl)

    const { data: existing, error: readError } = await supabase
      .from('user_lesson_progress')
      .select('best_score, completed, completed_at')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (readError) {
      console.error('[lesson progress PATCH read]', readError)
      if (isMissingTableError(readError)) {
        return NextResponse.json(
          { error: 'lesson_progress_unavailable', degraded: true },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    const now = new Date().toISOString()
    const { data: progress, error: upsertError } = await supabase
      .from('user_lesson_progress')
      .upsert(
        {
          user_id: user.id,
          lesson_id: lessonId,
          completed: completed ?? Boolean(existing?.completed),
          best_score: Math.max(existing?.best_score ?? 0, score ?? 0),
          completed_at: completed === undefined ? existing?.completed_at ?? null : completed ? now : null,
          updated_at: now,
        },
        { onConflict: 'user_id,lesson_id' }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('[lesson progress PATCH upsert]', upsertError)
      if (isMissingTableError(upsertError)) {
        return NextResponse.json(
          { error: 'lesson_progress_unavailable', degraded: true },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({ success: true, progress })
  } catch (error) {
    console.error('[lesson progress PATCH]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
