import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { checkRateLimitSync } from '@/lib/rateLimit'
import { getVarjyaNotes, stripOctave } from '@/lib/ragaUtils'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

const groqClient = process.env.GROQ_API_KEY
  ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
  : null

const nvidiaClient = process.env.NVIDIA_API_KEY
  ? new OpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: 'https://integrate.api.nvidia.com/v1' })
  : null

const GENERATE_SYSTEM = `You are a composer of Indian classical music. Generate step-sequencer patterns following strict raga grammar.
Return ONLY valid JSON — no prose, no markdown fences.`

interface GenerateBody {
  ragaName: string
  aroha: string[]
  avaroha: string[]
  vadi?: string
  samvadi?: string
  steps: number       // 8, 16, or 32
  prompt?: string     // user direction e.g. "ascending, slow"
}

function buildPrompt(body: GenerateBody): string {
  const allAllowed = [...new Set([...body.aroha, ...body.avaroha])]
  return `Compose a ${body.steps}-step melodic sequence in Raga ${body.ragaName}.

Raga grammar:
- Aroha (ascending): ${body.aroha.join(' ')}
- Avaroha (descending): ${body.avaroha.join(' ')}
- Allowed notes (union): ${allAllowed.join(' ')}
- Vadi (most important note): ${body.vadi ?? 'unknown'}
- Samvadi (second most important): ${body.samvadi ?? 'unknown'}

User direction: "${body.prompt || 'a musical phrase that explores this raga'}"

Rules:
1. Only use notes from the allowed list above — never use notes outside it
2. Emphasise the Vadi note — it should appear at least twice
3. Octaves: 3=low (Mandra), 4=middle (Madhya), 5=high (Taar) — use 4 mostly, dip to 3 or rise to 5 for expression
4. Velocity: 25, 50, 75, or 100 — vary it for a musical feel
5. Include 8–${Math.round(body.steps * 0.7)} filled steps — leave some steps empty (rests)
6. Only include steps that HAVE notes — omit rests

Return this exact JSON array (no wrapper object):
[
  { "step": <1-${body.steps}>, "note": "<swara name>", "octave": <3|4|5>, "velocity": <25|50|75|100> }
]`
}

function parseSteps(text: string, body: GenerateBody) {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error('No JSON array in response')

  const raw: { step: number; note: string; octave: number; velocity: number }[] =
    JSON.parse(text.slice(start, end + 1))

  const varjyaSet = getVarjyaNotes(body.aroha, body.avaroha)
  const valid = raw.filter(s =>
    typeof s.step === 'number' &&
    s.step >= 1 && s.step <= body.steps &&
    typeof s.note === 'string' &&
    !varjyaSet.has(stripOctave(s.note)) &&
    [3, 4, 5].includes(s.octave) &&
    [25, 50, 75, 100].includes(s.velocity)
  )

  if (valid.length === 0) throw new Error('No valid steps after validation')
  return valid
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!checkRateLimitSync(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let body: GenerateBody
  try {
    body = await req.json()
    if (!body.ragaName || !Array.isArray(body.aroha) || !Array.isArray(body.avaroha)) {
      return NextResponse.json({ error: 'ragaName, aroha, avaroha are required' }, { status: 400 })
    }
    body.steps = [8, 16, 32].includes(body.steps) ? body.steps : 16
    body.prompt = (body.prompt ?? '').slice(0, 200)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const prompt = buildPrompt(body)

  // Gemini first
  if (process.env.GEMINI_API_KEY) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: GENERATE_SYSTEM })
      const result = await model.generateContent(prompt)
      return NextResponse.json({ steps: parseSteps(result.response.text(), body) })
    } catch (err: any) {
      const isQuota = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('Quota')
      if (!isQuota || (!groqClient && !nvidiaClient)) {
        console.error('[generate] gemini error:', err)
        return NextResponse.json({ error: 'Failed to generate sequence' }, { status: 500 })
      }
    }
  }

  // Groq fallback
  if (groqClient) {
    try {
      const c = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: GENERATE_SYSTEM }, { role: 'user', content: prompt }],
        max_tokens: 1500, temperature: 0.6,
      })
      return NextResponse.json({ steps: parseSteps(c.choices[0]?.message?.content ?? '', body) })
    } catch (err) { console.error('[generate] groq error:', err) }
  }

  // NVIDIA fallback
  if (nvidiaClient) {
    try {
      const c = await nvidiaClient.chat.completions.create({
        model: 'meta/llama-3.3-70b-instruct',
        messages: [{ role: 'system', content: GENERATE_SYSTEM }, { role: 'user', content: prompt }],
        max_tokens: 1500, temperature: 0.6,
      })
      return NextResponse.json({ steps: parseSteps(c.choices[0]?.message?.content ?? '', body) })
    } catch (err) { console.error('[generate] nvidia error:', err) }
  }

  return NextResponse.json({ error: 'No AI provider available' }, { status: 503 })
}
