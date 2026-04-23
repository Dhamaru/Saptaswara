import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { checkRateLimitSync } from '@/lib/rateLimit'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const MOOD_SYSTEM = `You are an Indian classical music scholar. Your job is to recommend ragas that match a given emotional state or mood description.
Return ONLY valid JSON — no prose, no markdown fences, no explanation outside the JSON object.`

const MOOD_PROMPT = (mood: string) => `The user describes their mood or desire as: "${mood}"

Recommend exactly 3 ragas that best express or suit this mood. Choose from the Indian classical canon (Hindustani and/or Carnatic).

Return this exact JSON shape:
{
  "ragas": [
    {
      "name": "string — raga name in standard English romanisation",
      "tradition": "Hindustani" or "Carnatic",
      "rasa": "string — the emotional quality (e.g. Shanta, Karuna, Shringar)",
      "time": "string — traditional time of day or season (e.g. Late night, Early morning, Monsoon)",
      "reason": "string — one sentence explaining why this raga suits the mood"
    }
  ]
}

Rules:
- All 3 ragas must be real, well-documented ragas
- Mix traditions if appropriate
- Prefer ragas that beginners can explore (not ultra-obscure)
- reason must be specific to the user's stated mood, not generic`

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const allowed = checkRateLimitSync(ip)
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let mood: string
  try {
    const body = await req.json()
    mood = (body.mood ?? '').trim()
    if (!mood) return NextResponse.json({ error: 'mood is required' }, { status: 400 })
    if (mood.length > 300) return NextResponse.json({ error: 'mood too long' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: MOOD_SYSTEM,
    })

    const result = await model.generateContent(MOOD_PROMPT(mood))
    const text = result.response.text()

    // Extract JSON from the response (tolerate any wrapping prose)
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('No JSON in response')

    const parsed = JSON.parse(text.slice(start, end + 1))
    if (!Array.isArray(parsed.ragas) || parsed.ragas.length === 0) {
      throw new Error('Invalid response shape')
    }

    return NextResponse.json({ ragas: parsed.ragas.slice(0, 3) })
  } catch (err) {
    console.error('[mood/route] error:', err)
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 })
  }
}
