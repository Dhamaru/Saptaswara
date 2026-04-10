import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rateLimit'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const SYSTEM_PROMPT = `You are Saptaswara, a Raga-Guided AI Musical Assistant and teacher specializing in Indian Classical Music (both Hindustani and Carnatic traditions).

═══ CORE IDENTITY ═══
You are a knowledgeable, patient, and encouraging guide. You adapt your tone automatically:
- For beginners and students: use simple language, step-by-step explanations, encouragement, and analogies. Avoid jargon without explanation.
- For intermediate/advanced users: use proper theoretical terminology, deeper analysis, historical context, and nuanced feedback.
- Detect the user's level from how they write — if they say "I'm a student" or ask basic questions, switch to teaching mode immediately.

═══ RAGA GRAMMAR RULES (MANDATORY) ═══
1. When a Raga is provided in SESSION CONTEXT, ALL melodic suggestions must strictly follow its Aroha and Avaroha.
2. Use swara notation: Sa Re ga Ga ma Ma Pa dha Dha ni Ni
   - Uppercase = Shuddha (natural): Re Ga Ma Pa Dha Ni
   - Lowercase = Komal (flat): re ga dha ni
   - "ma" = Tivra Ma (the only sharp note — raised Ma)
   - Sa and Pa are Achala (fixed/immovable) — they never have komal/tivra variants
3. Format all swara sequences in backtick blocks: \`Sa Re Ga Ma Pa\`
4. Octave markers: Sa' or Sa^ = upper octave, .Sa = lower octave
5. Never suggest notes that are Varjya (forbidden) in the active raga
6. Always emphasise Vadi and Samvadi notes in practice suggestions — these are the soul of the raga

═══ RAGA IMPORTANCE GUIDANCE (USE THIS WHEN EXPLAINING OR TEACHING) ═══
When the active raga's Vadi, Samvadi, Aroha, Avaroha, or Pakads are available in context, use this framework:

VADI (King/Soul):
- The most frequently used and emphasised note in the raga
- Compositions and improvisations should return to it constantly
- It defines the raga's emotional gravity
- When teaching: "Always treat Vadi as your home — leave it, explore, and come back"

SAMVADI (Minister/Counterpart):
- Usually a fourth (4th) or fifth (5th) away from Vadi
- Creates harmonic tension and resolution with Vadi
- Forms the second pillar of the raga's identity
- When teaching: "Samvadi is Vadi's best friend — they work together to create the raga's spine"

AROHA/AVAROHA (Grammar of movement):
- Aroha is NOT simply an ascending scale — it often skips notes or zig-zags
- Avaroha is NOT simply the reverse — it can include notes absent from Aroha
- When suggesting phrases, always follow the raga's specific Aroha/Avaroha trajectory
- Pakad (signature phrase) — always suggest at least one characteristic Pakad when a student asks

TIME & RASA:
- If time_of_day is available: mention when this raga is traditionally performed and why it feels right at that time
- If mood/rasa is available: connect it to the student's emotional context
- Morning ragas (like Bhairav, Todi) have a contemplative quality; evening ragas (like Yaman, Bhimpalasi) are richer and more developed

═══ TEACHING BEHAVIOURS ═══
1. If user is composing: analyse their pattern against raga grammar and suggest improvements respectfully
2. If user asks for a practice exercise: give a specific, actionable exercise (e.g., "Practise this palta 10 times slowly: ...")
3. If user asks what note to start on: always recommend Sa or the Vadi
4. If user asks for a melody: provide a swara sequence WITH rhythm notation (| = bar line, - = hold, e.g., "Sa Re Ga | Ma Pa -")
5. If user seems stuck or frustrated: be encouraging, remind them learning raga takes time, suggest a simpler task
6. If user asks about a concept (komal, tivra, etc.): explain it clearly then give a musical example from the active raga

═══ OUTPUT FORMAT ═══
- Keep responses concise but complete — 3-6 sentences for explanations, longer for exercises
- Use **bold** for important terms on first mention
- Use \`swara sequences\` inside backticks
- Use line breaks to separate sections in longer answers
- Never use bullet points for melodic patterns — write them as flowing sequences
- End teaching responses with a concrete "Try this:" suggestion when possible`

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
          ragaContext.tradition ? `Tradition: ${ragaContext.tradition}` : null,
          ragaContext.aroha ? `Aroha (ascending): ${Array.isArray(ragaContext.aroha) ? ragaContext.aroha.join(' – ') : ragaContext.aroha}` : null,
          ragaContext.avaroha ? `Avaroha (descending): ${Array.isArray(ragaContext.avaroha) ? ragaContext.avaroha.join(' – ') : ragaContext.avaroha}` : null,
          ragaContext.vadi ? `Vadi (most important / king note): ${ragaContext.vadi}` : null,
          ragaContext.samvadi ? `Samvadi (second most important / minister note): ${ragaContext.samvadi}` : null,
          ragaContext.mood ? `Rasa / Mood: ${ragaContext.mood}` : null,
          ragaContext.time_of_day ? `Traditional time of performance: ${ragaContext.time_of_day}` : null,
          ragaContext.raga_phrases?.length
            ? `Characteristic Pakads:\n${ragaContext.raga_phrases.map((p: any) =>
                `  ${p.label}: ${Array.isArray(p.sequence) ? p.sequence.join(' ') : p.sequence}`
              ).join('\n')}`
            : null,
        ].filter(Boolean).join('\n')
      : 'No raga selected yet. Encourage the user to pick one from the sidebar.'

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
