import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const VALID_MOODS = ['Calm', 'Romantic', 'Devotional', 'Melancholic', 'Joyful', 'Focus', 'Energetic']

const cache = new Map<string, { data: any[]; at: number }>()
const TTL = 5 * 60 * 1000 // 5 min — matches Cache-Control max-age=300

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ mood: string }> }
) {
  try {
    const { mood } = await params
    if (!VALID_MOODS.includes(mood)) {
      return NextResponse.json(
        { error: `Invalid mood. Valid values: ${VALID_MOODS.join(', ')}` },
        { status: 400 }
      )
    }

    const hit = cache.get(mood)
    if (hit && Date.now() - hit.at < TTL) {
      return NextResponse.json({ mood, ragas: hit.data }, {
        headers: { 'Cache-Control': 'public, max-age=300' },
      })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase
      .from('ragas')
      .select('id, name, tradition, time_of_day, mood, aroha, avaroha, vadi, samvadi')
      .ilike('mood', `%${mood}%`)
      .order('name')
      .limit(20)

    if (error) throw error

    cache.set(mood, { data: data ?? [], at: Date.now() })

    return NextResponse.json({ mood, ragas: data ?? [] }, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    })
  } catch (err: any) {
    console.error('[ragas/mood]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
