import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: List all projects for the authenticated user
export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('projects')
      .select('id, title, raga_id, updated_at, ragas ( name )')
      .eq('user_id', user.id)
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
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Delete a project
export async function DELETE(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
