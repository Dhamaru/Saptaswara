import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mocks — must be before imports
// ---------------------------------------------------------------------------
const mockGetUser = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null })
)

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(function () {
    return {
      auth: { getUser: mockGetUser },
    }
  }),
}))

vi.mock('midi-writer-js', () => ({
  default: {
    Track: vi.fn(function () {
      return { setTempo: vi.fn(), addEvent: vi.fn() }
    }),
    NoteEvent: vi.fn(function () {
      return {}
    }),
    Writer: vi.fn(function () {
      return { buildFile: vi.fn().mockReturnValue(new Uint8Array([0, 1, 2, 3])) }
    }),
  },
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn().mockImplementation((body: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}))

import { POST } from '../../../apps/web/app/api/export/midi/route'

const validComposition = {
  composition: {
    layers: [
      {
        id: '1',
        type: 'melody',
        name: 'Melody',
        sequence: [{ frequency: 261.63 }, null, { frequency: 329.63 }, null],
      },
    ],
    bpm: 120,
    name: 'Test Composition',
  },
}

function makeRequest(body: object): Request {
  return new Request('http://localhost/api/export/midi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  })
}

describe('/api/export/midi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null })
  })

  it('POST with valid composition returns audio/midi response', async () => {
    const req = makeRequest(validComposition)
    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('audio/midi')
  })

  it('POST with empty layers array returns 400', async () => {
    const req = makeRequest({
      composition: { layers: [], bpm: 120, name: 'Test' },
    })
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  it('POST with bpm out of range (300) returns 400', async () => {
    const req = makeRequest({
      composition: {
        layers: [{ id: '1', type: 'melody', name: 'Melody', sequence: [] }],
        bpm: 300,
        name: 'Test',
      },
    })
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  it('POST with no auth returns 401', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Not authenticated') })
    const req = makeRequest(validComposition)
    const response = await POST(req)
    expect(response.status).toBe(401)
  })
})
