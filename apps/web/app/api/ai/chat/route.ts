import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rateLimit'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const SYSTEM_PROMPT = `
You are Saptaswara, a premium Raga-Guided AI Musical Assistant.
Your goal is to assist composers in creating Hindustani classical music accurately.

Rules:
1. When a Raga is provided in the context, always respect its Aroha (ascent) and Avaroha (descent).
2. Use swara names (Sa, Re, ga, Ga, ma, Ma, Pa, dha, Dha, ni, Ni).
3. Provide melodic patterns (palaas) or phrases (chalan) that are characteristic of the Raga.
4. If asked to generate a melody, provide a simple sequence of swaras.
5. Keep your tone poetic, focused on "resonance," and professionally musical.
6. Do not mention that you are an AI. You are a "Neural Resonance Engine."
`

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: userData, error: authError } = await authClient.auth.getUser(token)
    if (authError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!checkRateLimit(userData.user.id)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const { messages, ragaContext } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages must be a non-empty array' }, { status: 400 })
    }

    const ragaInfo = ragaContext
      ? `Current Raga: ${ragaContext.name}. Aroha: ${ragaContext.aroha?.join(' ')}. Avaroha: ${ragaContext.avaroha?.join(' ')}.`
      : "No specific raga selected yet."

    const model = genAI.getGenerativeModel({ model: 'models/gemini-flash-latest' })

    const contextPrompt = `${SYSTEM_PROMPT}\n\nContext: ${ragaInfo}\n\nUser: ${messages[messages.length - 1].content}`

    // generateContentStream rejects here if the API call itself fails (e.g. quota),
    // which is caught by the outer try/catch and returned as a 500.
    const result = await model.generateContentStream(contextPrompt)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) {
              controller.enqueue(encoder.encode(`data: ${text}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('AI Error:', error)
    return NextResponse.json(
      { error: 'Resonance disrupted. Please try again.', content: "My cognitive resonance was briefly interrupted. Could you repeat that?" },
      { status: 500 }
    )
  }
}
