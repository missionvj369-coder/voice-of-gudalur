/**
 * Voice of Gudalur — Express auth routes (Phase 6).
 *
 * Session cookies (httpOnly, SameSite=Strict): access_token (JWT, 15m),
 * refresh_token (opaque, 24h). Non-httpOnly csrf_token backs the double-submit
 * CSRF guard.
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/client';
import { registerResident, loginResident, normalizePhone, rowToResident } from '../services/authService';
import {
  createSession, revokeSession, resolveSession, SessionUser,
  requireAuth,
} from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/** GET /api/auth/check-phone?phone=9876543210 — pre-registration duplicate check. */
router.get('/check-phone', async (req: Request, res: Response) => {
  try {
    const phone = normalizePhone(String(req.query.phone || ''));
    if (phone.length !== 10) {
      return res.status(400).json({ error: 'Provide a 10-digit phone number.', exists: false });
    }
    const existing = await db.queryOne<{ uid: string; gudalur_id: string }>(
      'SELECT uid, gudalur_id FROM users WHERE phone = $1',
      [phone],
    );
    res.json({ exists: Boolean(existing), gudalurId: existing?.gudalur_id ?? null });
  } catch (e: any) {
    logger.error('check-phone:', e.message);
    // Fail-open: let the registration proceed and let the UNIQUE index enforce it.
    res.json({ exists: false });
  }
});

const COOKIE_OPTS: Record<string, any> = {
  httpOnly: true, sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production', path: '/',
};

export function setSessionCookies(res: Response, session: { accessToken: string; refreshToken: string; csrfToken: string }) {
  res.cookie('access_token', session.accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', session.refreshToken, { ...COOKIE_OPTS, maxAge: 24 * 60 * 60 * 1000 });
  res.cookie('csrf_token', session.csrfToken, {
    httpOnly: false, sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production', path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  });
}
function clearSessionCookies(res: Response) {
  res.clearCookie('access_token', COOKIE_OPTS);
  res.clearCookie('refresh_token', COOKIE_OPTS);
  res.clearCookie('csrf_token', { ...COOKIE_OPTS, httpOnly: false, maxAge: 0 });
}

async function findUserByPhone(phone: string) {
  return db.queryOne<{
    uid: string; phone: string; gudalur_id: string; name: string; role: string; verification_level: string;
  }>('SELECT uid, phone, gudalur_id, name, role, verification_level FROM users WHERE phone = $1', [phone]);
}

/** Map a `users` row to the public ResidentProfile shape returned to the client. */
function residentRowToProfile(row: any) {
  return {
    uid: row.uid,
    phone: row.phone,
    gudalurId: row.gudalur_id,
    name: row.name,
    email: row.email ?? undefined,
    localityId: row.locality_id ?? undefined,
    localityName: row.locality_name ?? undefined,
    customPlaceName: row.custom_place_name ?? undefined,
    pincode: row.pincode ?? undefined,
    role: row.role,
    verificationLevel: row.verification_level,
    isBloodDonor: row.is_blood_donor ?? false,
    bloodGroup: row.blood_group ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    aadhaarNumber: row.aadhaar_number ?? undefined,
    aadhaarLast4: row.aadhaar_last4 ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    issuesReported: row.issues_reported ?? 0,
    issuesSupported: row.issues_supported ?? 0,
    representationsCreated: row.representations_created ?? 0,
    alertsAcknowledged: row.alerts_acknowledged ?? 0,
  };
}

/** POST /api/auth/register - Instant passwordless registration (issues Gudalur ID + session). */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const created = await registerResident(req.body);
    if (!created) return res.status(400).json({ error: 'Registration failed' });
    setSessionCookies(res, created.session);
    // created.resident is ALREADY the camelCase shape the client expects
    // (gudalurId, localityName, pincode, …). Do NOT route it through
    // residentRowToProfile — that mapper expects a snake_case DB row and
    // would wipe gudalurId/localityId/pincode to undefined.
    res.status(201).json({ resident: created.resident, csrfToken: created.session.csrfToken });
  } catch (e: any) {
    logger.error('register:', e.message);
    res.status(e.message?.includes('unique') ? 409 : 400).json({ error: e.message });
  }
});

