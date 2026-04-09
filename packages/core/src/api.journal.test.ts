import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks must be hoisted before imports so the module factory runs first.
// ---------------------------------------------------------------------------
const mockGetUser = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })
)

const mockSelect = vi.hoisted(() => vi.fn())
const mockEq = vi.hoisted(() => vi.fn())
const mockOrder = vi.hoisted(() => vi.fn())
const mockInsert = vi.hoisted(() => vi.fn())
const mockInsertSelect = vi.hoisted(() => vi.fn())
const mockSingle = vi.hoisted(() => vi.fn())

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(function () {
    return {
      auth: { getUser: mockGetUser },
      from: vi.fn(function () {
        return {
          select: mockSelect.mockReturnValue({
            eq: mockEq.mockReturnValue({
              order: mockOrder.mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: mockInsert.mockReturnValue({
            select: mockInsertSelect.mockReturnValue({
              single: mockSingle.mockResolvedValue({
                data: {
                  id: 'log-1',
                  raga: 'Yaman',
                  notes: 'Good',
                  intensity: 'Deep',
                  log_date: '2026-04-08',
                  user_id: 'user-123',
                },
                error: null,
              }),
            }),
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

import { GET, POST } from '../../../apps/web/app/api/journal/route'

function makeGetRequest(): Request {
  return new Request('http://localhost/api/journal', {
    method: 'GET',
    headers: { Authorization: 'Bearer test-token' },
  })
}

function makePostRequest(body: object): Request {
  return new Request('http://localhost/api/journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  })
}

describe('/api/journal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })
    mockOrder.mockResolvedValue({ data: [], error: null })
    mockSingle.mockResolvedValue({
      data: {
        id: 'log-1',
        raga: 'Yaman',
        notes: 'Good',
        intensity: 'Deep',
        log_date: '2026-04-08',
        user_id: 'user-123',
      },
      error: null,
    })
  })

  // GET tests
  it('GET with valid auth returns 200 with data array', async () => {
    const req = makeGetRequest()
    const response = await GET(req)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('GET with no auth returns 401', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Not authenticated') })
    const req = makeGetRequest()
    const response = await GET(req)
    expect(response.status).toBe(401)
  })

  // POST tests
  it('POST with valid body returns 200', async () => {
    const req = makePostRequest({ raga: 'Yaman', notes: 'Practice notes', intensity: 'Deep' })
    const response = await POST(req)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveProperty('success', true)
  })

  it('POST with invalid intensity returns 400', async () => {
    const req = makePostRequest({ raga: 'Yaman', notes: 'Notes', intensity: 'InvalidValue' })
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  it('POST with malformed date returns 400', async () => {
    const req = makePostRequest({ raga: 'Yaman', notes: 'Notes', intensity: 'Deep', date: '13/32/2026' })
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  it('POST with missing raga returns 400', async () => {
    const req = makePostRequest({ notes: 'Notes', intensity: 'Deep' })
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })
})
