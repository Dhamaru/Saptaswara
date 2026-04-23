import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { checkRateLimitSync } from '@/lib/rateLimit'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

const nvidiaClient = process.env.NVIDIA_API_KEY
  ? new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    })
  : null

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

  const parseRagas = (text: string) => {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('No JSON in response')
    const parsed = JSON.parse(text.slice(start, end + 1))
    if (!Array.isArray(parsed.ragas) || parsed.ragas.length === 0) throw new Error('Invalid shape')
    return parsed.ragas.slice(0, 3)
  }

  // Try Gemini first
  if (process.env.GEMINI_API_KEY) {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: MOOD_SYSTEM,
      })
      const result = await model.generateContent(MOOD_PROMPT(mood))
      return NextResponse.json({ ragas: parseRagas(result.response.text()) })
    } catch (geminiErr: any) {
      const isQuota =
        geminiErr?.status === 429 ||
        geminiErr?.message?.includes('429') ||
        geminiErr?.message?.includes('Quota')
      if (!isQuota || !nvidiaClient) {
        console.error('[mood/route] gemini error:', geminiErr)
        return NextResponse.json({ error: 'Recommendation service unavailable — please try again.' }, { status: 500 })
      }
    }
  }

  // NVIDIA fallback
  if (nvidiaClient) {
    try {
      const completion = await nvidiaClient.chat.completions.create({
        model: 'meta/llama-3.3-70b-instruct',
        messages: [
          { role: 'system', content: MOOD_SYSTEM },
          { role: 'user', content: MOOD_PROMPT(mood) },
        ],
        max_tokens: 800,
        temperature: 0.5,
      })
      const text = completion.choices[0]?.message?.content ?? ''
      return NextResponse.json({ ragas: parseRagas(text) })
    } catch (nvErr) {
      console.error('[mood/route] nvidia error:', nvErr)
    }
  }

  return NextResponse.json({ error: 'No AI provider available — check GEMINI_API_KEY or NVIDIA_API_KEY.' }, { status: 503 })
}
