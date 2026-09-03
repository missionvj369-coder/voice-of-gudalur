// Voice of Gudalur — Web Worker pool for off-main-thread QR preprocessing.
//
// Manages a small pool of decode workers. Heavy image enhancement runs on
// background threads so the main thread stays free for scrolling/touch.
// Transfers pixel buffers (zero-copy) and falls back to main-thread when
// Workers are unavailable (e.g. very old browsers).

let pool: Worker[] = [];
let robin = 0;

function getPool(): Worker[] {
  if (pool.length) return pool;
  const n = Math.min(2, navigator.hardwareConcurrency || 2);
  for (let i = 0; i < n; i++) {
    try { pool.push(new Worker(new URL("./decode.worker.ts", import.meta.url), { type: "module" })); } catch { break; }
  }
  return pool;
}

export interface WorkerResult {
  id: number;
  frames: ArrayBuffer[];
  error?: string;
}

/**
 * Run a set of preprocessing strategies on a worker. Resolves with the
 * enhanced RGBA frame buffers, or rejects if no worker is available (caller
 * falls back to main-thread).
 */
export function preprocessOnWorker(
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
  strategies: string[],
): Promise<ArrayBuffer[]> {
  return new Promise((resolve, reject) => {
    const workers = getPool();
    if (!workers.length) { reject(new Error("no-worker")); return; }
    const worker = workers[robin % workers.length];
    robin++;
    const id = Math.random();
    const handler = (e: MessageEvent) => {
      if (e.data.id !== id) return;
      worker.removeEventListener("message", handler);
      if (e.data.error) reject(new Error(e.data.error));
      else resolve(e.data.frames);
    };
    worker.addEventListener("message", handler);
    // Transfer the buffer (zero-copy) — caller must not reuse rgba after this.
    worker.postMessage({ id, width, height, pixels: rgba.buffer, strategies }, [rgba.buffer]);
  });
}