/** POST /api/auth/logout */
router.post('/logout', async (req: Request, res: Response) => {
  const rf = req.cookies?.refresh_token as string | undefined;
  if (rf) await revokeSession(rf);
  clearSessionCookies(res);
  res.json({ ok: true });
});

/** GET /api/auth/me */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  res.json({ user: req.user });
});

/** POST /api/auth/lookup - passwordless login by phone OR Gudalur ID, session issued immediately. */
router.post('/lookup', async (req: Request, res: Response) => {
  try {
    const rawPhone = req.body?.phone;
    const gudalurId = req.body?.gudalurId;
    const phone = rawPhone && String(rawPhone).trim() ? normalizePhone(String(rawPhone)) : undefined;
    const result = await loginResident(phone, gudalurId);
    if (!result) return res.status(404).json({ error: 'No resident found for this phone or Gudalur ID. Register first.' });
    setSessionCookies(res, result.session);
    // result.resident is already camelCase (authService.rowToResident) — return
    // it directly; residentRowToProfile would blank gudalurId etc.
    res.json({ resident: result.resident, csrfToken: result.session.csrfToken });
  } catch (e: any) {
    logger.error('lookup:', e.message);
    res.status(500).json({ error: `Login failed — ${e.message}` });
  }
});

// ─────────────────────────────────────────────────────────────
// Google OAuth + Telegram Login Widget auth
// ─────────────────────────────────────────────────────────────

/**
 * Verify a Google ID token. Returns the verified payload or null.
 * Uses Google's public keys (JWKS) to validate the JWT signature.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<Record<string, any> | null> {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    if (!header.kid) return null;
    const certsRes = await fetch('https://www.googleapis.com/oauth2/v3/certs');
    if (!certsRes.ok) return null;
    const certs = await certsRes.json() as { keys: Array<{ kid: string; n: string; e: string }> };
    const key = certs.keys.find(k => k.kid === header.kid);
    if (!key) return null;
    const crypto = await import('crypto');
    const publicKey = crypto.createPublicKey({ key: { kty: 'RSA', n: key.n, e: key.e, alg: 'RS256', kid: header.kid }, format: 'jwk' });
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(`${parts[0]}.${parts[1]}`);
    const signature = Buffer.from(parts[2], 'base64url');
    if (!verify.verify(publicKey, signature)) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) return null;
    if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) return null;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch (e: any) {
    logger.error('google id token verify:', e.message);
    return null;
  }
}

/** Verify Telegram Login Widget authentication hash. */
export function verifyTelegramHash(payload: Record<string, any>, botToken: string): boolean {
  try {
    const crypto = require('crypto');
    const fields = Object.keys(payload).filter(k => k !== 'hash').sort().map(k => `${k}=${payload[k]}`).join('\n');
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(fields).digest('hex');
    return computedHash === payload.hash;
  } catch { return false; }
}

/** Find an EXISTING resident from a Google/Telegram social identity.
 *  IMPORTANT: Social sign-in is AUTHENTICATION ONLY — no new ID generation.
 *  Users MUST first register through normal data filling to get a Gudalur ID.
 *  Google/Telegram are used ONLY to sign in and sign the petition. */
