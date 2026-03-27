import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for server-side operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: List all projects
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, title, raga_id, updated_at, ragas ( name )')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create or update a project
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { projectId, title, raga_id, bpm, sequence } = body

    let currentPid = projectId

    if (!currentPid) {
      // Create new project (no user_id for dev mode)
      const { data: project, error: pError } = await supabase
        .from('projects')
        .insert({ title, raga_id, bpm: bpm || 120 })
        .select()
        .single()

      if (pError) throw pError
      currentPid = project.id
    } else {
      // Update existing project
      const { error: uError } = await supabase
        .from('projects')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', currentPid)

      if (uError) throw uError
    }

    // Save/Update the layer
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Delete a project
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
