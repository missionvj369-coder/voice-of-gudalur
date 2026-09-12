/**
 * Voice of Gudalur — Circuit breaker + timeout utilities for external dependencies (Phase 23).
 *
 * Every external dependency (LLM API, Open-Meteo weather, etc.) must go through
 * a circuit breaker so that a slow/hung downstream service cannot consume all
 * application-server connections.
 *
 * Pattern: CLOSED → (consecutive failures ≥ threshold) → OPEN → (timeout elapses)
 * → HALF_OPEN → (1 test call succeeds) → CLOSED, or (fails) → OPEN again.
 */

interface CircuitState {
  failures: number;
  lastFailure: number; // epoch ms
  open: boolean;
}

interface CircuitOptions {
  /** Consecutive failures before opening the circuit. */
  failureThreshold?: number;
  /** How long to stay OPEN before trying HALF_OPEN. */
  resetTimeoutMs?: number;
  /** Per-request timeout in ms. */
  timeoutMs?: number;
}

const state = new Map<string, CircuitState>();

const DEFAULTS: Required<CircuitOptions> = {
  failureThreshold: 3,
  resetTimeoutMs: 30_000,
  timeoutMs: 5_000,
};

function getState(key: string): CircuitState {
  let s = state.get(key);
  if (!s) {
    s = { failures: 0, lastFailure: 0, open: false };
    state.set(key, s);
  }
  return s;
}

/**
 * Wrap an async function with a circuit breaker + timeout.
 * If the circuit is OPEN, the function is NOT called — throws immediately.
 * If the function times out or throws, the failure counter increments.
 */
export async function circuitBreaker<T>(
  key: string,
  fn: () => Promise<T>,
  opts: CircuitOptions = {},
): Promise<T> {
  const config = { ...DEFAULTS, ...opts };
  const s = getState(key);

  const now = Date.now();

  // If circuit is OPEN, check if reset period has elapsed.
  if (s.open) {
    if (now - s.lastFailure < config.resetTimeoutMs) {
      throw new Error(`[circuit-breaker] ${key} is OPEN (circuit breaker tripped)`);
    }
    // Transition to HALF_OPEN — allow one test call.
    s.open = false;
    s.failures = 0;
  }

  // Race the function against a timeout.
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; }, config.timeoutMs);

  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`[circuit-breaker] ${key} timed out after ${config.timeoutMs}ms`)), config.timeoutMs + 100),
      ),
    ]);
    clearTimeout(timer);
    // Success — reset the circuit.
    s.failures = 0;
    s.lastFailure = 0;
    s.open = false;
    return result;
  } catch (err) {
    clearTimeout(timer);
    s.failures++;
    s.lastFailure = now;
    if (s.failures >= config.failureThreshold) {
      s.open = true;
    }
    throw err;
  }
}

/**
 * Convenience: wrap a fetch() call with a circuit breaker + timeout.
 */
export async function fetchProtected(
  key: string,
  url: string,
  init: RequestInit = {},
  opts: CircuitOptions = {},
): Promise<Response> {
  return circuitBreaker(
    key,
    () => fetch(url, { ...init, signal: undefined }), // we control timeout ourselves
    opts,
  );
}

/**
 * Simple per-request timeout wrapper (no circuit breaking).
 * Use for short external calls that don't need state.
 */
export async function withTimeout<T>(fn: () => Promise<T>, ms = 5000): Promise<T> {
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; }, ms);
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms + 100),
      ),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
