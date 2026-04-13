/**
 * In-memory rate limiter: 20 requests per user per minute (default).
 *
 * NOTE: On Vercel serverless, each function instance has its own memory so this
 * does not enforce limits across concurrent instances. For strict multi-instance
 * enforcement, swap the Map for an Upstash Redis atomic increment. For current
 * usage (AI chat, low traffic) the per-instance limit is an acceptable trade-off.
 *
 * Memory safety: the store is capped at MAX_STORE_SIZE entries. On each call,
 * expired entries are purged first; if the store is still full after purge,
 * the oldest entry is evicted before inserting the new one.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const MAX_STORE_SIZE = 5_000
const store = new Map<string, RateLimitEntry>()

function purgeExpired(now: number) {
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

/** Returns true if the request is within limits, false if it should be rejected. */
export function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): boolean {
  const now = Date.now()

  // Purge expired entries to reclaim memory
  if (store.size >= MAX_STORE_SIZE) purgeExpired(now)

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    // Evict oldest entry if still at capacity after purge
    if (store.size >= MAX_STORE_SIZE) {
      const firstKey = store.keys().next().value
      if (firstKey !== undefined) store.delete(firstKey)
    }
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}

/** Derive a stable, opaque key from the request headers. */
export function getRateLimitKey(req: Request): string {
  const auth = req.headers.get('Authorization')
  if (auth) return `auth:${auth.slice(0, 40)}`

  const forwarded = req.headers.get('X-Forwarded-For')
  if (forwarded) return `ip:${forwarded.split(',')[0].trim()}`

  return 'anonymous'
}
