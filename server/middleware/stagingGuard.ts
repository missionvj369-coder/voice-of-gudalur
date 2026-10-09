/**
 * Voice of Gudalur — staging safety guard (Phase 2).
 *
 * A single configuration switch, `APP_ENV`, marks a deployment as STAGING.
 * Staging exists to prove that the container, TLS, routing, asset pipeline and
 * Cloudflare rules work — NOT to write to the public record. So when
 * `APP_ENV=staging`, this guard fails CLOSED on the routes that would:
 *
 *   • broadcast campaign alerts (and Web-Push them to real devices)
 *   • create real wildlife incidents (also pushed to real devices)
 *   • append public petition / civic signature records to the ledger
 *   • mutate media in the SHARED Storj bucket used by production
 *
 * Why an explicit APP_ENV instead of NODE_ENV: NODE_ENV must stay `production`
 * on staging so session cookies keep `Secure` and the Express runtime serves
 * `dist/`. Reusing it as the staging marker would force insecure cookies.
 *
 * APP_ENV defaults to `production` when NODE_ENV=production, so every existing
 * deployment (Netlify and the Phase 1 image) is unchanged — this guard is inert
 * until someone explicitly sets APP_ENV=staging.
 *
 * ESCAPE HATCH: `STAGING_ALLOW_WRITES=true` re-enables the mutating routes. It
 * is intended ONLY for a staging container wired to an ISOLATED database, and
 * is inert outside staging.
 *
 * FAIL CLOSED: this guard does not rely on a hand-maintained list of "bad"
 * routes alone. Any *unclassified* state-changing `/api` route is refused too,
 * so a route added later is blocked on staging until someone consciously
 * classifies it. The allow list holds only auth plumbing (sign-in / session),
 * which cannot pollute the public record.
 *
 * Deliberately NOT implemented here: blocking `webPush.sendNotification()` at
 * the call sites is done in server.ts (two guards), because push delivery is a
 * side effect of a handler rather than a route of its own.
 */
import type { Request, Response, NextFunction } from 'express';

export type AppEnv = 'production' | 'staging' | 'development';

