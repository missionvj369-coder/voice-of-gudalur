/**
 * Unit tests for the in-process TTL cache (server/utils/ttlCache.ts).
 *
 * No database required — the cache is a pure in-memory Map.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { cacheSet, cacheGet, cacheDel, cacheWrap, cacheSweep } from '../utils/ttlCache';

describe('ttlCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets and gets a value', () => {
    cacheSet('key1', { hello: 'world' }, 1000);
    expect(cacheGet('key1')).toEqual({ hello: 'world' });
  });

  it('returns undefined for a missing key', () => {
    expect(cacheGet('nonexistent')).toBeUndefined();
  });

  it('expires entries after the TTL elapses', () => {
    cacheSet('k', 'v', 5000);
    expect(cacheGet('k')).toBe('v');
    vi.advanceTimersByTime(5001);
    expect(cacheGet('k')).toBeUndefined();
  });

  it('deletes a key explicitly', () => {
    cacheSet('k2', 'v2', 10000);
    cacheDel('k2');
    expect(cacheGet('k2')).toBeUndefined();
  });

  it('cacheWrap returns cached value if fresh', async () => {
    const producer = vi.fn(async () => 'computed');
    const r1 = await cacheWrap('cw', 10000, producer);
    const r2 = await cacheWrap('cw', 10000, producer);
    expect(r1).toBe('computed');
    expect(r2).toBe('computed');
    expect(producer).toHaveBeenCalledTimes(1); // second call used cache
  });

  it('cacheWrap recomputes after expiry', async () => {
    const producer = vi.fn(async () => 'val');
    await cacheWrap('cw2', 2000, producer);
    vi.advanceTimersByTime(2001);
    await cacheWrap('cw2', 2000, producer);
    expect(producer).toHaveBeenCalledTimes(2);
  });

  it('cacheSweep removes expired entries but keeps fresh ones', () => {
    cacheSet('a', 1, 1000);
    cacheSet('b', 2, 10000);
    vi.advanceTimersByTime(2000);
    cacheSweep();
    expect(cacheGet('a')).toBeUndefined();
    expect(cacheGet('b')).toBe(2);
  });
});
