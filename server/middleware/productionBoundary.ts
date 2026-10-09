/**
 * Open Civic Signature Protocol — server-side production boundary.
 *
 * When PETITION_ONLY_MODE=true, Layer A routes (legacy registration, Aadhaar,
 * admin, full-app features) are blocked. Only Layer B (Civic Signature Protocol)
 * and essential public endpoints remain accessible.
 *
 * Layer A code is PRESERVED in source for future development — it is simply
 * inaccessible in petition-only production deployment.
 */
import type { Request, Response, NextFunction } from 'express';

/**
 * Routes that are BLOCKED in petition-only mode.
 * These constitute Layer A — the legacy Voice of Gudalur application.
 * Each returns 404 (not 403/410) to avoid leaking implementation details.
 */
const LAYER_A_ROUTE_PREFIXES = [
  '/api/auth',          // resident registration, Aadhaar update, sessions
  '/api/admin',         // admin portal
  '/api/media',         // media upload
  '/api/manifesto',     // full-app manifesto
  '/api/wildlife',      // wildlife features
  '/api/officials',     // officials portal
  '/api/config/uidai-keys', // Aadhaar verification keys (Layer A)
];

/**
 * Routes that REMAIN ACCESSIBLE in petition-only mode.
 * These constitute Layer B — the Civic Signature Protocol + essentials.
 */
const LAYER_B_ALLOWED_ROUTE_PREFIXES = [
  '/api/civic',         // Civic Signature Protocol
  '/api/petition',      // public petition signing (mobile)
  '/api/petitions/sign-stats', // public stats
  '/api/config/localities',  // locality picker
  '/api/config/emergency',   // emergency mode check
  '/api/config/health',      // health check
  '/api/health',        // health check
  '/api/ready',         // readiness probe
];

export function isPetitionOnlyMode(): boolean {
  return (process.env.PETITION_ONLY_MODE || '').toLowerCase() === 'true';
}

/**
 * Middleware: blocks Layer A routes when PETITION_ONLY_MODE=true.
 * Returns 404 to avoid leaking which routes exist.
 */
export function productionBoundary(req: Request, res: Response, next: NextFunction): void {
  if (!isPetitionOnlyMode()) {
    return next(); // full mode — everything accessible
  }

  const path = req.path;

  // Always allow Layer B routes
  for (const prefix of LAYER_B_ALLOWED_ROUTE_PREFIXES) {
    if (path === prefix || path.startsWith(prefix + '/')) {
      return next();
    }
  }

  // Block Layer A routes with 404 (not 403/410 — avoid leaking existence)
  res.status(404).json({ error: 'Not found' });
}

/**
 * Helper for routes that need to know if Layer A is accessible.
 */
export function isLayerAAccessible(): boolean {
  return !isPetitionOnlyMode();
}
