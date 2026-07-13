import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const ALLOWED_MIME = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/webm']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })
    }

    const formData = await req.formData()
    const file = formData.get('audio') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Missing audio file — send multipart field "audio"' }, { status: 400 })
    }

    const mimeType = file.type || 'audio/mpeg'
    if (!ALLOWED_MIME.includes(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported format. Allowed: MP3, WAV, M4A, AAC, WebM` },
        { status: 415 }
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large — max 10 MB' }, { status: 413 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const genai = new GoogleGenerativeAI(apiKey)
    const model = genai.getGenerativeModel({ model: 'gemini-1.5-pro' })

    const prompt = `You are an expert in Indian classical music. Analyze this audio and identify which raga is being performed.

Return ONLY valid JSON in this exact shape:
{
  "raga": "<raga name, e.g. Yaman>",
  "confidence": <0–100 integer>,
  "tradition": "<Hindustani or Carnatic>",
  "time_of_day": "<e.g. Evening, Morning, Night, Any>",
  "evidence": "<2–3 sentences explaining which characteristic phrases, swaras, or ornaments led to this identification>",
  "characteristic_phrases_found": ["<phrase 1>", "<phrase 2>"]
}

If you cannot identify a raga with confidence above 30, set "raga" to null and "confidence" to the best estimate.
Do not include any text outside the JSON object.`

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType, data: base64 } },
    ])

    const raw = result.response.text().trim()

    let parsed: any
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON object found')
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ error: 'Model returned non-JSON response', raw }, { status: 502 })
    }

    const { raga, confidence, tradition, time_of_day, evidence, characteristic_phrases_found } = parsed

    return NextResponse.json({
      raga: raga ?? null,
      confidence: typeof confidence === 'number' ? Math.min(100, Math.max(0, confidence)) : 0,
      tradition: tradition ?? null,
      time_of_day: time_of_day ?? null,
      evidence: evidence ?? '',
      characteristic_phrases_found: Array.isArray(characteristic_phrases_found) ? characteristic_phrases_found : [],
    })
  } catch (err: any) {
    console.error('[audio/detect-raga]', err)
    const isQuota =
      err?.status === 429 ||
      err?.message?.includes('429') ||
      err?.message?.includes('Quota') ||
      err?.message?.includes('Too Many Requests')
    if (isQuota) {
      return NextResponse.json({ error: 'Gemini quota exceeded — please try again later or upgrade your API plan.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
