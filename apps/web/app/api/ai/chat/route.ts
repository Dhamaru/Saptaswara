import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rateLimit'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const SYSTEM_PROMPT = `You are Saptaswara, a premium Raga-Guided AI Musical Assistant specialized in Indian Classical Music.

Rules:
1. When a Raga is provided, always respect its Aroha (ascent) and Avaroha (descent) strictly.
2. Use swara names: Sa Re ga Ga ma Ma Pa dha Dha ni Ni (lowercase = komal, uppercase = shuddha, Ma = tivra).
3. Provide melodic patterns (paltas), characteristic phrases (chalan), or compositions (bandish) grounded in the raga grammar.
4. If asked to generate a melody, provide a swara sequence with rhythm hints (e.g., "Sa Re Ga Ma | Pa Dha Ni Sa'").
5. If the user shares what they've composed (sequencer grid), analyse it against the raga and give honest feedback.
6. Keep tone poetic yet precise — you are a "Neural Resonance Engine," not a generic chatbot.
7. When suggesting practice, refer to the user's practice logs if provided.
8. Format swara patterns inside backtick-fenced blocks: \`Sa Re Ga Ma Pa\``

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getRagaContext(query: string): Promise<string> {
  try {
    const embedModel = genAI.getGenerativeModel({ model: 'models/gemini-embedding-001' })
    const embeddingResult = await embedModel.embedContent({
      content: { role: 'user', parts: [{ text: query }] },
      taskType: 'RETRIEVAL_QUERY',
    } as any)
    const embedding = embeddingResult.embedding.values

    const { data: matches, error } = await supabaseAdmin.rpc('match_ragas', {
      query_embedding: embedding,
      match_threshold: 0.45,
      match_count: 3,
    })

    if (error || !matches?.length) return ''
    return matches.map((m: any) => m.content).join('\n\n')
  } catch {
    // Vector search is best-effort — proceed without it on failure
    return ''
  }
}

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
    
    let activeUser = userData?.user
    
    if (authError || !activeUser) {
      // Guest bypass for development/testing
      const isGuestBypass = req.headers.get('x-guest-auth') === 'true' && process.env.NODE_ENV === 'development'
      if (isGuestBypass) {
        activeUser = { id: 'guest-user', email: 'guest@saptaswara.ai' } as any
      } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    if (activeUser && !checkRateLimit(activeUser.id)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }



    const { messages, ragaContext, studioContext } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages must be a non-empty array' }, { status: 400 })
    }

    // Validate messages
    for (const m of messages) {
      if (!m || typeof m.content !== 'string' || !['user', 'assistant'].includes(m.role)) {
        return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
      }
    }

    const lastUserMessage = messages[messages.length - 1].content

    // RAG: pull relevant raga knowledge for the current query
    const ragVectorContext = await getRagaContext(lastUserMessage)

    // Build raga session context
    const ragaInfo = ragaContext
      ? [
          `Active Raga: ${ragaContext.name}`,
          ragaContext.aroha ? `Aroha: ${ragaContext.aroha.join(' – ')}` : null,
          ragaContext.avaroha ? `Avaroha: ${ragaContext.avaroha.join(' – ')}` : null,
          ragaContext.vadi ? `Vadi (primary note): ${ragaContext.vadi}` : null,
          ragaContext.samvadi ? `Samvadi: ${ragaContext.samvadi}` : null,
          ragaContext.mood ? `Mood: ${ragaContext.mood}` : null,
          ragaContext.time_of_day ? `Time of day: ${ragaContext.time_of_day}` : null,
        ].filter(Boolean).join('\n')
      : 'No raga selected yet.'

    // Build studio grid context
    const studioInfo = studioContext
      ? `Current sequencer pattern:\n${studioContext}`
      : null

    const systemContext = [
      SYSTEM_PROMPT,
      '\n--- SESSION CONTEXT ---',
      ragaInfo,
      studioInfo ? `\n--- STUDIO GRID ---\n${studioInfo}` : null,
      ragVectorContext ? `\n--- RAGA KNOWLEDGE BASE ---\n${ragVectorContext}` : null,
    ].filter(Boolean).join('\n')

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemContext }],
      },
    })

    // Build proper multi-turn history (all but last message)
    // Filter out empty-content messages (streaming artifacts) to avoid API errors
    // Find the first user message: Gemini history must start with a "user" turn.
    const firstUserIndex = messages.findIndex((m: any) => m.role === 'user')
    const history = (firstUserIndex === -1 ? [] : messages.slice(firstUserIndex, -1))
      .filter((m: any) => m.content && m.content.trim().length > 0)
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

    const chat = model.startChat({ history })
    const result = await chat.sendMessageStream(lastUserMessage)

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
      { error: 'Resonance disrupted. Please try again.' },
      { status: 500 }
    )
  }
}
