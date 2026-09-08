/**
 * Voice of Gudalur — tiny in-memory TTL cache.
 *
 * For the free tier the #1 load lever is "do the expensive thing once, not
 * per-user". Public aggregate endpoints (sign-stats, ledger, media list) are
 * polled by every open client every few seconds. A short TTL cache collapses
 * thousands of identical DB/object-store calls into a handful, with zero
 * visible staleness for the user.
 *
 * IMPORTANT: only use for PUBLIC, non-personal data. Never cache anything
 * tied to a specific user/session. Entries are plain JSON-serializable values.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** Read a cached value if it is fresh; otherwise return undefined. */
export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

/** Store a value with a TTL in milliseconds. */
export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Remove a key (used to invalidate after a write). */
export function cacheDel(key: string): void {
  store.delete(key);
}

/** Run a producer with a TTL cache: return cached value if fresh, else compute + cache. */
export async function cacheWrap<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>,
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== undefined) return cached;
  const value = await producer();
  cacheSet(key, value, ttlMs);
  return value;
}

/** Opportunistic sweep of expired entries (call on an interval if desired). */
export function cacheSweep(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}

export default { get: cacheGet, set: cacheSet, del: cacheDel, wrap: cacheWrap, sweep: cacheSweep };