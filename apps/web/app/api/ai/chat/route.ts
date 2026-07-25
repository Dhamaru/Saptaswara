import * as Sentry from '@sentry/nextjs'
import { GoogleGenerativeAI, SchemaType, FunctionCallingMode } from '@google/generative-ai'
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
7. When answering any question, connect the answer to the active raga where relevant — don't answer in the abstract when a concrete raga example is available
8. If user asks about a DIFFERENT raga than the active one: answer fully, then end with "Once you've explored {active_raga} further, {other_raga} would be a great next step"

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

// ── Wikipedia raga tool ───────────────────────────────────────────────────────
async function fetchRagaWiki(ragaName: string): Promise<string> {
  const tryFetch = async (title: string): Promise<string | null> => {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        {
          headers: { 'User-Agent': 'Saptaswara/1.0 (kasivasi2005@gmail.com)' },
          signal: AbortSignal.timeout(5000),
        }
      )
      if (!res.ok) return null
      const data = await res.json() as { extract?: string }
      return data.extract ?? null
    } catch {
      return null
    }
  }
  return (
    (await tryFetch(ragaName)) ??
    (await tryFetch(`Raga ${ragaName}`)) ??
    (await tryFetch(`${ragaName} (music)`)) ??
    `No Wikipedia article found for "${ragaName}".`
  )
}

const RAGA_WIKI_TOOL = {
  functionDeclarations: [{
    name: 'fetch_raga_wiki',
    description: 'Fetch Wikipedia information about a raga when the user asks about a raga not covered by the session context, or needs detailed historical, theoretical, or gharana-specific information.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        raga_name: {
          type: SchemaType.STRING,
          description: 'The raga name to look up (e.g. "Puriya Dhanashree", "Bhimpalasi", "Yaman")',
        } as any,
      },
      required: ['raga_name'],
    },
  }],
}

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
  // ── Pre-stream work: auth, rate-limit, RAG, prompt construction ─────────────
  type PreStreamResult =
    | { ok: false; response: Response }
    | {
        ok: true
        lastUserMessage: string
        systemContext: string
        compactedValid: Array<{ role: string; content: string }>
      }

  const preStream = await Sentry.startSpan(
    { name: 'ai.chat', op: 'ai.request' },
    async (): Promise<PreStreamResult> => {
      const authHeader = req.headers.get('Authorization')
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
      if (!token) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

      const authClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: userData, error: authError } = await authClient.auth.getUser(token)
      const activeUser = userData?.user
      if (authError || !activeUser) {
        return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
      }

      const rl = await checkRateLimit(activeUser.id, 'ai')
      if (!rl.allowed) return { ok: false, response: rateLimitedResponse(rl) }

      const { messages, ragaContext, studioContext, mode } = await req.json()

      if (!Array.isArray(messages) || messages.length === 0) {
        return { ok: false, response: NextResponse.json({ error: 'messages must be a non-empty array' }, { status: 400 }) }
      }
      for (const m of messages) {
        if (!m || typeof m.content !== 'string' || !['user', 'assistant'].includes(m.role)) {
          return { ok: false, response: NextResponse.json({ error: 'Invalid message format' }, { status: 400 }) }
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

      const learnModePrefix = mode === 'learn'
        ? '\n═══ LEARN MODE ACTIVE ═══\nThe user is in Beginner / Learn Mode. Use simple, friendly language. Avoid Sanskrit terms without explanation. Use everyday analogies. Keep responses short and focused on one idea at a time. Always end with a concrete "Try this:" action step.\n'
        : ''

      const systemContext = [
        SYSTEM_PROMPT,
        learnModePrefix,
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

      return { ok: true, lastUserMessage, systemContext, compactedValid }
    }
  )

  if (!preStream.ok) return preStream.response

  const { lastUserMessage, systemContext, compactedValid } = preStream

  try {
    // ── Try Gemini first, fall back to Groq on quota errors ──────────────────────
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
        tools: [RAGA_WIKI_TOOL],
        toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
      })
      const chat = model.startChat({ history: geminiHistory })

      // Phase 1: non-streaming call so we can detect and execute tool calls
      const phase1 = await chat.sendMessage(lastUserMessage)
      const functionCalls = phase1.response.functionCalls()
      const encoder = new TextEncoder()

      if (functionCalls?.length) {
        // Execute all requested tool calls (typically just one)
        const toolResults = await Promise.all(
          functionCalls.map(async (call) => {
            const wikiText = call.name === 'fetch_raga_wiki'
              ? await fetchRagaWiki((call.args as { raga_name: string }).raga_name)
              : 'Unknown tool.'
            return { functionResponse: { name: call.name, response: { content: wikiText } } }
          })
        )

        // Phase 2: stream the final answer with wiki context now in chat history
        const phase2 = await chat.sendMessageStream(toolResults as any)
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of phase2.stream) {
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
      }

      // No tool call — emit the phase1 text response as SSE.
      // Encode \n as \\n so the client's line-split parser preserves newlines.
      const directText = phase1.response.text()
      const stream = new ReadableStream({
        start(controller) {
          if (directText) {
            const encoded = directText.replace(/\n/g, '\\n')
            controller.enqueue(encoder.encode(`data: ${encoded}\n\n`))
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
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

      if (!isQuota || (!groqClient && !nvidiaClient)) {
        Sentry.captureException(geminiError, { tags: { route: 'ai/chat', provider: 'gemini' } })
        const isKeyMissing = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key'
        const msg = isKeyMissing
          ? 'AI key not configured. Add GEMINI_API_KEY to environment variables.'
          : `Gemini error: ${geminiError?.message ?? 'unknown'}`
        console.error('[ai/chat] Gemini failed:', msg)
        return new Response(
          JSON.stringify({ error: msg }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // ── Groq fallback ─────────────────────────────────────────────────────────
      const groqMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemContext },
        ...compactedValid.map(m => ({
          role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: m.content,
        })),
        { role: 'user', content: lastUserMessage },
      ]

      // Try Groq first, then NVIDIA as second fallback
      const makeStream = (client: typeof groqClient, model: string) => {
        const encoder = new TextEncoder()
        return (completionsStream: AsyncIterable<any>) => new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of completionsStream) {
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
      }

      if (groqClient) {
        try {
          const groqStream = await groqClient.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: groqMessages,
            stream: true,
            max_tokens: 1024,
            temperature: 0.7,
          })
          return new Response(makeStream(groqClient, 'llama-3.3-70b-versatile')(groqStream), { headers: SSE_HEADERS })
        } catch {
          // Groq failed — fall through to NVIDIA
        }
      }

      if (!nvidiaClient) {
        throw new Error('No fallback provider available')
      }
      const nvidiaStream = await nvidiaClient.chat.completions.create({
        model: 'meta/llama-3.3-70b-instruct',
        messages: groqMessages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
      })
      return new Response(makeStream(nvidiaClient, 'meta/llama-3.3-70b-instruct')(nvidiaStream), { headers: SSE_HEADERS })
    }
  } catch (error: any) {
    Sentry.captureException(error, { tags: { route: 'ai/chat' } })
    return new Response(
      JSON.stringify({ error: 'Resonance disrupted. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
