import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rateLimit'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role for RPC access if restricted
)

export async function POST(req: Request) {
  return Sentry.startSpan(
    { name: 'ai.suggest', op: 'ai.request' },
    async () => {
      try {
        const authHeader = req.headers.get('Authorization')
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const authSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: userData, error: authError } = await authSupabase.auth.getUser(token)
        if (authError || !userData?.user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rl = await checkRateLimit(userData.user.id, 'ai')
        if (!rl.allowed) return rateLimitedResponse(rl)

        const { query, ragaContext } = await req.json()

        if (!query || typeof query !== 'string' || query.trim() === '') {
          return NextResponse.json({ error: 'query is required and must be a non-empty string' }, { status: 400 })
        }
        if (query.length > 500) {
          return NextResponse.json({ error: 'query must be 500 characters or fewer' }, { status: 400 })
        }

        // Validate ragaContext to prevent prompt injection — must be a known-shape object or absent
        let safeRagaContext = 'None'
        if (ragaContext && typeof ragaContext === 'object' && !Array.isArray(ragaContext)) {
          const allowed = ['name', 'aroha', 'avaroha', 'vadi', 'samvadi', 'mood', 'time_of_day', 'thaat']
          const safe: Record<string, unknown> = {}
          for (const key of allowed) {
            if (ragaContext[key] !== undefined) safe[key] = ragaContext[key]
          }
          if (safe.name && typeof safe.name === 'string') {
            safeRagaContext = JSON.stringify(safe)
          }
        } else if (typeof ragaContext === 'string' && ragaContext.length <= 200) {
          // Legacy string callers — strip to plain text only
          safeRagaContext = ragaContext.replace(/[<>{}[\]]/g, '').slice(0, 200)
        }

        // 1. Generate embedding for the user query (must match 768d of the DB)
        const model = genAI.getGenerativeModel({ model: 'models/gemini-embedding-001' })
        const embeddingResult = await model.embedContent({
          content: { role: 'user', parts: [{ text: query }] },
          taskType: 'RETRIEVAL_QUERY',
          outputDimensionality: 768
        } as any)
        const embedding = embeddingResult.embedding.values

        // 2. Search for similar raga context in Supabase
        const { data: matches, error: mError } = await supabase.rpc('match_ragas', {
          query_embedding: embedding,
          match_threshold: 0.5,
          match_count: 3
        })

        if (mError) throw mError

        const contextText = matches?.map((m: any) => m.content).join('\n\n') || ''

        // 3. Construct a musically-aware prompt for Gemini
        const prompt = `
      You are Saptaswara AI, an expert in Indian Classical Music.
      Context about relevant ragas:
      ${contextText}

      Current Raga Session: ${safeRagaContext}

      User Question: ${query}

      Provide a concise, helpful response focused on musical theory, swara patterns, or mood.
      If suggesting swara patterns, use standard notation (S, r, R, g, G, m, M, P, d, D, n, N).
    `

        const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
        const result = await chatModel.generateContent(prompt)
        const response = result.response
        const text = response.text()

        return NextResponse.json({ text })
      } catch (error: any) {
        console.error('AI Suggest API Error:', error) // intentional
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
      }
    }
  )
}
