import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAnonClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Auth helper — cookie-first, Bearer-token fallback (matches /api/projects)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Request body shape
// ---------------------------------------------------------------------------
interface AnalyseBody {
  score: number
  noteBreakdown: Record<string, number>
  dominantSwara: string | null
  nonRagaCount: number
  ragaId: string
}

const UUID_RE = /^[0-9a-f-]{36}$/i

// ---------------------------------------------------------------------------
// POST /api/layers/[id]/analyse
// Persists a raga conformance score for a voice-recording layer.
// ---------------------------------------------------------------------------
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Resolve authenticated user
    const resolved = await resolveUser(req)
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user, supabase } = resolved

    // 2. Await dynamic route param (Next.js 15+/16 params are async)
    const { id: layerId } = await params

    // Fix 10: Validate layerId from URL before using it in any DB query.
    if (!UUID_RE.test(layerId)) {
      return NextResponse.json({ error: 'Invalid layer id' }, { status: 400 })
    }

    // 3. Parse + validate request body
    let body: AnalyseBody
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { score, noteBreakdown, dominantSwara, nonRagaCount, ragaId } = body

    // score: must be a finite float in [0, 100]
    if (
      typeof score !== 'number' ||
      !isFinite(score) ||
      score < 0 ||
      score > 100
    ) {
      return NextResponse.json(
        { error: 'score must be a number between 0 and 100' },
        { status: 400 }
      )
    }

    // ragaId: must be a valid UUID
    if (!ragaId || !UUID_RE.test(ragaId)) {
      return NextResponse.json(
        { error: 'ragaId must be a valid UUID' },
        { status: 400 }
      )
    }

    // noteBreakdown: must be a plain object (keys → numbers)
    if (
      typeof noteBreakdown !== 'object' ||
      noteBreakdown === null ||
      Array.isArray(noteBreakdown)
    ) {
      return NextResponse.json(
        { error: 'noteBreakdown must be a plain object' },
        { status: 400 }
      )
    }

    // nonRagaCount: integer >= 0
    if (
      typeof nonRagaCount !== 'number' ||
      !Number.isInteger(nonRagaCount) ||
      nonRagaCount < 0
    ) {
      return NextResponse.json(
        { error: 'nonRagaCount must be a non-negative integer' },
        { status: 400 }
      )
    }

    // dominantSwara: string or null
    if (dominantSwara !== null && typeof dominantSwara !== 'string') {
      return NextResponse.json(
        { error: 'dominantSwara must be a string or null' },
        { status: 400 }
      )
    }

    // 4. Verify the layer exists and belongs to the authenticated user
    //    Uses an explicit JOIN so a single query enforces ownership.
    const { data: layerRow, error: layerError } = await supabase
      .from('layers')
      .select('id, projects!inner(user_id)')
      .eq('id', layerId)
      .eq('projects.user_id', user.id)
      .single()

    if (layerError || !layerRow) {
      return NextResponse.json(
        { error: 'Layer not found or access denied' },
        { status: 404 }
      )
    }

    // 5. Insert conformance score record
    const { data: insertedRow, error: insertError } = await supabase
      .from('conformance_scores')
      .insert({
        layer_id: layerId,
        raga_id: ragaId,
        score,
        note_breakdown: noteBreakdown,
        dominant_swara: dominantSwara,
        non_raga_count: nonRagaCount,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('conformance_scores insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save conformance score' }, { status: 500 })
    }

    // 6. Denormalise: update layers.conformance_score for quick reads
    const { error: updateError } = await supabase
      .from('layers')
      .update({ conformance_score: score })
      .eq('id', layerId)

    if (updateError) {
      // Non-fatal: score is already in conformance_scores; log and continue.
      console.warn('layers.conformance_score update failed:', updateError)
    }

    // 7. Success
    return NextResponse.json({ success: true, id: insertedRow.id })
  } catch (err: unknown) {
    console.error('POST /api/layers/[id]/analyse error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