async function findSocialResident(provider: 'google' | 'telegram', identity: {
  subject: string; name: string; email?: string; phone?: string; photoUrl?: string;
}) {
  // 1. Look up by provider + subject
  let row = await db.queryOne<any>(
    'SELECT uid FROM users WHERE provider = $1 AND provider_subject = $2',
    [provider, identity.subject],
  );
  // 2. For Google, also try by email (user may have registered with same email before)
  if (!row && provider === 'google' && identity.email) {
    row = await db.queryOne<any>('SELECT uid FROM users WHERE email = $1', [identity.email]);
  }
  // 3. For Google, also try by phone (user may have registered with same phone)
  if (!row && identity.phone) {
    row = await db.queryOne<any>('SELECT uid FROM users WHERE phone = $1', [identity.phone]);
  }
  if (!row) {
    // User not found — social sign-in is for EXISTING users only
    throw new Error('NO_ACCOUNT');
  }
  // Update provider link if not already set (link social to existing account)
  await db.execute(
    `UPDATE users SET
      provider = CASE WHEN provider = '' OR provider IS NULL THEN $1 ELSE provider END,
      provider_subject = CASE WHEN provider_subject = '' OR provider_subject IS NULL THEN $2 ELSE provider_subject END,
      provider_email = CASE WHEN provider_email = '' OR provider_email IS NULL THEN $3 ELSE provider_email END,
      avatar_url = COALESCE(avatar_url, $4),
      updated_at = now()
     WHERE uid = $5`,
    [provider, identity.subject, identity.email ?? '', identity.photoUrl ?? null, row.uid],
  );
  // Return the full resident profile
  const full = await db.queryOne<any>(
    `SELECT uid, phone, gudalur_id, name, email, locality_id, locality_name,
            custom_place_name, pincode, role, verification_level, lat, lng,
            created_at, updated_at, is_blood_donor, blood_group, avatar_url, bio
     FROM users WHERE uid = $1`,
    [row.uid],
  );
  if (!full) throw new Error('Failed to load resident after social auth');
  return rowToResident(full);
}

/** POST /api/auth/google — sign in / register with a Google ID token. */
router.post('/google', async (req: Request, res: Response) => {
  try {
    const idToken = req.body?.idToken;
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'Google ID token is required' });
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Google sign-in is not configured' });
    }
    const payload = await verifyGoogleIdToken(idToken);
    if (!payload) return res.status(401).json({ error: 'Invalid Google ID token' });
    const resident = await findSocialResident('google', {
      subject: payload.sub,
      name: payload.name || payload.email?.split('@')[0] || 'Google User',
      email: payload.email,
      phone: payload.phone_number,
      photoUrl: payload.picture,
    });
    const sessionUser = {
      uid: resident.uid, phone: resident.phone, gudalurId: resident.gudalurId,
      name: resident.name, role: resident.role, kind: 'user' as const, localityName: resident.localityName,
    };
    const session = await createSession(sessionUser, req.get('user-agent'), req.ip);
    setSessionCookies(res, session);
    res.json({ resident, csrfToken: session.csrfToken });
  } catch (e: any) {
    logger.error('google auth:', e.message);
    if (e.message === 'NO_ACCOUNT') {
      return res.status(404).json({
        error: 'NO_ACCOUNT',
        message: 'No resident found with this Google account. Please register first with your mobile number to get a Gudalur ID, then sign in with Google.',
      });
    }
    res.status(500).json({ error: `Google sign-in failed — ${e.message}` });
  }
});

/**
 * GET /api/auth/google/url — returns the Google OAuth2 authorization URL.
 * The frontend redirects the user here; Google redirects back to /api/auth/google/callback.
 */
