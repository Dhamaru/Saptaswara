const DB_NAME = 'saptaswara-v1'
const STORE   = 'ragas'
const META_STORE = 'meta'
const CACHE_TTL  = 30 * 60 * 1000 // 30 min

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE))     db.createObjectStore(STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror  = () => reject(req.error)
  })
}

export async function getCachedRagas(): Promise<{ ragas: any[]; cachedAt: number; stale: boolean } | null> {
  try {
    const db = await openDB()
    const tx = db.transaction([STORE, META_STORE], 'readonly')
    const cachedAt: number = await new Promise((res, rej) => {
      const req = tx.objectStore(META_STORE).get('cachedAt')
      req.onsuccess = () => res(req.result ?? 0)
      req.onerror   = () => rej(req.error)
    })
    if (!cachedAt) return null
    const ragas: any[] = await new Promise((res, rej) => {
      const req = tx.objectStore(STORE).getAll()
      req.onsuccess = () => res(req.result)
      req.onerror   = () => rej(req.error)
    })
    if (!ragas.length) return null
    return { ragas, cachedAt, stale: Date.now() - cachedAt > CACHE_TTL }
  } catch {
    return null
  }
}

export async function cacheRagas(ragas: any[]): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction([STORE, META_STORE], 'readwrite')
    const store = tx.objectStore(STORE)
    await new Promise<void>((res, rej) => {
      const req = store.clear()
      req.onsuccess = () => res()
      req.onerror   = () => rej(req.error)
    })
    for (const raga of ragas) store.put(raga)
    tx.objectStore(META_STORE).put(Date.now(), 'cachedAt')
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res()
      tx.onerror    = () => rej(tx.error)
    })
  } catch {
    // cache write failure is non-fatal
  }
}

export async function clearRagaCache(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction([STORE, META_STORE], 'readwrite')
    tx.objectStore(STORE).clear()
    tx.objectStore(META_STORE).clear()
  } catch {}
}
