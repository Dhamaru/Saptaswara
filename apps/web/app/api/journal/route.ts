import { NextResponse } from 'next/server'
import { createClient as createApiClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rateLimit'

const JournalSchema = z.object({
  raga: z.string().min(1, 'raga is required').max(100, 'raga exceeds 100 characters'),
  // Fix 7: notes had no max length — a multi-megabyte payload caused DB storage bloat and OOM risk.
  notes: z.string().min(1, 'notes is required').max(5000, 'notes exceeds 5000 characters'),
  intensity: z.enum(['Deep', 'Meditative', 'Focused', 'Light', 'Creative']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional(),
})

/** Extract and validate Bearer token; returns null if missing or malformed. */
function extractToken(req: Request): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7).trim()
  return token.length > 0 ? token : null
}

/** Resolves the authenticated user via cookies first, fallback to Bearer token. */
async function resolveUserAndClient(req: Request) {
  // 1. Try Cookie Authentication
  try {
    const serverClient = await createServerClient()
    const { data: { user }, error } = await serverClient.auth.getUser()
    if (user && !error) return { user, supabase: serverClient }
  } catch {
    // Cookie auth unavailable — fall through to Bearer token
  }

  // 2. Try Bearer Token Authentication
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
      .from('practice_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })

    if (error) {
      console.error('Journal GET error:', error)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Journal GET error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const parsed = JournalSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { raga, notes, intensity, date } = parsed.data

    const { user, supabase } = await resolveUserAndClient(req)
    if (!user || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const rl = await checkRateLimit(user.id, 'write')
    if (!rl.allowed) return rateLimitedResponse(rl)

    const { data, error } = await supabase.from('practice_logs').insert([
      {
        user_id: user.id,
        raga,
        notes,
        intensity,
        log_date: date || new Date().toISOString().split('T')[0],
      },
    ]).select().single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
