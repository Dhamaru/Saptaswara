/**
 * In-memory rate limiter: 20 requests per user per minute (default).
 * Key is derived from the Authorization header (first 40 chars) or falls back to
 * the X-Forwarded-For / request IP header so no new infrastructure is needed.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

/** Returns true if the request is within limits, false if it should be rejected. */
export function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
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
