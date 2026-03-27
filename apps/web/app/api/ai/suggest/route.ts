import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role for RPC access if restricted
)

export async function POST(req: Request) {
  try {
    const { query, ragaContext } = await req.json()

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

      Current Raga Session: ${ragaContext || 'None'}

      User Question: ${query}

      Provide a concise, helpful response focused on musical theory, swara patterns, or mood. 
      If suggesting swara patterns, use standard notation (S, r, R, g, G, m, M, P, d, D, n, N).
    `

    const chatModel = genAI.getGenerativeModel({ model: 'models/gemini-flash-latest' })
    const result = await chatModel.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ text })
  } catch (error: any) {
    console.error('AI Suggest API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
