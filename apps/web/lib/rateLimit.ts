/**
 * Distributed rate limiter backed by Upstash Redis (sliding window).
 *
 * Three tiers:
 *   ai    — 20 req / 60s   (SSE + embedding calls)
 *   write — 60 req / 60s   (save composition, journal)
 *   read  — 200 req / 60s  (raga search, library)
 *
 * Key strategy: `${userId}:${tier}` — never IP-only (NAT breaks multi-user enforcement).
 *
 * Fallback: if UPSTASH_* env vars are absent (local dev), the in-memory fallback
 * is used and a warning is logged. Requests are NEVER hard-failed due to Redis
 * unavailability — fail-open is intentional (availability > strict limiting in dev).
 */

import { NextResponse } from 'next/server'

// ── Types ──────────────────────────────────────────────────────────────────────

export type RateLimitTier = 'ai' | 'write' | 'read'

interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number   // Unix seconds
}

// ── Tier config ────────────────────────────────────────────────────────────────

const TIERS: Record<RateLimitTier, { limit: number; windowSec: number }> = {
  ai:    { limit: 20,  windowSec: 60 },
  write: { limit: 60,  windowSec: 60 },
  read:  { limit: 200, windowSec: 60 },
}

// ── Upstash client (lazy — only initialised if env vars present) ───────────────

let upstashRatelimit: Record<RateLimitTier, any> | null = null

async function getUpstashLimiters() {
  if (upstashRatelimit) return upstashRatelimit

  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  try {
    const { Ratelimit } = await import('@upstash/ratelimit')
    const { Redis }     = await import('@upstash/redis')
    const redis = new Redis({ url, token })

    upstashRatelimit = {
      ai:    new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20,  '60 s'), prefix: 'rl:ai' }),
      write: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60,  '60 s'), prefix: 'rl:write' }),
      read:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(200, '60 s'), prefix: 'rl:read'  }),
    }
    return upstashRatelimit
  } catch {
    return null
  }
}

// ── In-memory fallback ────────────────────────────────────────────────────────

interface InMemEntry { count: number; resetAt: number }
const memStore = new Map<string, InMemEntry>()
const MAX_MEM  = 5_000

function memCheck(key: string, tier: RateLimitTier): RateLimitResult {
  const { limit, windowSec } = TIERS[tier]
  const now  = Date.now()
  const windowMs = windowSec * 1000

  if (memStore.size >= MAX_MEM) {
    for (const [k, v] of memStore) { if (now > v.resetAt) memStore.delete(k) }
  }

  const entry = memStore.get(key)
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, limit, remaining: limit - 1, resetAt: Math.ceil((now + windowMs) / 1000) }
  }

  entry.count++
  const remaining = Math.max(0, limit - entry.count)
  return {
    allowed:   entry.count <= limit,
    limit,
    remaining,
    resetAt:   Math.ceil(entry.resetAt / 1000),
  }
}

// ── Core check function ───────────────────────────────────────────────────────

export async function checkRateLimit(userId: string, tier: RateLimitTier): Promise<RateLimitResult> {
  const key = `${userId}:${tier}`

  const limiters = await getUpstashLimiters()

  if (!limiters) {
    // Fallback: no UPSTASH env vars — use in-memory and warn once per cold start
    if (!process.env._RL_WARNED) {
      console.warn('[rateLimit] UPSTASH_REDIS_REST_URL not set — using in-memory fallback (not safe for production)')
      ;(process.env as any)._RL_WARNED = '1'
    }
    return memCheck(key, tier)
  }

  try {
    const { success, limit, remaining, reset } = await limiters[tier].limit(key)
    return { allowed: success, limit, remaining, resetAt: Math.ceil(reset / 1000) }
  } catch (err) {
    // Redis unavailable — fail open, log warning
    console.warn('[rateLimit] Upstash error — failing open:', err)
    return memCheck(key, tier)
  }
}

// ── Response helper ───────────────────────────────────────────────────────────

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit':     String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset':     String(result.resetAt),
  }
}

export function rateLimitedResponse(result: RateLimitResult) {
  return NextResponse.json(
    { error: 'rate_limited', retryAfter: result.resetAt - Math.floor(Date.now() / 1000), limit: result.limit, remaining: 0 },
    { status: 429, headers: { ...rateLimitHeaders(result), 'Retry-After': String(result.resetAt - Math.floor(Date.now() / 1000)) } }
  )
}

// ── Legacy shim — keeps existing callers working during transition ─────────────
// The AI chat route currently calls checkRateLimit(userId) (sync, boolean).
// This shim lets that continue without a breaking change.

export function checkRateLimitSync(userId: string, limit = 20, windowMs = 60_000): boolean {
  const key  = `${userId}:ai`
  const tier: RateLimitTier = 'ai'
  const cfg  = TIERS[tier]
  return memCheck(key, tier).allowed
}
