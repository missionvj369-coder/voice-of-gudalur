/**
 * Voice of Gudalur — PUBLIC petition signing API (Name + Mobile, no account).
 *
 *   GET  /api/petition/challenge  — issue an anti-bot signed challenge
 *   POST /api/petition/sign       — sign once with Name + Mobile
 *
 * CSRF: state-changing requests pass the GLOBAL double-submit csrf guard
 * (server.ts); the petition-only page bootstraps its csrf_token cookie via
 * GET /api/auth/csrf before POSTing.
 *
 * Authoritative uniqueness: UNIQUE (petition_id, mobile_identity_hash) in
 * petition_mobile_signs — enforced by CockroachDB, never by the browser.
 *
 * Anti-bot layers (in order, cheap first):
 *   1. honeypot field (invisible to humans, instantly filled by bots)
 *   2. per-IP rate limiter (30/15min — moderate; NAT carriers stay usable)
 *   3. server-issued signed challenge, single-use, 3-minute validity
 *   4. minimum interaction time (2s between challenge issue and submit)
 *   5. input validation (server-side name + mobile normalization)
 *   6. DATABASE UNIQUE constraint (absolute: one mobile = one signature)
 *
 * Nothing about the raw mobile number is stored or logged — only the HMAC
 * identity hash and phone_last4. Audit entries carry the hash prefix only.
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { db } from '../db/client';
import { logger } from '../utils/logger';
import { logAudit } from '../middleware/auth';
import { cacheWrap, cacheDel } from '../utils/ttlCache';
import {
  normalizeMobile, mobileIdentityHash,
  isPetitionIdentityConfigured, identityLogPrefix,
} from '../utils/petitionIdentity';
import { recordMobileSign, getMobileSignByHash } from '../db/repositories/petitionMobileRepository';
import { issueChallenge, verifyChallenge } from '../utils/antibotChallenge';

const router = Router();

// ── Rate limiting ────────────────────────────────────────────────────
// Moderate per-IP cap: mobile carriers / NAT can put many LEGITIMATE users
// behind one address (Phase 17 — never block mass participation), so this is
// generous for humans but useless for a flood. The DATABASE constraint is
// what actually stops duplicate signatures.
function ipKey(req: any): string {
  const ip: string = req?.ip || req?.socket?.remoteAddress || 'anonymous';
  if (!ip || ip === 'anonymous') return 'anonymous';
  try { return ipKeyGenerator(ip as any); } catch { return 'anonymous'; }
}

const signLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many sign attempts — please wait a few minutes.' },
  keyGenerator: ipKey,
  validate: { xForwardedForHeader: false, ip: false } as any,
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
});

const challengeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests — please wait a few minutes.' },
  keyGenerator: ipKey,
  validate: { xForwardedForHeader: false, ip: false } as any,
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
});


/** Clean a display name: trim, collapse whitespace, strip control chars. */
function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 100) return null;
  return name;
}

const USER_AGENT_SHA = (req: Request): string =>
  crypto.createHash('sha256').update(req.headers['user-agent'] ?? '', 'utf8').digest('hex');

const STATS_KEY = 'petition:sign-stats'; // same key the resident routes invalidate

async function publicSignatureCount(): Promise<number> {
  const row = await db.queryOne<{ signature_count: number }>(
    'SELECT signature_count FROM petition_stats WHERE id = $1', ['global'],
  );
  return Number(row?.signature_count ?? 0);
}

