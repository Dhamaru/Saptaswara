import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks must be hoisted before route imports so their module factories run first.
// ---------------------------------------------------------------------------
const mockDb = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  orderResult: vi.fn(),
  limit: vi.fn(),
  limitResult: vi.fn(),
  maybeSingle: vi.fn(),
  maybeSingleResult: vi.fn(),
  insert: vi.fn(),
  insertResult: vi.fn(),
  upsert: vi.fn(),
  upsertResult: vi.fn(),
  single: vi.fn(),
}))

// The routes try cookie auth first; that helper imports next/headers, which is
// unavailable in the node test environment. Make it fall through to Bearer auth.
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockRejectedValue(new Error('Cookie auth unavailable in test env')),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockDb.getUser },
    from: mockDb.from,
  })),
}))

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, limit: 200, remaining: 199, resetAt: 0 }),
  rateLimitedResponse: vi.fn().mockReturnValue({
    status: 429,
    json: async () => ({ error: 'rate_limited' }),
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

import { GET as getSessions, POST as postSession } from '../../../apps/web/app/api/practice/sessions/route'
import {
  GET as getLessonProgress,
  PATCH as patchLessonProgress,
} from '../../../apps/web/app/api/learn/progress/route'

const RAGA_ID = '11111111-1111-4111-8111-111111111111'

const validStats = {
  total: 10,
  correct: 9,
  wrongVariety: 0,
  varjya: 0,
  vadiHits: 3,
  noteCounts: { S: 2, R: 2, G: 2, P: 2, D: 2 },
}

function makeRequest(url: string, method = 'GET', body?: object, withAuth = true): Request {
  const headers: Record<string, string> = {}
  if (withAuth) headers.Authorization = 'Bearer test-token'
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  return new Request(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function installQueryBuilder() {
  mockDb.from.mockImplementation((table: string) => ({
    select: (...args: any[]) => {
      mockDb.select(table, ...args)

      // eq() must be chainable because progress lookups filter on both user_id
      // and raga_id/lesson_id before calling maybeSingle().
      const eqChain: any = {
        eq: (...eqArgs: any[]) => {
          mockDb.eq(table, ...eqArgs)
          return eqChain
        },
        // Supabase builders are thenable; return a thenable that also exposes
        // .limit() so both GET routes work with this mock.
        order: (...orderArgs: any[]) => {
          mockDb.order(table, ...orderArgs)
          const result = Promise.resolve(mockDb.orderResult(table))
          return {
            limit: (...limitArgs: any[]) => {
              mockDb.limit(table, ...limitArgs)
              return Promise.resolve(mockDb.limitResult(table))
            },
            then: (resolve: any, reject: any) => result.then(resolve, reject),
          }
        },
        maybeSingle: (...maybeArgs: any[]) => {
          mockDb.maybeSingle(table, ...maybeArgs)
          return Promise.resolve(mockDb.maybeSingleResult(table))
        },
      }

      return eqChain
    },
    insert: (payload: any) => {
      mockDb.insert(table, payload)
      return {
        select: () => ({
          single: () => {
            mockDb.single(table, payload)
            return Promise.resolve(mockDb.insertResult(table, payload))
          },
        }),
      }
    },
    upsert: (payload: any, options: any) => {
      mockDb.upsert(table, payload, options)
      return {
        select: () => ({
          single: () => {
            mockDb.single(table, payload)
            return Promise.resolve(mockDb.upsertResult(table, payload))
          },
        }),
      }
    },
  }))
}

describe('/api/practice/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    mockDb.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })
    mockDb.orderResult.mockReturnValue({ data: [], error: null })
    mockDb.limitResult.mockImplementation((table: string) => ({
      data: table === 'practice_sessions' ? [{ id: 'session-1' }] : [{ id: 'progress-1' }],
      error: null,
    }))
    mockDb.maybeSingleResult.mockReturnValue({ data: null, error: null })
    mockDb.insertResult.mockImplementation((_table: string, payload: any) => ({
      data: { id: 'session-1', ...payload },
      error: null,
    }))
    mockDb.upsertResult.mockImplementation((_table: string, payload: any) => ({
      data: { id: 'progress-1', ...payload },
      error: null,
    }))

    installQueryBuilder()
  })

  it('GET returns sessions and progress for an authenticated user', async () => {
    const response = await getSessions(makeRequest('http://localhost/api/practice/sessions?limit=5'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.degraded).toBe(false)
    expect(body.sessions).toHaveLength(1)
    expect(body.progress).toHaveLength(1)
  })

  it('GET degrades gracefully when progress tables are missing', async () => {
    mockDb.limitResult.mockReturnValue({
      data: null,
      error: { code: 'PGRST205', message: 'relation does not exist in schema cache' },
    })

    const response = await getSessions(makeRequest('http://localhost/api/practice/sessions'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ sessions: [], progress: [], degraded: true })
  })

  it('POST persists a session and updates raga and lesson progress', async () => {
    const response = await postSession(
      makeRequest('http://localhost/api/practice/sessions', 'POST', {
        ragaId: RAGA_ID,
        ragaName: 'Yaman',
        durationSeconds: 90,
        lessonId: 'guided-riyaz',
        stats: validStats,
        grammar: { name: 'Yaman', vadi: 'G', samvadi: 'P', varjyaSwaras: [] },
      })
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.diagnosis.score).toBe(90)
    expect(body.progress.raga.mastery_level).toBe('Strong')

    expect(mockDb.insert).toHaveBeenCalledWith(
      'practice_sessions',
      expect.objectContaining({ user_id: 'user-123', raga_name: 'Yaman', score: 90 })
    )
    expect(mockDb.upsert).toHaveBeenCalledWith(
      'user_raga_progress',
      expect.objectContaining({ raga_id: RAGA_ID, sessions_count: 1, best_score: 90 }),
      { onConflict: 'user_id,raga_id' }
    )
    expect(mockDb.upsert).toHaveBeenCalledWith(
      'user_lesson_progress',
      expect.objectContaining({ lesson_id: 'guided-riyaz', completed: true, best_score: 90 }),
      { onConflict: 'user_id,lesson_id' }
    )
  })

  it('POST rejects stats where correct exceeds total', async () => {
    const response = await postSession(
      makeRequest('http://localhost/api/practice/sessions', 'POST', {
        ragaName: 'Yaman',
        stats: { ...validStats, correct: 12 },
      })
    )
    expect(response.status).toBe(400)
  })

  it('POST returns 401 without auth', async () => {
    const response = await postSession(
      makeRequest(
        'http://localhost/api/practice/sessions',
        'POST',
        { ragaName: 'Yaman', stats: validStats },
        false
      )
    )
    expect(response.status).toBe(401)
  })
})

describe('/api/learn/progress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    mockDb.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })
    mockDb.orderResult.mockReturnValue({ data: [], error: null })
    mockDb.maybeSingleResult.mockReturnValue({ data: null, error: null })
    mockDb.upsertResult.mockImplementation((_table: string, payload: any) => ({
      data: { id: 'lesson-progress-1', ...payload },
      error: null,
    }))

    installQueryBuilder()
  })

  it('GET returns lesson progress rows', async () => {
    mockDb.orderResult.mockReturnValue({ data: [{ lesson_id: 'find-sa', completed: true }], error: null })

    const response = await getLessonProgress(makeRequest('http://localhost/api/learn/progress'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.progress).toHaveLength(1)
    expect(body.progress[0].lesson_id).toBe('find-sa')
  })

  it('PATCH upserts completion and keeps the best score', async () => {
    mockDb.maybeSingleResult.mockReturnValue({
      data: { best_score: 70, completed: false, completed_at: null },
      error: null,
    })

    const response = await patchLessonProgress(
      makeRequest('http://localhost/api/learn/progress', 'PATCH', {
        lessonId: 'find-sa',
        completed: true,
        score: 85,
      })
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(mockDb.upsert).toHaveBeenCalledWith(
      'user_lesson_progress',
      expect.objectContaining({ lesson_id: 'find-sa', completed: true, best_score: 85 }),
      { onConflict: 'user_id,lesson_id' }
    )
    expect(body.progress.best_score).toBe(85)
  })

  it('PATCH requires completed or score', async () => {
    const response = await patchLessonProgress(
      makeRequest('http://localhost/api/learn/progress', 'PATCH', { lessonId: 'find-sa' })
    )
    expect(response.status).toBe(400)
  })

  it('PATCH reports degraded storage when the table is missing', async () => {
    mockDb.maybeSingleResult.mockReturnValue({
      data: null,
      error: { code: 'PGRST205', message: 'relation does not exist in schema cache' },
    })

    const response = await patchLessonProgress(
      makeRequest('http://localhost/api/learn/progress', 'PATCH', {
        lessonId: 'find-sa',
        completed: true,
      })
    )
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body).toMatchObject({ error: 'lesson_progress_unavailable', degraded: true })
  })
})
