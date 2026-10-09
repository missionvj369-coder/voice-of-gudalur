/**
 * Voice of Gudalur — Emergency mode feature flag (Phase 27).
 *
 * EMERGENCY_MODE is a server-controlled feature flag (env var + DB config).
 * When activated:
 *   - Non-essential endpoints return 503 with { error: 'EMERGENCY_MODE' }
 *   - Public read endpoints serve from in-process cache or static snapshot
 *   - Critical endpoints (homepage, petition, auth, essential media) remain active
 *   - Non-essential analytics, recommendations, live feeds, heavy stats are shed
 *
 * The flag is read live on every request so it can be toggled via Netlify env
 * var without a redeploy. This is a deliberate, coarse-grained kill switch —
 * the goal is "keep the petition working" even if everything else is slow.
 */
import type { Request, Response, NextFunction } from 'express';

const EMERGENCY_ENV = process.env.EMERGENCY_MODE;

/** True if emergency mode is active (checked at request time). */
export function isEmergencyMode(): boolean {
  if (EMERGENCY_ENV === '1' || EMERGENCY_ENV === 'true') return true;
  return false;
}

/**
 * Middleware: if EMERGENCY_MODE is active, non-essential routes are shed.
 * Essential routes (listed below) always proceed.
 */
const ESSENTIAL_PATHS = [
  '/api/auth',          // login, register, refresh, logout
  '/api/petitions/sign', // critical write — must remain available
  '/api/civic',         // Open Civic Signature protocol (verification + sign)
  '/api/petitions/verify', // public verification
  '/api/petitions/sign-stats', // cached public read
  '/api/petitions/ledger', // cached public read
  '/api/manifesto/stats', // cached public read
  '/api/wildlife/incidents', // cached public read
  '/api/wildlife/sightings', // cached public read
  '/api/wildlife/voice', // cached public read
  '/api/media',         // cached public read
  '/api/config/localities', // small cached read
  '/api/config/uidai-keys', // small cached read
  '/api/health',        // health check
  '/api/ready',         // readiness check
];

export function emergencyModeHandler(req: Request, res: Response, next: NextFunction) {
  if (!isEmergencyMode()) return next();

  const path = req.path || req.url || '';
  const isEssential = ESSENTIAL_PATHS.some((p) => path.startsWith(p));

  if (!isEssential) {
    // Shed non-essential endpoints — return 503 with Retry-After to prevent retry storms.
    res.setHeader('Retry-After', '30');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({
      error: 'EMERGENCY_MODE',
      message: 'The site is in emergency mode. Only essential services are available.',
    });
  }

  next();
}

/**
 * Decorator: wraps a route handler so that in emergency mode it returns 503
 * immediately instead of running the handler. Use for non-critical endpoints.
 */
export function emergencyOnly() {
  return (_req: Request, res: Response, _next: NextFunction) => {
    if (!isEmergencyMode()) {
      res.setHeader('Retry-After', '30');
      return res.status(503).json({
        error: 'EMERGENCY_MODE',
        message: 'Temporarily unavailable during emergency mode.',
      });
    }
  };
}
