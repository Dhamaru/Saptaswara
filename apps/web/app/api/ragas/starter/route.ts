import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const STARTER_NAMES = ['Yaman', 'Bhoopali', 'Bhimpalasi', 'Bhairavi', 'Desh', 'Kafi', 'Hamsadhwani', 'Durga']

let cache: any[] | null = null
let cacheAt = 0
const TTL = 60 * 60 * 1000 // 1 hour

export async function GET() {
  try {
    if (cache && Date.now() - cacheAt < TTL) {
      return NextResponse.json({ ragas: cache }, {
        headers: { 'Cache-Control': 'public, max-age=3600' },
      })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase
      .from('ragas')
      .select('id, name, tradition, time_of_day, mood, aroha, avaroha, vadi, samvadi')
      .in('name', STARTER_NAMES)
      .order('name')

    if (error) throw error

    cache = data ?? []
    cacheAt = Date.now()

    return NextResponse.json({ ragas: cache }, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    })
  } catch (err: any) {
    console.error('[ragas/starter]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