/** Resolved deployment environment. Explicit APP_ENV wins; otherwise infer. */
export function appEnv(): AppEnv {
  const raw = (process.env.APP_ENV || '').trim().toLowerCase();
  if (raw === 'staging') return 'staging';
  if (raw === 'development' || raw === 'dev') return 'development';
  if (raw === 'production' || raw === 'prod') return 'production';
  // Unset: keep the historical behaviour — a NODE_ENV=production process is
  // production (Netlify default), anything else is a local dev server.
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

/** True when this process is a staging deployment. */
export function isStaging(): boolean {
  return appEnv() === 'staging';
}

/**
 * True when mutating routes are permitted. Always true outside staging, so the
 * guard can never affect production behaviour.
 */
export function stagingAllowsWrites(): boolean {
  return !isStaging() || (process.env.STAGING_ALLOW_WRITES || '').toLowerCase() === 'true';
}

/** Safe, non-secret environment descriptor for health/readiness output. */
export function environmentInfo() {
  const env = appEnv();
  return {
    env,
    staging: env === 'staging',
    writes_allowed: stagingAllowsWrites(),
  };
}

/**
 * Mutating auth plumbing that is SAFE to exercise on staging: signing in, and
 * refreshing or dropping a session, create no public record. Checked BEFORE the
 * deny list, because `/api/admin/login` and `/api/officials/login` live inside
 * prefixes that are otherwise blocked.
 *
 * Honest caveat: an account row (and a session) can still be created or touched
 * by these endpoints, so on a staging container that shares the production
 * database they do write SOMETHING. They cannot pollute the public record, alert
 * real devices, or move real media — which is the boundary this guard defends.
 */
const STAGING_ALLOWED_MUTATING_PREFIXES = [
  '/api/auth',            // register / lookup / google / telegram / refresh / logout / PATCH me
  '/api/admin/login',     // admin sign-in
  '/api/admin/logout',
  '/api/officials/login', // official sign-in
] as const;

/**
 * Route prefixes that WRITE to shared production state. State-changing methods
 * on these are refused on staging. This list covers every mutating route the
 * server exposes today; anything not listed is caught by the default-deny below
 * rather than being silently allowed.
 */
const STAGING_BLOCKED_PREFIXES = [
  '/api/alerts',             // broadcast + broadcast-enhanced (+ Web Push to real devices)
  '/api/voice/incident',     // wildlife incident (+ Web Push to real devices)
  '/api/petitions',          // signature ledger, support + external-support writes
  '/api/petition',           // PUBLIC signing router, mounted separately at the singular path
  '/api/manifesto',          // public manifesto signatures + submissions
  '/api/wildlife',           // incident / sighting / voice / offline-sync writes
  '/api/offline',            // the SAME wildlife router mounted a second time
  '/api/civic',              // Open Civic Signature protocol writes
  '/api/validation',         // witness signature validation records
  '/api/authorization',      // signer authorization records
  '/api/admin',              // admin mutations (login/logout excepted above)
  '/api/officials',          // registration, approve, password reset (login excepted above)
  '/api/media',              // uploads/presign/complete → shared Storj bucket
  '/api/push',               // subscription registration (real devices)
  '/api/ai',                 // model calls: real cost + provider-side logs
] as const;

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** `blocked` value reported for a mutating route nobody has classified yet. */
export const UNCLASSIFIED_MUTATING = 'unclassified-mutating-route';

/** Prefix match on a path boundary, so `/api/auth` never swallows `/api/authorization`. */
function matchesPrefix(prefixes: readonly string[], path: string): string | null {
  return prefixes.find((p) => path === p || path.startsWith(`${p}/`)) ?? null;
}

/**
 * Classify a request for staging: `null` means "let it through", otherwise the
 * name reported in the response's `blocked` field.
 *
 * Order matters — explicit allow, then explicit deny, then DEFAULT DENY. A newly
 * added mutating `/api` route is blocked on staging until someone consciously
 * classifies it, which is what "fail closed" has to mean for a safety boundary.
 */
export function stagingClassification(req: Request): string | null {
  if (!MUTATING_METHODS.has((req.method || 'GET').toUpperCase())) return null;
  const path = (req.path || req.url || '').split('?')[0];
  // Nothing outside /api can reach shared state (static assets, SPA fallback).
  if (!path.startsWith('/api/')) return null;
  if (matchesPrefix(STAGING_ALLOWED_MUTATING_PREFIXES, path)) return null;
  return matchesPrefix(STAGING_BLOCKED_PREFIXES, path) ?? UNCLASSIFIED_MUTATING;
}

/**
 * Middleware: on a staging deployment, refuse state-changing requests to routes
 * that would touch shared production state. Returns 403 (not 404) on purpose —
 * a staging environment must identify itself clearly rather than pretend the
 * route does not exist.
 */
export function stagingGuard(req: Request, res: Response, next: NextFunction) {
  if (stagingAllowsWrites()) return next();

  const blocked = stagingClassification(req);
  if (!blocked) return next();

  const unclassified = blocked === UNCLASSIFIED_MUTATING;
  console.warn(
    `[staging] BLOCKED ${req.method} ${req.path} (${unclassified ? 'unclassified mutating route' : `matched ${blocked}`}) — ` +
    `classify the route in stagingGuard.ts, or set STAGING_ALLOW_WRITES=true only for an isolated staging database.`,
  );
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Environment', 'staging');
  return res.status(403).json({
    error: 'STAGING_WRITE_BLOCKED',
    env: 'staging',
    blocked,
    message: unclassified
      ? 'This staging deployment blocks every unclassified state-changing route. ' +
        'Nothing was written; add the route to stagingGuard.ts if it is safe.'
      : 'This staging deployment refuses writes to shared production state. ' +
        'No public record, media object, alert or notification was created.',
  });
}