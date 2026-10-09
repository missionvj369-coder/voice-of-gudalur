/**
 * Voice of Gudalur — Request / correlation ID middleware.
 *
 * Every HTTP request receives a correlation ID:
 *   - If the client sends `x-request-id`, it is accepted (sanitized to a
 *     hex string of limited length) so upstream proxies / load balancers
 *     can correlate a full request chain.
 *   - Otherwise one is generated server-side.
 *
 * The ID is:
 *   - attached to `req.id` (and `req.requestId`) for downstream handlers
 *   - prepended to every log line via the structured logger
 *   - returned to the client in the `x-request-id` response header
 *
 * Security:
 *   - Never logs passwords, Aadhaar, tokens, or request bodies.
 *   - The incoming ID is length-limited and hex-only to prevent header
 *     injection / log injection.
 */
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface RequestWithId extends Request {
  id: string;
  requestId: string;
}

/** Accept a well-formed incoming ID or generate one. */
function sanitizeOrGenerate(id: string | undefined): string {
  if (id && /^[a-f0-9-]{8,64}$/i.test(id)) {
    return id;
  }
  // crypto.randomUUID() produces hex+hyphens, 36 chars — well within limits.
    return crypto.randomUUID();
}

/** Middleware that assigns and propagates a request correlation ID. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const id = sanitizeOrGenerate(
    req.headers['x-request-id'] as string | undefined,
  );
  (req as RequestWithId).id = id;
  (req as RequestWithId).requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
