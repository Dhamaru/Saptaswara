import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAnonClient } from '@supabase/supabase-js'

/**
 * Try cookie auth first (server SSR client); fall back to Bearer token.
 * Returns null if both fail.
 */
async function resolveUser(req: Request) {
  // 1. Cookie-based auth (works for browser navigation)
  const supabase = await createClient()
  const { data: { user: cookieUser } } = await supabase.auth.getUser()
  if (cookieUser) return { user: cookieUser, supabase }

  // 2. Bearer token fallback (works for fetch() from client components)
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) return null

  // Inject Bearer token at client init so all subsequent DB queries
  // carry the JWT and RLS policies evaluate against the correct user.
  const anonClient = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user: tokenUser }, error } = await anonClient.auth.getUser()
  if (error || !tokenUser) {
    // Guest bypass for development/testing
    const { searchParams } = new URL(req.url)
    if ((searchParams.get('guest') === 'true' || req.headers.get('x-guest-auth') === 'true') && process.env.NODE_ENV === 'development') {
      return { 
        user: { id: 'guest-user', email: 'guest@saptaswara.ai' } as any, 
        supabase: anonClient 
      }
    }
    return null
  }
  return { user: tokenUser, supabase: anonClient }
}

// GET: List all projects for the authenticated user
export async function GET(req: Request) {
  try {
    const resolved = await resolveUser(req)
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user, supabase } = resolved

    const { data, error } = await supabase
      .from('projects')
      .select('id, title, raga_id, updated_at, ragas ( name )')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Projects GET error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST: Create or update a project
export async function POST(req: Request) {
  try {
    const resolved = await resolveUser(req)
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user, supabase } = resolved

    const body = await req.json()
    const { projectId, title, raga_id, bpm, sequence } = body

    let currentPid = projectId

    if (!currentPid) {
      // Create new project associated with user
      const { data: project, error: pError } = await supabase
        .from('projects')
        .insert({ 
          title, 
          raga_id, 
          bpm: bpm || 120,
          user_id: user.id 
        })
        .select()
        .single()

      if (pError) throw pError
      currentPid = project.id
    } else {
      // Update existing project (ensure ownership)
      const { error: uError } = await supabase
        .from('projects')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', currentPid)
        .eq('user_id', user.id)

      if (uError) throw uError
    }

    // Save/Update the layer (associated via project ownership checked above)
    const { data: existingLayers } = await supabase
      .from('layers')
      .select('id')
      .eq('project_id', currentPid)

    if (existingLayers && existingLayers.length > 0) {
      await supabase
        .from('layers')
        .update({ events: { sequence } })
        .eq('id', existingLayers[0].id)
    } else {
      await supabase
        .from('layers')
        .insert({
          project_id: currentPid,
          name: 'Main Sequence',
          type: 'keyboard',
          events: { sequence }
        })
    }

    return NextResponse.json({ id: currentPid, success: true })
  } catch (error: any) {
    console.error('Projects POST error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE: Delete a project
export async function DELETE(req: Request) {
  try {
    const resolved = await resolveUser(req)
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user, supabase } = resolved

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Projects DELETE error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
