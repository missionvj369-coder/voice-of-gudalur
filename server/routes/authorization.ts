/**
 * Voice of Gudalur — post-signature provider authorization.
 *
 *   GET  /api/authorization/status    — auth: the trust ladder for ONE own signature
 *   POST /api/authorization/google    — auth: authorize a signed petition with Google
 *   POST /api/authorization/telegram  — auth: validate the mobile number via Telegram
 *
 * WHY AFTER REGISTRATION / AFTER SIGNING
 * --------------------------------------
 * Google and Telegram are AUTHENTICATION + VERIFICATION, never account creation:
 * neither one generates a Gudalur ID (routes/auth.ts#findSocialResident refuses
 * to). Registration stays a plain name + mobile + address form; the two providers
 * are offered on the petition screen, where they strengthen a signature the
 * resident has ALREADY made:
 *
 *   google   → authenticates the person behind the signature
 *   telegram → validates the MOBILE NUMBER the signature was made with
 *
 * Both are OPTIONAL. A signature that carries both authorizations *and* a
 * community witness validation is a FULLY VALIDATED petition — the top of the
 * public ledger ranking (server/db/trustRanking.ts). A signer who has neither
 * provider still has a perfectly valid signature: nothing here is required to
 * sign, and nothing here is required for the signature to count.
 *
 * PRIVACY
 * -------
 * Only `generateProviderSubjectKey(provider, subject)` is stored (a keyed hash);
 * the raw Google `sub` / Telegram id never reaches the database, and the label
 * kept for the resident's own UI is masked ("v***@gmail.com", "@handle").
 * Phone numbers are compared in memory and never stored here.
 *
 * Security posture (reuses the existing Express infra — never duplicates it):
 *  - Global CSRF double-submit guard (server.ts) on every POST.
 *  - requireAuth (access_token JWT cookie) on all three routes.
 *  - Per-IP rate limiters.
 *  - Every signature is scoped to the caller's own identity (`identity_id = uid`)
 *    exactly like /api/validation/create — the client value is never trusted.
 *  - A provider account already linked to a DIFFERENT resident is refused (409).
 */
import { Router, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { db } from '../db/client';
import { logger } from '../utils/logger';
import { requireAuth, logAudit } from '../middleware/auth';
import { generateProviderSubjectKey } from '../security/vouTokens';
import { applyTrustRank } from '../db/trustRanking';
import { verifyGoogleIdToken, verifyTelegramHash } from './auth';

const router = Router();

function ipKey(req: any): string {
  const ip: string = req?.ip || req?.socket?.remoteAddress || 'anonymous';
  if (!ip || ip === 'anonymous') return 'anonymous';
  try { return ipKeyGenerator(ip as any); } catch { return 'anonymous'; }
}

const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: { error: 'Too many requests — please wait a few minutes.' },
  keyGenerator: ipKey,
  validate: { xForwardedForHeader: false, ip: false } as any,
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests — please wait a few minutes.' },
  keyGenerator: ipKey,
  validate: { xForwardedForHeader: false, ip: false } as any,
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
});

/** Telegram Login Widget fields that participate in the signed hash. */
const TELEGRAM_WIDGET_FIELDS = [
  'id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date', 'phone_number',
] as const;

interface SignatureRow {
  id: string;
  public_reference: string;
  status: string;
  validation_count: number;
  unicode_sort_key: number | null;
}

/**
 * Resolve the caller's OWN signature — by row id when the client has it (the
 * sign response) or by public sign hash (a result restored from local storage).
 * Always scoped to the authenticated identity.
 */
async function resolveOwnSignature(
  uid: string,
  body: Record<string, any>,
): Promise<SignatureRow | null> {
  const signatureId = String(body?.signatureId || '').trim();
  const signHash = String(body?.signHash || '').trim();
  if (!signatureId && !signHash) return null;
  const sql = `SELECT id, public_reference, status, validation_count, unicode_sort_key
                 FROM signatures
                WHERE ${signatureId ? 'id = $1' : 'public_reference = $1'} AND identity_id = $2`;
  return db.queryOne<SignatureRow>(sql, [signatureId || signHash, uid]);
}

