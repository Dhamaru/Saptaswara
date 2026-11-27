import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rateLimit'
import {
  DEFAULT_LEARNING_PREFERENCES,
  type LearningPreferences,
} from '@/lib/learningPreferences'

async function resolveUser(req: Request) {
  try {
    const serverClient = await createServerClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (user) return { user, supabase: serverClient }
  } catch {}

  const auth = req.headers.get('Authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null
  if (!token) return null

  const client = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  return { user, supabase: client }
}

// Strict schema validation for all preference fields.
const PreferencesSchema = z.object({
  skill_level:           z.enum(['Beginner', 'Student', 'Musician']).optional(),
  onboarding_mood:       z.string().max(100).optional(),
  onboarding_done:       z.boolean().optional(),
  preferred_ragas:       z.array(z.string().max(100)).max(50).optional(),
  preferred_instruments: z.array(z.string().max(100)).max(20).optional(),
}).strict()

function withDefaults(row: Partial<LearningPreferences> | null): LearningPreferences {
  return { ...DEFAULT_LEARNING_PREFERENCES, ...(row ?? {}) }
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: string }).code
  const message = (error as { message?: string }).message ?? ''
  return code === 'PGRST205' || code === '42P01' || /schema cache|does not exist/i.test(message)
}

export async function GET(req: Request) {
  try {
    const resolved = await resolveUser(req)
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = resolved
    const rl = await checkRateLimit(user.id, 'read')
    if (!rl.allowed) return rateLimitedResponse(rl)

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      // Activation must never be blocked by a missing/degraded preferences
      // table. Return the safe default shape and let the client fall back to
      // its local cache while still allowing practice to start.
      console.error('[preferences GET]', error)
      return NextResponse.json({
        preferences: DEFAULT_LEARNING_PREFERENCES,
        degraded: true,
      })
    }

    return NextResponse.json({ preferences: withDefaults(data as any), degraded: false })
  } catch (err) {
    console.error('[preferences GET]', err)
    return NextResponse.json({
      preferences: DEFAULT_LEARNING_PREFERENCES,
      degraded: true,
    })
  }
}

export async function PATCH(req: Request) {
  try {
    const resolved = await resolveUser(req)
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = resolved
    const rl = await checkRateLimit(user.id, 'write')
    if (!rl.allowed) return rateLimitedResponse(rl)

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = PreferencesSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid preferences' }, { status: 400 })
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'No preference fields provided' }, { status: 400 })
    }

    const update = {
      user_id:    user.id,
      updated_at: new Date().toISOString(),
      ...parsed.data,
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(update, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) {
      console.error('[preferences PATCH]', error)
      return NextResponse.json(
        {
          error: isMissingTableError(error) ? 'preferences_unavailable' : 'Something went wrong',
          degraded: true,
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ preferences: withDefaults(data as any), degraded: false })
  } catch (err) {
    console.error('[preferences PATCH]', err)
    return NextResponse.json({ error: 'Something went wrong', degraded: true }, { status: 503 })
  }
}
