/**
 * Voice of Gudalur — lightweight media performance instrumentation.
 *
 * NON-SENSITIVE by design: records only timings, counts and URL paths — no
 * user identifiers, no DB writes, no network beacons. Everything stays in
 * memory on the visitor's device and is exposed read-only at
 * `window.__vogMediaPerf` (useful for a manual console check in production)
 * with a single console summary per page session. Aggregation, if ever
 * needed, should be batched at the edge later — never one row per view.
 */

export interface MediaPerfEntry {
  /** Media URL with any signature/query stripped — no tokens recorded. */
  path: string;
  kind: 'image' | 'video';
  ms: number;
  ok: boolean;
  bytes: number | null;
}

interface MediaPerfState {
  startedAt: number;
  entries: MediaPerfEntry[];
  firstMediaAt: number | null;
  failureCount: number;
  summaryLogged: boolean;
}

const state: MediaPerfState = {
  startedAt: typeof performance !== 'undefined' ? performance.now() : 0,
  entries: [],
  firstMediaAt: null,
  failureCount: 0,
  summaryLogged: false,
};

export function recordMediaStart(kind: 'image' | 'video'): number {
  return typeof performance !== 'undefined' ? performance.now() : 0;
}

export function recordMediaEnd(startMark: number, url: string, kind: 'image' | 'video', ok: boolean, bytes?: number | null): void {
  const ms = typeof performance !== 'undefined' ? Math.round(performance.now() - startMark) : 0;
  let path = '';
  try { path = new URL(url, window.location.href).pathname; } catch { path = ''; }
  state.entries.push({ path, kind, ms, ok, bytes: bytes ?? null });
  if (!ok) state.failureCount += 1;
  if (ok && state.firstMediaAt === null) state.firstMediaAt = Math.round(performance.now() - state.startedAt);
  maybeLogSummary();
}

function maybeLogSummary(): void {
  if (state.summaryLogged || state.entries.length < 4) return;
  state.summaryLogged = true;
  const loads = state.entries.filter((e) => e.ok);
  const totalBytes = loads.reduce((a, e) => a + (e.bytes || 0), 0);
  const summary = {
    firstMediaMs: state.firstMediaAt,
    mediaLoaded: loads.length,
    mediaFailed: state.failureCount,
    initialMediaBytes: totalBytes,
    largestInitialMediaBytes: loads.reduce((a, e) => Math.max(a, e.bytes || 0), 0),
  };
  // Single devtools-facing summary per session — no network write.
  console.info('[vog-media-perf]', summary);
}

/** Read-only snapshot for `window.__vogMediaPerf`. */
export function mediaPerfSnapshot() {
  return {
    firstMediaMs: state.firstMediaAt,
    loaded: state.entries.filter((e) => e.ok).length,
    failed: state.failureCount,
    entries: state.entries.slice(-50),
  };
}

if (typeof window !== 'undefined') {
  (window as unknown as { __vogMediaPerf?: unknown }).__vogMediaPerf = mediaPerfSnapshot;
}
