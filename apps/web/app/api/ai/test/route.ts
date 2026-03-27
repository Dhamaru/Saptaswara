import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// List of morning ragas for verification
const MORNING_RAGAS = ['Bhairav', 'Bhairavi', 'Todi', 'Asavari', 'Vibhas', 'Bhatiyar']

export async function GET() {
  const results = {
    embedding_test: "FAIL",
    retrieval_test: "FAIL", 
    retrieved_ragas: [] as string[],
    gemini_test: "FAIL",
    gemini_response: ""
  }

  try {
    // 1. Generate an embedding for "peaceful morning raga"
    const embedModel = genAI.getGenerativeModel({ model: 'models/gemini-embedding-001' })
    const embeddingResult = await embedModel.embedContent({
      content: { role: 'user', parts: [{ text: "peaceful morning raga" }] },
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: 768
    } as any)
    const embedding = embeddingResult.embedding.values
    
    if (embedding && embedding.length > 0) {
      results.embedding_test = "PASS"
    }

    // 2. Query raga_embeddings table with that embedding
    const { data: matches, error: mError } = await supabase.rpc('match_ragas', {
      query_embedding: embedding,
      match_threshold: 0.1,
      match_count: 3
    })

    if (mError) throw mError

    results.retrieved_ragas = matches?.map((m: any) => m.raga_name) || []
    
    // 3. Verify results (check for morning raga names)
    const hasMorningRaga = results.retrieved_ragas.some(name => 
      MORNING_RAGAS.some(m => name.toLowerCase().includes(m.toLowerCase()))
    )
    if (hasMorningRaga) {
      results.retrieval_test = "PASS"
    }

    // 4. Send context + question to Gemini
    const contextText = matches?.map((m: any) => m.content).join('\n\n') || 'No context found.'
    const chatModel = genAI.getGenerativeModel({ model: 'models/gemini-flash-latest' })
    
    const prompt = `
      You are Saptaswara AI. Use the context below to answer.
      
      Context:
      ${contextText}

      Question: What raga suits a peaceful morning?
      
      Answer in one concise sentence.
    `
    const genResult = await chatModel.generateContent(prompt)
    const genText = genResult.response.text()
    
    if (genText) {
      results.gemini_test = "PASS"
      results.gemini_response = genText.substring(0, 100).trim() + (genText.length > 100 ? "..." : "")
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('RAG Test Error:', error)
    return NextResponse.json({
      ...results,
      error: error.message
    }, { status: 500 })
  }
}
