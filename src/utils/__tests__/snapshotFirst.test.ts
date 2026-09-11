import { describe, it, expect, vi } from 'vitest';
import { snapshotOrLive } from '../snapshotFirst';

describe('snapshotOrLive (static-snapshot crowd read path)', () => {
  it('returns the snapshot and never calls the live API on success', async () => {
    const live = vi.fn(async () => ({ total: 999 }));
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ total: 14, updatedAt: new Date().toISOString() }), { status: 200 }),
    ) as unknown as typeof fetch;
    const out = await snapshotOrLive<{ total: number }>('/data/stats.json', live);
    expect(out.total).toBe(14);
    expect(live).not.toHaveBeenCalled();
  });

  it('falls back to live when snapshot is missing', async () => {
    const live = vi.fn(async () => ({ total: 7 }));
    globalThis.fetch = vi.fn(async () => new Response('not found', { status: 404 })) as unknown as typeof fetch;
    const out = await snapshotOrLive<{ total: number }>('/data/stats.json', live);
    expect(out.total).toBe(7);
    expect(live).toHaveBeenCalledTimes(1);
  });

  it('falls back to live when snapshot is too stale', async () => {
    const live = vi.fn(async () => ({ total: 7 }));
    const stale = new Date(Date.now() - 120_000).toISOString();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ total: 1, updatedAt: stale }), { status: 200 })) as unknown as typeof fetch;
    const out = await snapshotOrLive<{ total: number }>('/data/stats.json', live, { acceptStaleMs: 30_000 });
    expect(out.total).toBe(7);
    expect(live).toHaveBeenCalledTimes(1);
  });

  it('falls back to live when snapshot is HTML (not deployed)', async () => {
    const live = vi.fn(async () => ({ total: 7 }));
    globalThis.fetch = vi.fn(async () => new Response('<!doctype html><html>SPA</html>', { status: 200 })) as unknown as typeof fetch;
    const out = await snapshotOrLive<{ total: number }>('/data/stats.json', live);
    expect(out.total).toBe(7);
  });
});