router.get('/google/url', (_req: Request, res: Response) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google sign-in is not configured' });
  }
  const redirectUri = `${process.env.SITE_URL || 'http://localhost:3000'}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'consent',
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

/**
 * GET /api/auth/google/callback — handles the Google OAuth2 callback.
 * Exchanges the code for tokens, fetches user info, creates/looks up the resident,
 * sets session cookies, and redirects back to the app.
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string | undefined;
    if (!code) return res.redirect('/?google_auth=error&reason=no_code');

    const redirectUri = `${process.env.SITE_URL || 'http://localhost:3000'}/api/auth/google/callback`;

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
    if (!tokenRes.ok) return res.redirect('/?google_auth=error&reason=token_exchange_failed');
    const tokens = await tokenRes.json() as { access_token: string; id_token?: string };

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userRes.ok) return res.redirect('/?google_auth=error&reason=userinfo_failed');
    const userInfo = await userRes.json() as {
      id: string; email: string; name: string; picture?: string; verified_email?: boolean;
    };

    const resident = await findSocialResident('google', {
      subject: userInfo.id,
      name: userInfo.name || userInfo.email?.split('@')[0] || 'Google User',
      email: userInfo.email,
      photoUrl: userInfo.picture,
    });

    const sessionUser = {
      uid: resident.uid, phone: resident.phone, gudalurId: resident.gudalurId,
      name: resident.name, role: resident.role, kind: 'user' as const, localityName: resident.localityName,
    };
    const session = await createSession(sessionUser, req.get('user-agent'), req.ip);
    setSessionCookies(res, session);
    res.redirect('/?google_auth=success');
  } catch (e: any) {
    logger.error('google callback:', e.message);
    if (e.message === 'NO_ACCOUNT') {
      res.redirect('/?google_auth=error&reason=no_account&message=' + encodeURIComponent('Please register first with your mobile number to get a Gudalur ID, then sign in with Google.'));
    } else {
      res.redirect(`/?google_auth=error&reason=${encodeURIComponent(e.message)}`);
    }
  }
});

/** POST /api/auth/telegram — sign in / register with Telegram Login Widget payload. */
router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const p = req.body;
    if (!p || !p.hash || !p.id || !p.auth_date) {
      return res.status(400).json({ error: 'Telegram auth payload is required' });
    }
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return res.status(503).json({ error: 'Telegram sign-in is not configured' });
    }
    if (!verifyTelegramHash(p, process.env.TELEGRAM_BOT_TOKEN)) {
      return res.status(401).json({ error: 'Invalid Telegram authentication' });
    }
    // Replay protection: auth_date within 24 hours
    const authAge = Math.floor(Date.now() / 1000) - Number(p.auth_date);
    if (authAge < 0 || authAge > 86400) {
      return res.status(401).json({ error: 'Telegram authentication expired' });
    }
    const tgId = String(p.id);
    const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Telegram User';
    const resident = await findSocialResident('telegram', {
      subject: tgId, name, photoUrl: p.photo_url,
    });
    const sessionUser = {
      uid: resident.uid, phone: resident.phone, gudalurId: resident.gudalurId,
      name: resident.name, role: resident.role, kind: 'user' as const, localityName: resident.localityName,
    };
    const session = await createSession(sessionUser, req.get('user-agent'), req.ip);
    setSessionCookies(res, session);
    res.json({ resident, csrfToken: session.csrfToken });
  } catch (e: any) {
    logger.error('telegram auth:', e.message);
    if (e.message === 'NO_ACCOUNT') {
      return res.status(404).json({
        error: 'NO_ACCOUNT',
        message: 'No resident found with this Telegram account. Please register first with your mobile number to get a Gudalur ID, then sign in with Telegram.',
      });
    }
    res.status(500).json({ error: `Telegram sign-in failed — ${e.message}` });
  }
});

/** PATCH /api/auth/me — update the authenticated resident's profile fields. */
router.patch('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user!.kind !== 'user') return res.status(403).json({ error: 'Resident-only endpoint' });
    const f = req.body || {};
    const name = typeof f.name === 'string' ? f.name.trim() : undefined;
    const email = typeof f.email === 'string' && f.email.trim() ? f.email.trim() : undefined;
    const localityId = typeof f.localityId === 'string' ? f.localityId : undefined;
    const customPlaceName = typeof f.customPlaceName === 'string' ? f.customPlaceName : undefined;
    /** Free-text address — the source of truth for a national supporter's place. */
    const address = typeof f.address === 'string' ? f.address.trim() : undefined;
    const pincode = typeof f.pincode === 'string' ? f.pincode : undefined;
    const lat = typeof f.lat === 'number' ? f.lat : undefined;
    const lng = typeof f.lng === 'number' ? f.lng : undefined;
    const phone = typeof f.phone === 'string' ? normalizePhone(f.phone) : undefined;
    const aadhaarNumber = typeof f.aadhaarNumber === 'string' && /^\d{12}$/.test(f.aadhaarNumber.trim()) ? f.aadhaarNumber.trim() : undefined;

    let localityName: string | undefined;
    if (typeof f.localityName === 'string' && f.localityName.trim()) {
      // Explicit locality name (the typed address) wins — never re-derive from
      // a Gudalur locality table for supporters elsewhere in India.
      localityName = f.localityName.trim();
    } else if (address) {
      localityName = address;
    } else if (localityId) {
      localityName = (await db.queryOne<{ name: string }>('SELECT name FROM locality WHERE id = $1', [localityId]))?.name;
    }
    await db.execute(
      `UPDATE users SET
         name        = COALESCE($2, name),
         email       = COALESCE($3, email),
         phone       = COALESCE($4, phone),
         locality_id = COALESCE($5, locality_id),
         locality_name = COALESCE($6, locality_name),
         custom_place_name = COALESCE($7, custom_place_name),
         pincode     = COALESCE($8, pincode),
         lat         = COALESCE($9, lat),
         lng         = COALESCE($10, lng),
         aadhaar_number = COALESCE($11, aadhaar_number),
         aadhaar_last4 = CASE WHEN $11 IS NOT NULL THEN right($11, 4) ELSE aadhaar_last4 END,
         updated_at  = now()
       WHERE uid = $1`,
      [req.user!.uid, name ?? null, email ?? null, phone ?? null, localityId ?? null,
       localityName ?? null, (address || customPlaceName) ?? null, pincode ?? null,
       lat ?? null, lng ?? null, aadhaarNumber ?? null],
    );
        const row = await db.queryOne<any>(
      `SELECT uid, phone, gudalur_id, name, email, locality_id, locality_name,
              custom_place_name, pincode, role, verification_level,
              lat, lng, aadhaar_number, aadhaar_last4,
              created_at, updated_at, issues_reported, issues_supported,
              representations_created, alerts_acknowledged,
              is_blood_donor, blood_group, avatar_url, bio
       FROM users WHERE uid = $1`,
      [req.user!.uid],
    );
    if (!row) return res.status(404).json({ error: 'Resident not found' });
    res.json({ user: residentRowToProfile(row) });
  } catch (e: any) {
    logger.error('update me:', e.message);
    res.status(e.message?.includes('unique') ? 409 : 500).json({ error: e.message });
  }
});

/** GET /api/auth/csrf */
router.get('/csrf', (_req: Request, res: Response) => {
  const token = crypto.randomUUID().replace(/-/g, '');
  res.cookie('csrf_token', token, { httpOnly: false, sameSite: 'strict', path: '/', maxAge: 86400000 });
  res.json({ csrfToken: token });
});

/** POST /api/auth/forgot — residents authenticate via OTP to their phone. */
router.post('/forgot', async (_req: Request, res: Response) => {
  res.json({
    message: 'Passwordless phone verification only. Enter your mobile number to request an OTP code.',
  });
});

/** POST /api/auth/refresh — exchange refresh_token for a new access_token (rotates). */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const rf = req.cookies?.refresh_token as string | undefined;
    if (!rf) return res.status(401).json({ error: 'No refresh token' });
    const resolved = await resolveSession(rf);
    if (!resolved) return res.status(401).json({ error: 'Invalid or expired session' });
    await revokeSession(rf);
    const session = await createSession(resolved.user, req.get('user-agent'), req.ip);
    setSessionCookies(res, session);
    res.json({ user: resolved.user, csrfToken: session.csrfToken });
  } catch (e: any) {
    logger.error('refresh:', e.message);
    res.status(500).json({ error: 'Refresh failed' });
  }
});

export default router;
