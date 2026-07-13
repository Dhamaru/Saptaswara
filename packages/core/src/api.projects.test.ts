import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mock state — terminal promises are overridable per-test.
// ---------------------------------------------------------------------------
const mockGetUser = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { user: { id: 'user-abc' } }, error: null })
)
const mockRpc = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { project_id: 'proj-123' }, error: null })
)

// Fluent query builder that stores the final result and lets tests override it.
// Each `from()` call gets a fresh builder; terminal methods resolve the result.
function makeQueryBuilder(result: any) {
  const b: any = {}
  const noop = () => b
  ;['select', 'eq', 'order', 'update', 'delete', 'insert'].forEach(m => { b[m] = vi.fn(noop) })
  b.single  = vi.fn().mockResolvedValue(result)
  return b
}

// Shared builder references so tests can override per-call.
const mockProjectsSelectBuilder = vi.hoisted(() => ({ current: null as any }))
const mockProjectsUpdateBuilder = vi.hoisted(() => ({ current: null as any }))
const mockProjectsDeleteBuilder = vi.hoisted(() => ({ current: null as any }))
const mockLayersSelectBuilder   = vi.hoisted(() => ({ current: null as any }))
const mockLayersUpdateResult    = vi.hoisted(() => ({ current: { error: null } }))
const mockLayersInsertResult    = vi.hoisted(() => ({ current: { error: null } }))

// projects/route.ts calls createClient() without a try/catch — must resolve, not reject.
// Return a client that reports no cookie session so the route falls through to Bearer auth.
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(function () {
    return {
      auth: { getUser: mockGetUser },
      rpc: mockRpc,
      from: vi.fn(function (table: string) {
        if (table === 'projects') {
          return {
            select: vi.fn(function () {
              return mockProjectsSelectBuilder.current
            }),
            update: vi.fn(function () {
              return mockProjectsUpdateBuilder.current
            }),
            delete: vi.fn(function () {
              return mockProjectsDeleteBuilder.current
            }),
          }
        }
        if (table === 'layers') {
          return {
            select: vi.fn(function () {
              return mockLayersSelectBuilder.current
            }),
            update: vi.fn(function () {
              const b: any = {}
              b.eq = vi.fn(() => Promise.resolve(mockLayersUpdateResult.current))
              return b
            }),
            insert: vi.fn(function () {
              return Promise.resolve(mockLayersInsertResult.current)
            }),
          }
        }
        return {}
      }),
    }
  }),
}))

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, limit: 60, remaining: 59, resetAt: 0 }),
  rateLimitedResponse: vi.fn().mockReturnValue({ status: 429, json: async () => ({ error: 'rate_limited' }) }),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn().mockImplementation((body: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}))

import { GET, POST, DELETE } from '../../../apps/web/app/api/projects/route'

function makeGetRequest(): Request {
  return new Request('http://localhost/api/projects', {
    method: 'GET',
    headers: { Authorization: 'Bearer test-token' },
  })
}

function makePostRequest(body: object): Request {
  return new Request('http://localhost/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  })
}

function makeDeleteRequest(id?: string): Request {
  const url = id
    ? `http://localhost/api/projects?id=${id}`
    : 'http://localhost/api/projects'
  return new Request(url, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer test-token' },
  })
}

