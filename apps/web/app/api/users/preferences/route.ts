import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAnonClient } from '@supabase/supabase-js'

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

export async function GET(req: Request) {
  try {
    const resolved = await resolveUser(req)
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = resolved

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ preferences: data })
  } catch (err: any) {
    console.error('[preferences GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const resolved = await resolveUser(req)
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = resolved

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const ALLOWED = ['skill_level', 'onboarding_mood', 'preferred_ragas', 'preferred_instruments', 'onboarding_done']
    const update: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() }
    for (const key of ALLOWED) {
      if (key in body) update[key] = body[key]
    }

    if (update.skill_level && !['Beginner', 'Student', 'Musician'].includes(update.skill_level as string)) {
      return NextResponse.json({ error: 'Invalid skill_level' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(update, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ preferences: data })
  } catch (err: any) {
    console.error('[preferences PATCH]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
