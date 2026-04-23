import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { checkRateLimitSync } from '@/lib/rateLimit'
import { getVarjyaNotes, stripOctave } from '@/lib/ragaUtils'


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

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

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const allowed = checkRateLimitSync(ip)
  if (!allowed) {
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

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: GENERATE_SYSTEM,
    })

    const result = await model.generateContent(buildPrompt(body))
    const text = result.response.text()

    // Extract JSON array
    const start = text.indexOf('[')
    const end = text.lastIndexOf(']')
    if (start === -1 || end === -1) throw new Error('No JSON array in response')

    const raw: { step: number; note: string; octave: number; velocity: number }[] =
      JSON.parse(text.slice(start, end + 1))

    // Validate: guard against varjya notes slipping through
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

    return NextResponse.json({ steps: valid })
  } catch (err) {
    console.error('[generate/route] error:', err)
    return NextResponse.json({ error: 'Failed to generate sequence' }, { status: 500 })
  }
}
