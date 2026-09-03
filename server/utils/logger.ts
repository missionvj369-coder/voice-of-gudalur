/**
 * Minimal structured logger — no external dependency.
 * In production, swap for pino/bunyan if richer observability is required.
 */
export const logger = {
  info: (...args: unknown[]) => console.log('[info]', ...args),
  warn: (...args: unknown[]) => console.warn('[warn]', ...args),
  error: (...args: unknown[]) => console.error('[error]', ...args),
  debug: (...args: unknown[]) => console.debug('[debug]', ...args),
};
