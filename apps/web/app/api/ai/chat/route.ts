import * as Sentry from '@sentry/nextjs'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rateLimit'
import {
  embedCache,
  ragaCache,
  buildEnrichedQuery,
  ragaCacheKey,
  EMBED_TTL_MS,
  RAGA_TTL_MS,
} from '@/lib/ragCache'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const nvidiaClient = process.env.NVIDIA_API_KEY
  ? new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    })
  : null

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
- Use \`swara sequences\` inside backtick blocks
- Use line breaks to separate sections in longer answers
- Never use bullet points for melodic patterns — write them as flowing sequences
- End teaching responses with a concrete "Try this:" suggestion when possible`

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Embedding with in-process cache ──────────────────────────────────────────
async function getEmbedding(text: string): Promise<number[] | null> {
  const cached = embedCache.get(text)
  if (cached) return cached

  try {
    const embedModel = genAI.getGenerativeModel({ model: 'models/gemini-embedding-001' })
    const result = await embedModel.embedContent({
      content: { role: 'user', parts: [{ text }] },
      taskType: 'RETRIEVAL_QUERY',
    } as any)
    const embedding = result.embedding.values
    embedCache.set(text, embedding, EMBED_TTL_MS)
    return embedding
  } catch {
    return null
  }
}

// ── Context-aware RAG retrieval with result cache ─────────────────────────────
async function getRagaContext(
  userMessage: string,
  ragaName: string | null,
  recentHistory: Array<{ role: string; content: string }>,
): Promise<string> {
  // Build a context-enriched query so the embedding is anchored to the
  // raga and conversation rather than just the bare user message
  const enrichedQuery = buildEnrichedQuery(userMessage, ragaName, recentHistory)
  const cacheKey = ragaCacheKey(ragaName, userMessage)

  // Return cached retrieval result if still warm
  const cachedContext = ragaCache.get(cacheKey)
  if (cachedContext !== undefined) return cachedContext

  const embedding = await getEmbedding(enrichedQuery)
  if (!embedding) return ''

  try {
    const { data: matches, error } = await supabaseAdmin.rpc('match_ragas', {
      query_embedding: embedding,
      match_threshold: 0.42,
      match_count: 4,
    })

    if (error || !matches?.length) {
      ragaCache.set(cacheKey, '', RAGA_TTL_MS)
      return ''
    }

    const context = matches.map((m: any) => m.content).join('\n\n')
    ragaCache.set(cacheKey, context, RAGA_TTL_MS)
    return context
  } catch {
    return ''
  }
}

// ── Conversation compaction ───────────────────────────────────────────────────
// For long sessions, keep the first exchange (establishes intent/raga choice)
// + the most recent N turns. This prevents token bloat while retaining coherence.
const MAX_HISTORY_TURNS = 12  // messages (not pairs)
const KEEP_RECENT = 8

function compactHistory(
  messages: Array<{ role: string; content: string }>,
): Array<{ role: string; content: string }> {
  // Filter out empty streaming artifacts
  const valid = messages.filter(m => m.content?.trim())
  if (valid.length <= MAX_HISTORY_TURNS) return valid

  // Keep first 2 messages (user's opening + first assistant reply) so the
  // model remembers what raga/topic was established at the start
  const head = valid.slice(0, 2)
  const tail = valid.slice(-KEEP_RECENT)

  // Insert a synthetic note so the model knows turns were skipped
  const bridge = {
    role: 'user' as const,
    content: '[Earlier conversation condensed for context window. Continue naturally.]',
  }

  return [...head, bridge, ...tail]
}

