import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// mockRpcFn must be hoisted so the same reference is captured inside the
// vi.mock factory (which runs before imports) and readable in test bodies.
// ---------------------------------------------------------------------------
const mockRpcFn = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: [], error: null })
)

// The suggest route calls createClient() at module level, so the mock must
// be in place before the module is first imported.
vi.mock('@supabase/supabase-js', () => ({
  // vitest 4.x: use `function` so that `new` usage inside the route doesn't fail.
  createClient: vi.fn(function () {
    return {
      rpc: mockRpcFn,
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      },
    }
  }),
}))

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
}))

// Both the embedding model (gemini-embedding-001) and the generation model
// (gemini-flash-latest) are obtained via getGenerativeModel(). The same mock
// model handles both calls — embedContent for the first, generateContent for
// the second.
vi.mock('@google/generative-ai', () => ({
  // vitest 4.x: use `function` (not arrow) so `new GoogleGenerativeAI(...)` works.
  GoogleGenerativeAI: vi.fn(function () {
    return {
      getGenerativeModel: vi.fn(function () {
        return {
          embedContent: vi.fn().mockResolvedValue({
            embedding: { values: new Array(768).fill(0.1) },
          }),
          generateContent: vi.fn().mockResolvedValue({
            response: { text: vi.fn().mockReturnValue('Test AI suggestion') },
          }),
        }
      }),
    }
  }),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn().mockImplementation((body: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}))

import { POST } from '../../../apps/web/app/api/ai/suggest/route'

function makeRequest(body: object): Request {
  return new Request('http://localhost/api/ai/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  })
}

describe('/api/ai/suggest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Restore default resolved value after any per-test overrides.
    mockRpcFn.mockResolvedValue({ data: [], error: null })
  })

  it('calls match_ragas with the correct RPC parameters', async () => {
    const req = makeRequest({ query: 'evening raga with melancholy mood', ragaContext: null })
    await POST(req)

    expect(mockRpcFn).toHaveBeenCalledWith('match_ragas', {
      // query_embedding comes from the mocked embedContent (768 × 0.1)
      query_embedding: expect.any(Array),
      match_threshold: 0.5,
      match_count: 3,
    })
  })

  it('returns 200 with a text field when match_ragas returns an empty array', async () => {
    mockRpcFn.mockResolvedValueOnce({ data: [], error: null })

    const req = makeRequest({ query: 'test query', ragaContext: null })
    const response = await POST(req)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveProperty('text')
    expect(typeof body.text).toBe('string')
  })

  it('returns 200 with a text field when match_ragas returns populated matches', async () => {
    mockRpcFn.mockResolvedValueOnce({
      data: [
        { content: 'Raga: Yaman\nTradition: Hindustani\nMood: Romantic', similarity: 0.91 },
        { content: 'Raga: Bhupali\nTradition: Hindustani\nMood: Peaceful', similarity: 0.76 },
      ],
      error: null,
    })

    const req = makeRequest({ query: 'peaceful evening raga', ragaContext: null })
    const response = await POST(req)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveProperty('text')
  })

  it('returns 500 when match_ragas returns an error — route throws mError', async () => {
    // The route does: if (mError) throw mError — caught → 500.
    mockRpcFn.mockResolvedValueOnce({ data: null, error: new Error('RPC connection failed') })

    const req = makeRequest({ query: 'test', ragaContext: null })
    const response = await POST(req)

    expect(response.status).toBe(500)
  })

  it('returns 400 when query is absent', async () => {
    const req = makeRequest({ ragaContext: null }) // query intentionally omitted
    const response = await POST(req)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })
})
