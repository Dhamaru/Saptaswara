import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PRAHARA_LABELS: Record<number, string> = {
  1: '6–9 AM', 2: '9 AM–12 PM', 3: '12–3 PM', 4: '3–6 PM',
  5: '6–9 PM', 6: '9 PM–12 AM', 7: '12–3 AM', 8: '3–6 AM',
}

const PRAHARA_NAMES: Record<number, string> = {
  1: 'Morning', 2: 'Late Morning', 3: 'Afternoon', 4: 'Late Afternoon',
  5: 'Evening', 6: 'Night', 7: 'Late Night', 8: 'Pre-Dawn',
}

function getCurrentPrahara(istHour: number): number {
  if (istHour >= 6  && istHour < 9)  return 1
  if (istHour >= 9  && istHour < 12) return 2
  if (istHour >= 12 && istHour < 15) return 3
  if (istHour >= 15 && istHour < 18) return 4
  if (istHour >= 18 && istHour < 21) return 5
  if (istHour >= 21)                  return 6
  if (istHour < 3)                    return 7
  return 8 // 3–6 AM
}

// Cache per prahara slot (changes every 3 hrs max)
let cache: { prahara: number; raga: any; cachedAt: number } | null = null
const TTL = 30 * 60 * 1000 // 30 min

export async function GET() {
  try {
    const nowUtc = new Date()
    const istMinutes = nowUtc.getUTCHours() * 60 + nowUtc.getUTCMinutes() + 330 // +5:30
    const istHour = Math.floor((istMinutes % 1440) / 60)
    const prahara = getCurrentPrahara(istHour)

    if (cache && cache.prahara === prahara && Date.now() - cache.cachedAt < TTL) {
      return NextResponse.json(cache.raga, {
        headers: { 'Cache-Control': 'public, max-age=1800' },
      })
    }

    const { data, error } = await supabase
      .from('ragas')
      .select('id, name, tradition, time_of_day, mood, aroha, avaroha, vadi, samvadi, prahara')
      .eq('prahara', prahara)

    if (error) throw error

    // Deterministic daily pick — rotate through matching ragas by day-of-year
    const ragas = data ?? []
    if (ragas.length === 0) {
      return NextResponse.json({ error: 'No raga found for current prahara' }, { status: 404 })
    }

    const dayOfYear = Math.floor(
      (nowUtc.getTime() - Date.UTC(nowUtc.getUTCFullYear(), 0, 0)) / 86400000
    )
    const raga = ragas[dayOfYear % ragas.length]

    const result = {
      ...raga,
      prahara,
      praharaLabel: PRAHARA_LABELS[prahara],
      praharaName: PRAHARA_NAMES[prahara],
    }

    cache = { prahara, raga: result, cachedAt: Date.now() }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, max-age=1800' },
    })
  } catch (err: any) {
    console.error('[ragas/today]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