// ── POST handler ──────────────────────────────────────────────────────────────
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
    const activeUser = userData?.user
    if (authError || !activeUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = await checkRateLimit(activeUser.id, 'ai')
    if (!rl.allowed) return rateLimitedResponse(rl)

    const { messages, ragaContext, studioContext } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages must be a non-empty array' }, { status: 400 })
    }
    for (const m of messages) {
      if (!m || typeof m.content !== 'string' || !['user', 'assistant'].includes(m.role)) {
        return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
      }
    }

    const lastUserMessage = messages[messages.length - 1].content
    const ragaName: string | null = ragaContext?.name ?? null

    // All messages except the last one — used for history and RAG enrichment
    const priorMessages = messages.slice(0, -1)

    // ── Context-aware RAG (parallel with history compaction) ─────────────────
    const ragVectorContext = await getRagaContext(lastUserMessage, ragaName, priorMessages)

    // ── Build raga session context ────────────────────────────────────────────
    const ragaInfo = ragaContext
      ? [
          `Active Raga: ${ragaContext.name}`,
          ragaContext.tradition ? `Tradition: ${ragaContext.tradition}` : null,
          ragaContext.aroha
            ? `Aroha (ascending): ${Array.isArray(ragaContext.aroha) ? ragaContext.aroha.join(' – ') : ragaContext.aroha}`
            : null,
          ragaContext.avaroha
            ? `Avaroha (descending): ${Array.isArray(ragaContext.avaroha) ? ragaContext.avaroha.join(' – ') : ragaContext.avaroha}`
            : null,
          ragaContext.vadi ? `Vadi (most important / king note): ${ragaContext.vadi}` : null,
          ragaContext.samvadi ? `Samvadi (second most important / minister note): ${ragaContext.samvadi}` : null,
          ragaContext.mood ? `Rasa / Mood: ${ragaContext.mood}` : null,
          ragaContext.time_of_day ? `Traditional time of performance: ${ragaContext.time_of_day}` : null,
          ragaContext.raga_phrases?.length
            ? `Characteristic Pakads:\n${ragaContext.raga_phrases
                .map((p: any) => `  ${p.label}: ${Array.isArray(p.sequence) ? p.sequence.join(' ') : p.sequence}`)
                .join('\n')}`
            : null,
        ]
          .filter(Boolean)
          .join('\n')
      : 'No raga selected yet. Encourage the user to pick one from the library.'

    const systemContext = [
      SYSTEM_PROMPT,
      '\n--- SESSION CONTEXT ---',
      ragaInfo,
      studioContext ? `\n--- STUDIO GRID ---\n${studioContext}` : null,
      ragVectorContext ? `\n--- RAGA KNOWLEDGE BASE (retrieved) ---\n${ragVectorContext}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    // ── Compact history ───────────────────────────────────────────────────────
    const compacted = compactHistory(priorMessages)
    const firstUserIndex = compacted.findIndex(m => m.role === 'user')
    const compactedValid = (firstUserIndex === -1 ? [] : compacted.slice(firstUserIndex))
      .filter(m => m.content?.trim())

    // ── Try Gemini first, fall back to NVIDIA on quota errors ────────────────
    const SSE_HEADERS = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }

    try {
      const geminiHistory = compactedValid.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: { role: 'system', parts: [{ text: systemContext }] },
      })
      const chat = model.startChat({ history: geminiHistory })
      const result = await chat.sendMessageStream(lastUserMessage)

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.stream) {
              const text = chunk.text()
              if (text) controller.enqueue(encoder.encode(`data: ${text}\n\n`))
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (err) {
            controller.error(err)
          }
        },
      })
      return new Response(stream, { headers: SSE_HEADERS })
    } catch (geminiError: any) {
      const isQuota =
        geminiError?.status === 429 ||
        geminiError?.response?.status === 429 ||
        geminiError?.message?.includes('429') ||
        geminiError?.message?.includes('Quota') ||
        geminiError?.message?.includes('Too Many Requests')

      if (!isQuota || !nvidiaClient) {
        Sentry.captureException(geminiError, { tags: { route: 'ai/chat', provider: 'gemini' } })
        return new Response(
          JSON.stringify({ error: 'Resonance disrupted. Please try again.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // ── NVIDIA fallback ───────────────────────────────────────────────────
      const nvidiaMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemContext },
        ...compactedValid.map(m => ({
          role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: m.content,
        })),
        { role: 'user', content: lastUserMessage },
      ]

      const nvidiaStream = await nvidiaClient.chat.completions.create({
        model: 'meta/llama-3.3-70b-instruct',
        messages: nvidiaMessages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
      })

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of nvidiaStream) {
              const text = chunk.choices[0]?.delta?.content
              if (text) controller.enqueue(encoder.encode(`data: ${text}\n\n`))
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (err) {
            controller.error(err)
          }
        },
      })
      return new Response(stream, { headers: SSE_HEADERS })
    }
  } catch (error: any) {
    Sentry.captureException(error, { tags: { route: 'ai/chat' } })
    return new Response(
      JSON.stringify({ error: 'Resonance disrupted. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
