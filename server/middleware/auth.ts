/**
 * Voice of Gudalur — Express authentication & authorization middleware.
 *
 * Session model:
 *   - On login, the API sets two cookies:
 *       `access_token`  (httpOnly, SameSite=Strict, short TTL — JWT signed w/ SESSION_SECRET)
 *       `refresh_token` (httpOnly, SameSite=Strict, long TTL — opaque, hashed in DB)
 *   - GET /api/auth/refresh exchanges refresh_token for a new access_token.
 *
 * Authorization:
 *   - requireAuth()         — valid access token.
 *   - requireRole(...roles) — access token holds one of the given roles.
 *   - Roles: LOCAL_MEMBER | OFFICIAL | APPROVED_OFFICIAL | ADMIN | PLATFORM_ADMIN
 *
 * CSRF: httpOnly cookies are XSS-immune, but cross-site state-changing
 * requests (POST/PUT/DELETE) require `X-CSRF-Token` == double-submit cookie
 * `csrf_token` (a non-httpOnly cookie).
 */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/client';

export interface SessionUser {
  uid: string;
  phone?: string;
  gudalurId?: string;
  name: string;
  role: string;
  verificationLevel?: string;
  kind: 'user' | 'official';
  localityName?: string;
}

interface AccessTokenPayload {
  uid: string;
  role: string;
  kind: 'user' | 'official';
  iat: number;
  exp: number;
  phone?: string;
  gudalurId?: string;
  name?: string;
  localityName?: string;
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';
const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS ?? 86400);

export function signAccessToken(user: SessionUser): string {
  return jwt.sign(
    { uid: user.uid, role: user.role, kind: user.kind, phone: user.phone, gudalurId: user.gudalurId, name: user.name, localityName: user.localityName },
    SESSION_SECRET,
    { expiresIn: ACCESS_TTL_SECONDS },
  );
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Create + persist a session row, returning tokens to set as cookies. */
export async function createSession(user: SessionUser, userAgent?: string, ip?: string) {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);
  const csrfToken = crypto.randomBytes(24).toString('base64url');

  await db.execute(
    `INSERT INTO sessions (identity_id, identity_kind, refresh_token_hash,
       user_agent, ip, role, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [user.uid, user.kind, refreshTokenHash, userAgent ?? null, ip ?? null, user.role, expiresAt],
  );

  return { accessToken, refreshToken, csrfToken, expiresAt };
}

/** Destroy a session (logout). */
export async function revokeSession(refreshToken: string) {
  const hash = hashToken(refreshToken);
  await db.execute('UPDATE sessions SET revoked_at = now() WHERE refresh_token_hash = $1 AND revoked_at IS NULL', [hash]);
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  if (!token) return null;
  try { return jwt.verify(token, SESSION_SECRET) as AccessTokenPayload; }
  catch { return null; }
}

/** Resolve a session from a refresh token (validates existence + expiry + revocation). */
export async function resolveSession(refreshToken: string) {
  const hash = hashToken(refreshToken);
  const row = await db.queryOne<{
    identity_id: string; identity_kind: string; role: string;
    phone: string | null; gudalur_id: string | null; user_name: string | null; locality_name: string | null;
    expires_at: string; revoked_at: string | null;
  }>(
    `SELECT s.identity_id, s.identity_kind, s.role,
            u.phone, u.gudalur_id, u.name AS user_name, u.locality_name,
            s.expires_at, s.revoked_at
     FROM sessions s
     LEFT JOIN users u ON u.uid = s.identity_id AND s.identity_kind = 'user'
     WHERE s.refresh_token_hash = $1`,
    [hash],
  );
  if (!row) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at) < new Date()) return null;

  const user: SessionUser = {
    uid: row.identity_id,
    phone: row.phone ?? undefined,
    gudalurId: row.gudalur_id ?? undefined,
    name: row.user_name ?? row.identity_id,
    role: row.role ?? 'LOCAL_MEMBER',
    kind: row.identity_kind as 'user' | 'official',
    localityName: row.locality_name ?? undefined,
  };
  return { user, sessionExpiresAt: row.expires_at };
}

// ---------------------------------------------------------------------------
// Express middleware
// ---------------------------------------------------------------------------

function extractAccessToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  if (req.cookies && req.cookies.access_token) return req.cookies.access_token as string;
  return null;
}

/** requireAuth — attach req.user or reject with 401. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractAccessToken(req);
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  (req as any).user = {
    uid: payload.uid,
    role: payload.role,
    kind: payload.kind,
    phone: payload.phone,
    gudalurId: payload.gudalurId,
    name: payload.name,
    localityName: payload.localityName,
  } as SessionUser;
  next();
}

/** requireRole(...roles) — must be auth'd + hold one of the roles. */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role', required: roles });
    }
    next();
  };
}

/** CSRF guard for state-changing requests (double-submit cookie pattern). */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next();
  const header = (req.headers['x-csrf-token'] as string) ?? (req.headers['x-csrf-token'] as string);
  const cookie = req.cookies?.csrf_token as string | undefined;
  if (!header || !cookie) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  // timingSafeEqual THROWS on length mismatch — compare lengths first.
  const headerBuf = Buffer.from(header);
  const cookieBuf = Buffer.from(cookie);
  if (headerBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(headerBuf, cookieBuf)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}

/** Audit logger — call after sensitive operations. */
export async function logAudit(args: {
  actorId?: string; actorKind: 'user' | 'official' | 'system';
  action: string; target?: string; detail?: Record<string, unknown>;
  ip?: string; userAgent?: string;
}) {
  await db.execute(
    `INSERT INTO audit_events (actor_id, actor_kind, action, target, detail, ip, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [args.actorId, args.actorKind, args.action, args.target ?? null,
     args.detail ? JSON.stringify(args.detail) : null, args.ip ?? null, args.userAgent ?? null],
  );
}

