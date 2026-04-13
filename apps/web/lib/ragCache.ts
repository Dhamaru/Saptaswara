/**
 * In-process cache for RAG retrieval results and Gemini embeddings.
 *
 * Why in-process?
 *  - Embedding the same query on every request wastes ~200ms + API quota
 *  - Raga knowledge chunks are stable — they don't change between messages
 *  - A single Next.js server instance handles multiple requests; the warm Map
 *    survives across requests within the same process lifecycle
 *
 * Cache keys:
 *  embedCache   → enriched query string → float[] embedding vector
 *  ragaCache    → "ragaName::querySignature" → retrieved knowledge text
 */

const EMBED_TTL_MS = 5 * 60 * 1000  // 5 minutes
const RAGA_TTL_MS  = 15 * 60 * 1000 // 15 minutes — raga KB is stable
const MAX_EMBED_ENTRIES = 500
const MAX_RAGA_ENTRIES  = 100

interface Entry<T> {
  value: T
  expiresAt: number
}

function makeCache<T>(maxSize: number) {
  const store = new Map<string, Entry<T>>()

  function evictExpired() {
    const now = Date.now()
    for (const [k, e] of store) {
      if (now > e.expiresAt) store.delete(k)
    }
  }

  return {
    get(key: string): T | undefined {
      const entry = store.get(key)
      if (!entry) return undefined
      if (Date.now() > entry.expiresAt) { store.delete(key); return undefined }
      return entry.value
    },
    set(key: string, value: T, ttl: number) {
      if (store.size >= maxSize) {
        evictExpired()
        // If still full, evict the oldest insertion
        if (store.size >= maxSize) {
          const firstKey = store.keys().next().value
          if (firstKey !== undefined) store.delete(firstKey)
        }
      }
      store.set(key, { value, expiresAt: Date.now() + ttl })
    },
    size: () => store.size,
  }
}

export const embedCache = makeCache<number[]>(MAX_EMBED_ENTRIES)
export const ragaCache  = makeCache<string>(MAX_RAGA_ENTRIES)

/**
 * Build a context-enriched embedding query.
 *
 * A standalone "what notes should I avoid?" gives poor retrieval.
 * Prefixing with the active raga name + recent conversation snippet
 * anchors the embedding in the right semantic neighbourhood.
 */
export function buildEnrichedQuery(
  userMessage: string,
  ragaName: string | null,
  recentHistory: Array<{ role: string; content: string }>,
): string {
  const parts: string[] = []

  if (ragaName) parts.push(`Raga: ${ragaName}.`)

  // Include last assistant reply as context (gives the embedding model
  // a sense of where the conversation has arrived)
  const lastAssistant = [...recentHistory].reverse().find(m => m.role === 'assistant')
  if (lastAssistant?.content) {
    const snippet = lastAssistant.content.slice(0, 120).replace(/\n/g, ' ')
    parts.push(`Context: ${snippet}.`)
  }

  parts.push(`Query: ${userMessage}`)
  return parts.join(' ')
}

/**
 * Derive a short cache key for a raga+query pair.
 * We don't need the full enriched query in the key — just enough
 * to distinguish different user questions for the same raga.
 */
export function ragaCacheKey(ragaName: string | null, query: string): string {
  // Normalise: lowercase, strip punctuation, keep first 80 chars
  const norm = query.toLowerCase().replace(/[^a-z0-9 ]/g, '').slice(0, 80).trim()
  return `${ragaName ?? '__general__'}::${norm}`
}

export { EMBED_TTL_MS, RAGA_TTL_MS }
