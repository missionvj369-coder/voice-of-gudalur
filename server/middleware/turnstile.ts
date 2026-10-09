/**
 * Open Civic Signature Protocol — server-side Turnstile validation middleware.
 *
 * Feature-flagged: activation requires BOTH env vars:
 *   TURNSTILE_SECRET_KEY   (server-only)
 *   (frontend uses VITE_TURNSTILE_SITE_KEY to render the widget)
 *
 * Behavior:
 *  - Unconfigured → pass through (no Turnstile on this deployment). This is a
 *    deliberate operational choice: a site that cannot complete the widget must
 *    not be bricked; the anti-bot challenge + rate limiters remain active.
 *  - Configured → the client must POST a `cf-turnstile-response` token; it is
 *    verified server-side with Cloudflare's siteverify. Failures → 403.
 *  - Tokens are single-use on Cloudflare's side.
 *
 * Never log the token or the secret.
 */
import type { Request, Response, NextFunction } from 'express';
import { providerErrors } from '../services/identity/providers/errors';
import { circuitBreaker } from './circuitBreaker';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function isTurnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export interface TurnstileVerifyResult {
  success: boolean;
  'error-codes'?: string[];
  action?: string;
  hostname?: string;
}

export async function verifyTurnstileToken(token: string): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Not configured — treat as transparent (route middleware handles this).
    return { success: true };
  }
  if (!token || typeof token !== 'string' || token.length > 16_384) {
    return { success: false, 'error-codes': ['missing-input-response'] };
  }
  try {
    const body = new URLSearchParams({ secret, response: token });
    const res = await circuitBreaker(
      'turnstile:siteverify',
      async () => {
        const r = await fetch(TURNSTILE_VERIFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
          signal: AbortSignal.timeout(5000),
        });
        const text = await r.text();
        try {
          return JSON.parse(text) as TurnstileVerifyResult;
        } catch {
          throw providerErrors.malformed('turnstile', 'non-JSON siteverify response');
        }
      },
      { timeoutMs: 5000 },
    );
    return res;
  } catch {
    // Network/verification failure — fail the request securely (never allow
    // Turnstile failure to silently become a pass).
    return { success: false, 'error-codes': ['internal-error'] };
  }
}

/**
 * Express middleware. When Turnstile is configured, extracts the token from
 * `req.body['cf-turnstile-response']` (or header X-Turnstile-Token), verifies
 * it, and rejects with 403 when invalid.
 */
export function turnstileProtection(req: Request, res: Response, next: NextFunction) {
  if (!isTurnstileConfigured()) return next(); // transparent when not configured
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next();

  const token: string =
    (typeof req.body?.['cf-turnstile-response'] === 'string' ? req.body['cf-turnstile-response'] : '') ||
    (typeof req.headers['x-turnstile-token'] === 'string' ? (req.headers['x-turnstile-token'] as string) : '');

  void verifyTurnstileToken(token).then((result) => {
    if (result.success) {
      next();
    } else {
      res.status(403).json({ error: 'Bot verification failed', codes: result['error-codes'] ?? ['unknown'] });
    }
  });
}