import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// mockSendMessageStream is hoisted so it can be referenced in vi.mock factory
// AND overridden per-test (e.g. mockRejectedValueOnce for the 500 case).
// Using mockImplementation (not mockResolvedValue) so each call produces a
// fresh async generator — a consumed iterator cannot be reused.
// ---------------------------------------------------------------------------
const mockSendMessageStream = vi.hoisted(() =>
  vi.fn().mockImplementation(async () => ({
    stream: (async function* () {
      yield { text: () => 'Sa Re Ga ' }
      yield { text: () => 'Ma Pa — a peaceful ascent.' }
    })(),
  }))
)

// mockSendMessage is the phase-1 non-streaming call the route uses to detect tool calls.
const mockSendMessage = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    response: {
      functionCalls: () => null,
      text: () => 'Sa Re Ga Ma Pa — a peaceful ascent.',
    },
  })
)

vi.mock('@sentry/nextjs', () => ({
  startSpan: vi.fn().mockImplementation(async (_opts: any, fn: any) => fn()),
  captureException: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(function () {
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
  }),
}))

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    limit: 20,
    remaining: 19,
    resetAt: Math.floor(Date.now() / 1000) + 60,
  }),
  rateLimitedResponse: vi.fn().mockReturnValue({
    status: 429,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => ({ error: 'rate_limited' }),
  }),
}))

vi.mock('@google/generative-ai', () => ({
  // vitest 4.x: use `function` (not arrow) so `new GoogleGenerativeAI(...)` works.
  GoogleGenerativeAI: vi.fn(function () {
    return {
      getGenerativeModel: vi.fn(function () {
        return {
          // Chat route uses startChat().sendMessage() for phase 1 (tool call detection),
          // then sendMessageStream() for phase 2 (when tool calls are present).
          // The direct text path (no tool calls) uses phase1.response.text().
          startChat: vi.fn(function () {
            return {
              sendMessage: mockSendMessage,
              sendMessageStream: mockSendMessageStream,
            }
          }),
          // Embedding model path (getRagaContext) uses embedContent.
          embedContent: vi.fn().mockResolvedValue({
            embedding: { values: new Array(768).fill(0.1) },
          }),
        }
      }),
    }
  }),
  // SchemaType and FunctionCallingMode are used in tool declarations in the chat route.
  SchemaType: {
    OBJECT: 'object',
    STRING: 'string',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    ARRAY: 'array',
  },
  FunctionCallingMode: {
    AUTO: 'AUTO',
    ANY: 'ANY',
    NONE: 'NONE',
  },
}))

// NextResponse is still used by the route for 400/500 error paths.
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn().mockImplementation((body: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => body,
    })),
  },
}))

import { POST } from '../../../apps/web/app/api/ai/chat/route'

function makeRequest(body: object): Request {
  return new Request('http://localhost/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  })
}

describe('/api/ai/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Restore the default stream implementation after any per-test overrides.
    mockSendMessageStream.mockImplementation(async () => ({
      stream: (async function* () {
        yield { text: () => 'Sa Re Ga Ma Pa — a peaceful ascent.' }
      })(),
    }))
  })

  it('returns Content-Type: text/event-stream', async () => {
    const req = makeRequest({
      messages: [{ role: 'user', content: 'What swaras define Raga Yaman?' }],
      ragaContext: { name: 'Yaman', aroha: ['S', 'R', 'G', 'M', 'P', 'D', 'N'], avaroha: ['N', 'D', 'P', 'M', 'G', 'R', 'S'] },
    })
    const response = await POST(req)

    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
  })

  it('returns a ReadableStream as the response body', async () => {
    const req = makeRequest({
      messages: [{ role: 'user', content: 'Suggest a composition.' }],
      ragaContext: null,
    })
    const response = await POST(req)

    expect(response.body).toBeInstanceOf(ReadableStream)
  })

  it('streams SSE-formatted chunks followed by [DONE]', async () => {
    const req = makeRequest({
      messages: [{ role: 'user', content: 'Give me a swara pattern.' }],
      ragaContext: null,
    })
    const response = await POST(req)

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let output = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      output += decoder.decode(value)
    }

    expect(output).toContain('data: ')
    expect(output).toContain('data: [DONE]\n\n')
  })

  it('builds a stream response when ragaContext is null', async () => {
    // Route falls back to "No specific raga selected yet." in the prompt.
    const req = makeRequest({
      messages: [{ role: 'user', content: 'Suggest something to practice.' }],
      ragaContext: null,
    })
    const response = await POST(req)

    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    expect(response.body).toBeInstanceOf(ReadableStream)
  })

  it('returns 400 when messages is missing', async () => {
    const req = makeRequest({ ragaContext: null }) // messages intentionally omitted
    const response = await POST(req)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  it('returns 500 when the Gemini call rejects', async () => {
    // sendMessage (phase 1) rejects → route enters Gemini catch block.
    // With no fallback clients in test env, returns 500.
    mockSendMessage.mockRejectedValueOnce(new Error('Quota exceeded'))

    const req = makeRequest({
      messages: [{ role: 'user', content: 'Suggest a raga.' }],
      ragaContext: null,
    })
    const response = await POST(req)

    expect(response.status).toBe(500)
  })
})
