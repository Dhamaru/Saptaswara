import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { checkRateLimitSync } from '@/lib/rateLimit'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

const groqClient = process.env.GROQ_API_KEY
  ? new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  : null

const nvidiaClient = process.env.NVIDIA_API_KEY
  ? new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    })
  : null

const SYSTEM = `You are an expert tabla player and Indian classical music teacher.
Return ONLY valid JSON — no prose, no markdown fences, no explanation outside the JSON.`

const PROMPT = (ragaName: string, mood: string) => `Suggest 3 tabla patterns for Raga ${ragaName}${mood ? ` (mood: ${mood})` : ''}.

Return exactly this JSON array with 3 patterns:
[
  {
    "label": "Teentaal — steady",
    "taal": "Teentaal",
    "description": "one sentence why this rhythm suits the raga",
    "hits": [
      { "step": 1, "stroke": "Dha" },
      { "step": 2, "stroke": "Dhin" }
    ]
  }
]

Rules:
- Pattern 1: Teentaal (16 beats). Pattern 2: Keherwa (8 beats mapped to 16 steps). Pattern 3: Dadra (6 beats extended to 12 steps).
- steps are 1-indexed, 1–16 for all patterns
- Only use strokes from this set: Dha, Dhin, Na, Te, Ge, Ka, Ti
- Leave musical rests as gaps (omit those steps entirely — do NOT include null entries)
- Each pattern should have 8–12 filled steps (not all 16)
- Teentaal: emphasise beats 1, 5, 9, 13 (vibhag starts). First beat (sam) always gets Dha.
- Keherwa: two 8-beat phrases; sam on beat 1 always Dha.
- Dadra: two 6-beat phrases mapped across steps 1–6 and 7–12; light feel.`

function parsePatterns(text: string) {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error('No JSON array in response')

  const raw: any[] = JSON.parse(text.slice(start, end + 1))
  const VALID_STROKES = new Set(['Dha', 'Dhin', 'Na', 'Te', 'Ge', 'Ka', 'Ti'])

  const patterns = raw.slice(0, 3).map((p: any) => ({
    label: String(p.label ?? 'Pattern'),
    taal: String(p.taal ?? ''),
    description: String(p.description ?? ''),
    hits: (Array.isArray(p.hits) ? p.hits : [])
      .filter((h: any) =>
        typeof h.step === 'number' && h.step >= 1 && h.step <= 16 &&
        typeof h.stroke === 'string' && VALID_STROKES.has(h.stroke)
      )
      .map((h: any) => ({ step: h.step as number, stroke: h.stroke as string })),
  }))

  if (patterns.length === 0 || patterns.every(p => p.hits.length === 0)) {
    throw new Error('No valid patterns generated')
  }
  return patterns
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!checkRateLimitSync(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let ragaName: string, mood: string
  try {
    const body = await req.json()
    ragaName = (body.ragaName ?? '').trim()
    mood = (body.mood ?? '').trim()
    if (!ragaName) return NextResponse.json({ error: 'ragaName is required' }, { status: 400 })
    if (ragaName.length > 80) return NextResponse.json({ error: 'ragaName too long' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Try Gemini first
  if (process.env.GEMINI_API_KEY) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: SYSTEM })
      const result = await model.generateContent(PROMPT(ragaName, mood))
      return NextResponse.json({ patterns: parsePatterns(result.response.text()) })
    } catch (geminiErr: any) {
      const isQuota =
        geminiErr?.status === 429 ||
        geminiErr?.message?.includes('429') ||
        geminiErr?.message?.includes('Quota') ||
        geminiErr?.message?.includes('Too Many Requests')
      if (!isQuota || (!groqClient && !nvidiaClient)) {
        console.error('[beat-suggest] gemini error:', geminiErr)
        return NextResponse.json({ error: 'Failed to generate beat suggestions' }, { status: 500 })
      }
    }
  }

  // Groq fallback
  if (groqClient) {
    try {
      const completion = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: PROMPT(ragaName, mood) },
        ],
        max_tokens: 1200,
        temperature: 0.5,
      })
      const text = completion.choices[0]?.message?.content ?? ''
      return NextResponse.json({ patterns: parsePatterns(text) })
    } catch (groqErr) {
      console.error('[beat-suggest] groq error:', groqErr)
    }
  }

  // NVIDIA fallback
  if (nvidiaClient) {
    try {
      const completion = await nvidiaClient.chat.completions.create({
        model: 'meta/llama-3.3-70b-instruct',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: PROMPT(ragaName, mood) },
        ],
        max_tokens: 1200,
        temperature: 0.5,
      })
      const text = completion.choices[0]?.message?.content ?? ''
      return NextResponse.json({ patterns: parsePatterns(text) })
    } catch (nvErr) {
      console.error('[beat-suggest] nvidia error:', nvErr)
    }
  }

  return NextResponse.json({ error: 'No AI provider available' }, { status: 503 })
}
