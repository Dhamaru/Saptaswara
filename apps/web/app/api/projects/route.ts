import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rateLimit'

/**
 * Try cookie auth first (server SSR client); fall back to Bearer token.
 * Returns null if both fail.
 */
async function resolveUser(req: Request) {
  const supabase = await createClient()
  const { data: { user: cookieUser } } = await supabase.auth.getUser()
  if (cookieUser) return { user: cookieUser, supabase }

  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) return null

  const anonClient = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user: tokenUser }, error } = await anonClient.auth.getUser()
  if (error || !tokenUser) return null
  return { user: tokenUser, supabase: anonClient }
}

// GET: List all projects for the authenticated user
export async function GET(req: Request) {
  try {
    const resolved = await resolveUser(req)
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = resolved
    const rl = await checkRateLimit(user.id, 'read')
    if (!rl.allowed) return rateLimitedResponse(rl)

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
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = resolved
    const rl = await checkRateLimit(user.id, 'write')
    if (!rl.allowed) return rateLimitedResponse(rl)

    const body = await req.json()
    const { projectId, title, raga_id, bpm, sequence } = body

    if (!projectId) {
      const missing: string[] = []
      if (!title || typeof title !== 'string' || title.trim() === '') missing.push('title')
      if (title && title.length > 100) return NextResponse.json({ error: 'title exceeds 100 characters' }, { status: 400 })
      if (!raga_id || !/^[0-9a-f-]{36}$/i.test(raga_id)) missing.push('raga_id (valid UUID)')
      if (bpm !== undefined && (typeof bpm !== 'number' || bpm < 40 || bpm > 200)) return NextResponse.json({ error: 'bpm must be between 40 and 200' }, { status: 400 })
      if (missing.length) return NextResponse.json({ error: `Missing or invalid fields: ${missing.join(', ')}` }, { status: 400 })

      // Fix 5: Atomic project+layer creation via database RPC.
      // A single PL/pgSQL transaction prevents orphaned projects if the layer insert fails.
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('create_project_with_layer', {
          p_title:    title.trim(),
          p_raga_id:  raga_id,
          p_bpm:      bpm ?? 120,
          p_user_id:  user.id,
          p_sequence: sequence ?? null,
        })

      if (rpcError) {
        console.error('create_project_with_layer RPC error:', rpcError)
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
      }

      return NextResponse.json({ id: (rpcData as any).project_id, success: true })
    }

    // --- Update existing project ---

    // Build update payload — only include fields present in the request.
    const projectUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (title !== undefined) projectUpdate.title = title

    // Fix 4: Use .select().single() so Supabase returns PGRST116 if 0 rows match
    // (wrong ID or ownership mismatch). Without this, a 0-row update returns no error
    // and the caller gets a false { success: true }.
    const { data: updatedProject, error: uError } = await supabase
      .from('projects')
      .update(projectUpdate)
      .eq('id', projectId)
      .eq('user_id', user.id)
      .select('id')
      .single()

    if (uError || !updatedProject) {
      // PGRST116 = 0 rows; treat as not found / access denied.
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Update the layer's sequence if provided.
    if (sequence !== undefined) {
      // Fix 1: Check error from layer SELECT — a failure here must not silently
      // fall through to an insert that creates a duplicate layer.
      const { data: existingLayers, error: lSelectError } = await supabase
        .from('layers')
        .select('id')
        .eq('project_id', projectId)

      if (lSelectError) {
        console.error('layers SELECT error:', lSelectError)
        return NextResponse.json({ error: 'Failed to load project layers' }, { status: 500 })
      }

      if (existingLayers && existingLayers.length > 0) {
        // Fix 2: Check error from layer UPDATE — previously ignored entirely.
        const { error: lUpdateError } = await supabase
          .from('layers')
          .update({ events: { sequence } })
          .eq('id', existingLayers[0].id)

        if (lUpdateError) {
          console.error('layer UPDATE error:', lUpdateError)
          return NextResponse.json({ error: 'Failed to save layer' }, { status: 500 })
        }
      } else {
        // Fix 3: Check error from layer INSERT — previously ignored entirely.
        const { error: lInsertError } = await supabase
          .from('layers')
          .insert({
            project_id: projectId,
            name: 'Main Sequence',
            type: 'melody',
            events: { sequence },
          })

        if (lInsertError) {
          console.error('layer INSERT error:', lInsertError)
          return NextResponse.json({ error: 'Failed to save layer' }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ id: projectId, success: true })
  } catch (error: any) {
    console.error('Projects POST error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE: Delete a project
export async function DELETE(req: Request) {
  try {
    const resolved = await resolveUser(req)
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = resolved
    const rl = await checkRateLimit(user.id, 'write')
    if (!rl.allowed) return rateLimitedResponse(rl)

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })

    // Use .select() to detect 0-row deletes (wrong owner / already deleted).
    const { data: deleted, error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .single()

    if (error || !deleted) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Projects DELETE error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