/** GET /api/petition/challenge — issue a fresh signed anti-bot challenge. */
router.get('/challenge', challengeLimiter, (_req: Request, res: Response) => {
  const issued = issueChallenge();
  if (!issued) {
    // Fail closed, loudly — never weaken the identity scheme silently.
    logger.error('[petition/challenge] PETITION_IDENTITY_SECRET missing — signing disabled');
    return res.status(503).json({ error: 'SERVICE_TEMPORARILY_BUSY' });
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json(issued);
});

/**
 * POST /api/petition/sign — one Name + Mobile = one signature.
 * Body: { name, mobile, challenge, sig, hp?, idempotencyKey? }
 * `hp` is a honeypot: invisible to humans; bots that fill it get a
 * deliberately vague 400 (no signal about what tripped).
 */
router.post('/sign', signLimiter, async (req: Request, res: Response) => {
  try {
    // 0. Identity secret must be present (fail closed → 503, retry-safe).
    if (!isPetitionIdentityConfigured()) {
      logger.error('[petition/sign] PETITION_IDENTITY_SECRET missing — signing disabled');
      return res.status(503).json({ error: 'SERVICE_TEMPORARILY_BUSY' });
    }

    // 1. Honeypot — generic 400, no details (never hint at bot filters).
    const hp = req.body?.hp;
    if (typeof hp === 'string' && hp.trim() !== '') {
      logger.warn('[petition/sign] honeypot tripped', { ip: req.ip });
      return res.status(400).json({ error: 'Invalid submission' });
    }

    // 2. Anti-bot challenge (signed, single-use, expiry + interaction time).
    const challengeErr = verifyChallenge(req.body, Date.now());
    if (challengeErr) {
      logger.info('[petition/sign] challenge rejected', { reason: challengeErr, ip: req.ip });
      return res.status(400).json({ error: 'Verification failed — please reload and try again.' });
    }

    // 3. Server-side validation. The CLIENT's normalized mobile is advisory —
    //    normalization runs again here (never trust the browser).
    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json({ error: 'Please enter your full name.' });
    const mobile = normalizeMobile(req.body?.mobile);
    if (!mobile.ok) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    // 4. Protected identity key — HMAC, never the raw number.
    const mobileHash = mobileIdentityHash(mobile.canonical);

    // 5. Durable, idempotent, race-safe write. A retried request carrying the
    //    same idempotencyKey receives the ORIGINAL response (same result).
    const idempotencyKey =
      typeof req.body?.idempotencyKey === 'string' && req.body.idempotencyKey.length <= 100
        ? req.body.idempotencyKey
        : undefined;
    const result = await recordMobileSign({
      petitionId: 'global',
      mobileIdentityHash: mobileHash,
      fullName: name,
      phoneLast4: mobile.last4,
      userAgentHash: USER_AGENT_SHA(req),
      assignBatch: true,
      idempotencyKey,
    });

    // The public counter changed (or a duplicate arrived) — drop the stats
    // cache so the next poll recomputes within one TTL window.
    cacheDel(STATS_KEY);

    await logAudit({
      actorKind: 'user', // a person, though they carry no account id (public sign)
      action: result.isDuplicate ? 'PUBLIC_SIGN_PETITION_DUP' : 'PUBLIC_SIGN_PETITION',
      target: 'petition_mobile_signs',
      // NEVER log the raw mobile. The HMAC prefix is non-reversible and the
      // last4 is display-only — enough to investigate abuse, no PII risk.
      detail: {
        mobilePrefix: identityLogPrefix(mobileHash),
        phoneLast4: mobile.last4,
        isDuplicate: result.isDuplicate,
      },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    const count = await publicSignatureCount();
    // Duplicates stay idempotent (200, same result) — never an error; the UI
    // shows the "already signed" confirmation with the ORIGINAL sign time.
    res.status(result.isDuplicate ? 200 : 201).json({
      ok: true,
      isDuplicate: result.isDuplicate,
      signHash: result.signHash,
      verifyUrl: result.verifyUrl,
      batchNo: result.batchNo,
      // Authoritative ORIGINAL sign time on duplicates — never Date.now().
      signedAt: result.signedAt ?? new Date().toISOString(),
      count,
      message: result.isDuplicate
        ? 'You have already signed this petition.'
        : 'Signature recorded.',
    });
  } catch (e: any) {
    logger.error('[petition/sign] error:', e?.message);
    // Stable, retry-safe overload response — never raw DB errors (Phase 35).
    res.status(503).json({ error: 'SERVICE_TEMPORARILY_BUSY' });
  }
});

/** GET /api/petition/count — lightweight public count (6s in-process TTL). */
router.get('/count', async (_req: Request, res: Response) => {
  try {
    const data = await cacheWrap('petition:public-count', 6 * 1000, publicSignatureCount);
    res.json({ count: data });
  } catch {
    res.json({ count: 0 }); // degraded — the hero still renders, just 0
  }
});

/** GET /api/petition/check — has this mobile already signed? (UX pre-fill
 *  only; the DB constraint is authoritative on submit). Server-normalizes
 *  again and answers with a boolean; no PII leaves the server. */
router.get('/check', async (req: Request, res: Response) => {
  try {
    if (!isPetitionIdentityConfigured()) return res.status(503).json({ error: 'SERVICE_TEMPORARILY_BUSY' });
    const mobile = normalizeMobile(req.query.mobile);
    if (!mobile.ok) return res.status(400).json({ error: 'invalid_mobile' });
    const mobileHash = mobileIdentityHash(mobile.canonical);
    const row = await db.queryOne<{ sign_hash: string }>(
      'SELECT sign_hash FROM petition_mobile_signs WHERE petition_id = $1 AND mobile_identity_hash = $2 LIMIT 1',
      ['global', mobileHash],
    );
    res.json({ signed: !!row, signHash: row?.sign_hash ?? null });
  } catch {
    res.json({ signed: false, signHash: null }); // degraded — never block the form
  }
});

/** GET /api/petition/verify/:hash — receipt verification for mobile signs
 *  (resident receipts verify via /api/petitions/verify/:hash as before). */
router.get('/verify/:hash', async (req: Request, res: Response) => {
  try {
    const row = await getMobileSignByHash(req.params.hash);
    if (!row) return res.status(404).json({ valid: false });
    res.json({
      valid: true,
      sign_hash: row.sign_hash,
      full_name: row.full_name,
      phone_last4: row.phone_last4,
      batch_no: row.batch_no,
      signed_at: row.created_at,
      verified: true,
    });
  } catch {
    res.status(500).json({ error: 'SERVICE_TEMPORARILY_BUSY' });
  }
});

export default router;