describe('/api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } }, error: null })
    mockRpc.mockResolvedValue({ data: { project_id: 'proj-123' }, error: null })

    // Default GET projects chain: .select().eq().order() → data
    const getBuilder: any = {}
    getBuilder.eq    = vi.fn(() => getBuilder)
    getBuilder.order = vi.fn().mockResolvedValue({ data: [{ id: 'proj-1', title: 'My Raga' }], error: null })
    mockProjectsSelectBuilder.current = getBuilder

    // Default UPDATE chain: .eq().eq().select().single() → success
    const updateBuilder: any = {}
    updateBuilder.eq     = vi.fn(() => updateBuilder)
    updateBuilder.select = vi.fn(() => updateBuilder)
    updateBuilder.single = vi.fn().mockResolvedValue({ data: { id: 'proj-1' }, error: null })
    mockProjectsUpdateBuilder.current = updateBuilder

    // Default DELETE chain: .eq().eq().select().single() → success
    const deleteBuilder: any = {}
    deleteBuilder.eq     = vi.fn(() => deleteBuilder)
    deleteBuilder.select = vi.fn(() => deleteBuilder)
    deleteBuilder.single = vi.fn().mockResolvedValue({ data: { id: 'proj-1' }, error: null })
    mockProjectsDeleteBuilder.current = deleteBuilder

    // Default layers SELECT chain: .eq() → empty layers
    const layersBuilder: any = {}
    layersBuilder.eq = vi.fn().mockResolvedValue({ data: [], error: null })
    mockLayersSelectBuilder.current = layersBuilder

    mockLayersUpdateResult.current = { error: null }
    mockLayersInsertResult.current = { error: null }
  })

  // ── GET ────────────────────────────────────────────────────────────────────

  it('GET returns 401 when no auth token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no token') })
    const req = new Request('http://localhost/api/projects', {
      method: 'GET',
      // No Authorization header
    })
    const response = await GET(req)
    expect(response.status).toBe(401)
  })

  it('GET returns 200 with projects array', async () => {
    const response = await GET(makeGetRequest())
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(Array.isArray(body)).toBe(true)
  })

  // ── POST — create ──────────────────────────────────────────────────────────

  it('POST new project returns 200 with id', async () => {
    const req = makePostRequest({
      title: 'Raga Yaman Session',
      raga_id: '11111111-1111-1111-1111-111111111111',
      bpm: 120,
    })
    const response = await POST(req)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveProperty('id', 'proj-123')
    expect(body).toHaveProperty('success', true)
  })

  it('POST new project returns 400 when title is missing', async () => {
    const req = makePostRequest({
      raga_id: '11111111-1111-1111-1111-111111111111',
    })
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  it('POST new project returns 400 when raga_id is not a valid UUID', async () => {
    const req = makePostRequest({ title: 'Test', raga_id: 'not-a-uuid' })
    const response = await POST(req)
    expect(response.status).toBe(400)
  })

  it('POST new project returns 400 when bpm is out of range', async () => {
    const req = makePostRequest({
      title: 'Test',
      raga_id: '11111111-1111-1111-1111-111111111111',
      bpm: 300,
    })
    const response = await POST(req)
    expect(response.status).toBe(400)
  })

  it('POST new project returns 500 when RPC fails', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('DB error') })
    const req = makePostRequest({
      title: 'Test',
      raga_id: '11111111-1111-1111-1111-111111111111',
    })
    const response = await POST(req)
    expect(response.status).toBe(500)
  })

  // ── POST — update ──────────────────────────────────────────────────────────

  it('POST update existing project returns 200', async () => {
    const req = makePostRequest({ projectId: 'proj-1', title: 'Renamed' })
    const response = await POST(req)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveProperty('success', true)
  })

  it('POST update returns 404 when project not found or wrong owner', async () => {
    const noRowBuilder: any = {}
    noRowBuilder.eq     = vi.fn(() => noRowBuilder)
    noRowBuilder.select = vi.fn(() => noRowBuilder)
    noRowBuilder.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    mockProjectsUpdateBuilder.current = noRowBuilder

    const req = makePostRequest({ projectId: 'proj-other', title: 'Renamed' })
    const response = await POST(req)
    expect(response.status).toBe(404)
  })

  it('POST update with sequence creates a new layer when none exists', async () => {
    // layers SELECT returns empty → route should call layers.insert()
    const layersBuilder: any = {}
    layersBuilder.eq = vi.fn().mockResolvedValue({ data: [], error: null })
    mockLayersSelectBuilder.current = layersBuilder

    const req = makePostRequest({
      projectId: 'proj-1',
      sequence: [{ note: 'Sa', duration: '4n' }],
    })
    const response = await POST(req)
    expect(response.status).toBe(200)
  })

  it('POST update with sequence updates existing layer', async () => {
    // layers SELECT returns an existing layer
    const layersBuilder: any = {}
    layersBuilder.eq = vi.fn().mockResolvedValue({ data: [{ id: 'layer-1' }], error: null })
    mockLayersSelectBuilder.current = layersBuilder

    const req = makePostRequest({
      projectId: 'proj-1',
      sequence: [{ note: 'Pa', duration: '8n' }],
    })
    const response = await POST(req)
    expect(response.status).toBe(200)
  })

  // ── DELETE ─────────────────────────────────────────────────────────────────

  it('DELETE returns 400 when id is missing', async () => {
    const response = await DELETE(makeDeleteRequest())
    expect(response.status).toBe(400)
  })

  it('DELETE returns 400 when id is not a valid UUID', async () => {
    const response = await DELETE(makeDeleteRequest('not-a-uuid'))
    expect(response.status).toBe(400)
  })

  it('DELETE returns 200 when project is deleted', async () => {
    const response = await DELETE(makeDeleteRequest('11111111-1111-1111-1111-111111111111'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveProperty('success', true)
  })

  it('DELETE returns 404 when project not found or wrong owner', async () => {
    const noRowBuilder: any = {}
    noRowBuilder.eq     = vi.fn(() => noRowBuilder)
    noRowBuilder.select = vi.fn(() => noRowBuilder)
    noRowBuilder.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    mockProjectsDeleteBuilder.current = noRowBuilder

    const response = await DELETE(makeDeleteRequest('11111111-1111-1111-1111-111111111111'))
    expect(response.status).toBe(404)
  })

  it('DELETE returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('invalid token') })
    const response = await DELETE(makeDeleteRequest('11111111-1111-1111-1111-111111111111'))
    expect(response.status).toBe(401)
  })
})