/** Provider availability, straight from configuration. */
function providerAvailability() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const telegramBotUsername = process.env.TELEGRAM_BOT_USERNAME || '';
  return {
    google: {
      available: Boolean(googleClientId),
      // The OAuth client id is public — it ships in every page that offers
      // Google sign-in. The browser widget needs it to mint an ID token.
      clientId: googleClientId || null,
      reason: googleClientId ? null : 'Google authorization is not configured on this deployment',
    },
    telegram: {
      available: Boolean(telegramBotToken) && Boolean(telegramBotUsername),
      botUsername: telegramBotUsername || null,
      reason: telegramBotToken && telegramBotUsername
        ? null
        : 'Telegram mobile validation is not configured on this deployment',
    },
  };
}

/** Masked display hint for the resident's own UI — never the raw address. */
function maskEmail(email?: string | null): string | null {
  const value = String(email || '').trim();
  const at = value.indexOf('@');
  if (at <= 0) return null;
  return `${value.slice(0, 1)}***${value.slice(at)}`;
}

/** Last 10 digits — compares a Telegram E.164 number with a stored 10-digit one. */
function phoneTail(raw?: string | null): string {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

/** Is this provider subject already linked to a DIFFERENT resident? */
async function subjectLinkedToOtherResident(
  provider: 'google' | 'telegram',
  subject: string,
  ownerUid: string,
): Promise<boolean> {
  const row = await db.queryOne<{ uid: string }>(
    'SELECT uid FROM users WHERE provider = $1 AND provider_subject = $2',
    [provider, subject],
  );
  return Boolean(row && row.uid !== ownerUid);
}

/**
 * Link the provider identity onto the resident row, mirroring
 * routes/auth.ts#findSocialResident: only fill a field that is still empty, so an
 * existing link is never clobbered.
 */
async function linkProviderToResident(
  provider: 'google' | 'telegram',
  subject: string,
  email: string,
  avatarUrl: string | null,
  uid: string,
): Promise<void> {
  await db.execute(
    `UPDATE users SET
       provider         = CASE WHEN provider = '' OR provider IS NULL THEN $1 ELSE provider END,
       provider_subject = CASE WHEN provider_subject = '' OR provider_subject IS NULL THEN $2 ELSE provider_subject END,
       provider_email   = CASE WHEN provider_email = '' OR provider_email IS NULL THEN $3 ELSE provider_email END,
       avatar_url       = COALESCE(avatar_url, $4),
       updated_at       = now()
     WHERE uid = $5`,
    [provider, subject, email, avatarUrl, uid],
  );
}

/** Consent + audit trail for an authorization (migration 020's social_consent_log). */
async function recordConsentAndAudit(
  req: Request,
  uid: string,
  provider: 'google' | 'telegram',
  signatureId: string,
  subjectHash: string,
  extra: Record<string, unknown>,
): Promise<void> {
  await db.execute(
    `INSERT INTO social_consent_log (user_uid, provider, ip, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [uid, provider, req.ip ?? null, req.get('user-agent') ?? null],
  );
  await logAudit({
    actorId: uid,
    actorKind: 'user',
    action: `signature.authorize.${provider}`,
    target: signatureId,
    detail: { provider, ...extra },
    ip: req.ip,
  });
  // Log the HASH only, never the raw subject.
  logger.info(`[authorization] ${provider} authorized by ${uid} for signature ${signatureId} (${subjectHash.slice(0, 8)}…)`);
}

/**
 * The ladder state for one signature. Returned by GET /status AND by both POSTs,
 * so the client updates in a single round trip.
 */
async function buildStatus(signature: SignatureRow) {
  const rows = await db.query<{ provider: string; phone_matched: boolean; subject_label: string | null; authorized_at: string }>(
    `SELECT provider, phone_matched, subject_label, authorized_at
       FROM signature_authorizations
      WHERE signature_id::STRING = $1::STRING`,
    [signature.id],
  );
  const google = rows.rows.find((r) => r.provider === 'google') || null;
  const telegram = rows.rows.find((r) => r.provider === 'telegram') || null;
  const witnessValidated = Number(signature.validation_count || 0) > 0;
  const telegramPhoneMatched = Boolean(telegram?.phone_matched);
  // Both authentications + a community witness validation = fully validated.
  const fullyValidated = Boolean(google) && telegramPhoneMatched && witnessValidated;
  return {
    success: true as const,
    signature: {
      id: signature.id,
      publicReference: signature.public_reference,
      status: signature.status,
      validationCount: Number(signature.validation_count || 0),
      witnessValidated,
      unicodeSortKey: signature.unicode_sort_key === null ? null : Number(signature.unicode_sort_key),
    },
    authorizations: {
      google: {
        authorized: Boolean(google),
        at: google?.authorized_at ?? null,
        label: google?.subject_label ?? null,
      },
      telegram: {
        authorized: Boolean(telegram),
        phoneMatched: telegramPhoneMatched,
        at: telegram?.authorized_at ?? null,
        label: telegram?.subject_label ?? null,
      },
    },
    fullyValidated,
    providers: providerAvailability(),
  };
}

// ----------------------------------------------------------------------
// GET /api/authorization/status  (auth — the ladder for ONE own signature)
// ----------------------------------------------------------------------
router.get('/status', requireAuth, readLimiter, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user?.uid;
    if (!uid) return res.status(401).json({ success: false, error: 'Authentication required' });

    const signature = await resolveOwnSignature(uid, req.query as Record<string, any>);
    if (!signature) {
      return res.status(404).json({
        success: false,
        error: 'Signature not found or not owned by you — signatureId or signHash is required',
      });
    }
    return res.json(await buildStatus(signature));
  } catch (err: any) {
    logger.error('authorization status error:', err);
    return res.status(500).json({ success: false, error: 'Failed to read authorization status' });
  }
});

// ----------------------------------------------------------------------
// POST /api/authorization/google  (auth — Google ID token)
// ----------------------------------------------------------------------
router.post('/google', requireAuth, writeLimiter, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user?.uid;
    if (!uid) return res.status(401).json({ success: false, error: 'Authentication required' });

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({
        success: false,
        error: 'Google authorization is not configured on this deployment',
      });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const idToken = typeof body.idToken === 'string' ? body.idToken : '';
    if (!idToken) {
      return res.status(400).json({ success: false, error: 'idToken is required' });
    }

    const signature = await resolveOwnSignature(uid, body);
    if (!signature) {
      return res.status(404).json({
        success: false,
        error: 'Signature not found or not owned by you — signatureId or signHash is required',
      });
    }

    const payload = await verifyGoogleIdToken(idToken);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Invalid Google ID token' });
    }
    const subject = String(payload.sub || '');
    if (!subject) {
      return res.status(400).json({ success: false, error: 'Google token has no subject' });
    }

    // One Google account may not authorize another resident's signature.
    if (await subjectLinkedToOtherResident('google', subject, uid)) {
      return res.status(409).json({
        success: false,
        error: 'This Google account is already linked to another resident',
      });
    }

    const email = typeof payload.email === 'string' ? payload.email : '';
    const subjectHash = generateProviderSubjectKey('google', subject);
    const subjectLabel = maskEmail(email);

    await linkProviderToResident('google', subject, email, payload.picture ?? null, uid);

    await db.execute(
      `INSERT INTO signature_authorizations (signature_id, provider, subject_hash, subject_label, authorized_at)
       VALUES ($1, 'google', $2, $3, now())
       ON CONFLICT (signature_id, provider) DO UPDATE SET
         subject_hash  = excluded.subject_hash,
         subject_label = excluded.subject_label,
         authorized_at = excluded.authorized_at`,
      [signature.id, subjectHash, subjectLabel],
    );

    await recordConsentAndAudit(req, uid, 'google', signature.id, subjectHash, {
      subject_label: subjectLabel,
      email_verified: Boolean(payload.email_verified),
    });
    await applyTrustRank(db, signature.id);

    const fresh = await resolveOwnSignature(uid, { signatureId: signature.id });
    const status = await buildStatus(fresh ?? signature);
    return res.json({
      ...status,
      message: 'Google authentication recorded — your signature is now authenticated by Google.',
    });
  } catch (err: any) {
    logger.error('authorization google error:', err);
    return res.status(500).json({ success: false, error: 'Google authorization failed' });
  }
});

// ----------------------------------------------------------------------
// POST /api/authorization/telegram  (auth — Telegram Login Widget payload)
// ----------------------------------------------------------------------
router.post('/telegram', requireAuth, writeLimiter, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user?.uid;
    if (!uid) return res.status(401).json({ success: false, error: 'Authentication required' });

    const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    if (!botToken) {
      return res.status(503).json({
        success: false,
        error: 'Telegram mobile validation is not configured on this deployment',
      });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const signature = await resolveOwnSignature(uid, body);
    if (!signature) {
      return res.status(404).json({
        success: false,
        error: 'Signature not found or not owned by you — signatureId or signHash is required',
      });
    }

    // Only the widget's own signed fields may enter the hash check — our
    // signatureId/signHash would otherwise change the digest and fail closed.
    const widget: Record<string, any> = {};
    for (const field of TELEGRAM_WIDGET_FIELDS) {
      if (body[field] !== undefined) widget[field] = body[field];
    }
    if (body.hash !== undefined) widget.hash = body.hash;

    if (!widget.id || !widget.hash) {
      return res.status(400).json({ success: false, error: 'Telegram login payload is incomplete' });
    }
    if (!verifyTelegramHash(widget, botToken)) {
      return res.status(401).json({ success: false, error: 'Invalid Telegram authentication' });
    }
    // Replay protection: auth_date within 24 hours (same rule as /api/auth/telegram).
    const authAge = Math.floor(Date.now() / 1000) - Number(widget.auth_date);
    if (!Number.isFinite(authAge) || authAge < 0 || authAge > 86400) {
      return res.status(401).json({ success: false, error: 'Telegram authentication expired' });
    }

    const subject = String(widget.id);
    if (await subjectLinkedToOtherResident('telegram', subject, uid)) {
      return res.status(409).json({
        success: false,
        error: 'This Telegram account is already linked to another resident',
      });
    }

    // TELEGRAM IS FOR MOBILE-NUMBER VALIDATION: it only completes that rung when
    // the number shared with the bot matches the number on the resident record.
    // The number is compared here in memory and NEVER stored.
    const resident = await db.queryOne<{ phone: string | null }>(
      'SELECT phone FROM users WHERE uid = $1',
      [uid],
    );
    const registeredTail = phoneTail(resident?.phone);
    const sharedTail = phoneTail(widget.phone_number);
    const phoneMatched = Boolean(sharedTail) && sharedTail === registeredTail;

    const subjectHash = generateProviderSubjectKey('telegram', subject);
    const subjectLabel = widget.username ? `@${widget.username}` : null;
    const avatarUrl = typeof widget.photo_url === 'string' ? widget.photo_url : null;

    await linkProviderToResident('telegram', subject, '', avatarUrl, uid);

    await db.execute(
      `INSERT INTO signature_authorizations (signature_id, provider, subject_hash, subject_label, phone_matched, authorized_at)
       VALUES ($1, 'telegram', $2, $3, $4, now())
       ON CONFLICT (signature_id, provider) DO UPDATE SET
         subject_hash  = excluded.subject_hash,
         subject_label = excluded.subject_label,
         phone_matched = excluded.phone_matched,
         authorized_at = excluded.authorized_at`,
      [signature.id, subjectHash, subjectLabel, phoneMatched],
    );

    await recordConsentAndAudit(req, uid, 'telegram', signature.id, subjectHash, {
      subject_label: subjectLabel,
      phone_matched: phoneMatched,
    });
    await applyTrustRank(db, signature.id);

    const fresh = await resolveOwnSignature(uid, { signatureId: signature.id });
    const status = await buildStatus(fresh ?? signature);
    return res.json({
      ...status,
      message: phoneMatched
        ? 'Mobile number validated with Telegram.'
        : 'Telegram connected, but no mobile number was shared — open the bot and share your number to complete the mobile validation.',
    });
  } catch (err: any) {
    logger.error('authorization telegram error:', err);
    return res.status(500).json({ success: false, error: 'Telegram authorization failed' });
  }
});

export default router;
