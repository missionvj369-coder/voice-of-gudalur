/**
 * Open Civic Signature Protocol — public protocol API (Layer B).
 *
 *   GET  /api/civic/capabilities        — provider + assurance capabilities
 *   POST /api/civic/verification/start  — allocate a single-use verification tx
 *   POST /api/civic/verification/complete — run the provider verification
 *   POST /api/civic/sign                — create a signature bound to the tx
 *   GET  /api/civic/signatures/ledger   — public anonymized identifiers
 *   GET  /api/civic/signatures/:civicId — public lookup (masked)
 *
 * Security posture (reuses existing infra — never duplicates it):
 *  - Global CSRF double-submit guard (server.ts) on every POST.
 *  - Anti-bot signed challenge (../utils/antibotChallenge) + honeypot.
 *  - Per-IP rate limiters per endpoint (express-rate-limit).
 *  - Server-side normalization + HMAC identity hash — raw subjects never
 *    persist or log.
 *  - Database UNIQUE(petition_id, mobile_identity_hash) is the ultimate
 *    authority; tx consume is atomic with the signature insert.
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { db } from '../db/client';
import { logger } from '../utils/logger';
import { issueChallenge, verifyChallenge } from '../utils/antibotChallenge';
import { normalizeMobile, isPetitionIdentityConfigured } from '../utils/petitionIdentity';
import { identityKeyHash, identityLogPrefix, isIdentityHashConfigured } from '../services/identity/identityHash';
import { AssuranceLevel } from '../services/identity/types';
import { listCapabilities } from '../services/identity/registry';
import {
  startVerification,
  completeVerification,
  getTransaction,
} from '../services/identity/verificationService';
import { computeSignatureHash, generateCivicSignId, isSignatureHashConfigured } from '../services/identity/signatureHash';
import { recordCivicSign, getCivicSignByCivicId, listPublicCivicSigns } from '../db/repositories/civicSignatureRepository';
import { logAudit } from '../middleware/auth';

const router = Router();

function ipKey(req: any): string {
  const ip: string = req?.ip || req?.socket?.remoteAddress || 'anonymous';
  if (!ip || ip === 'anonymous') return 'anonymous';
  try { return ipKeyGenerator(ip as any); } catch { return 'anonymous'; }
}

const mutateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { error: 'Too many requests — please wait a few minutes.' },
  keyGenerator: ipKey,
  validate: { xForwardedForHeader: false, ip: false } as any,
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
});

const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: { error: 'Too many requests — please wait a few minutes.' },
  keyGenerator: ipKey,
  validate: { xForwardedForHeader: false, ip: false } as any,
});

/** Server-side anti-bot gate shared by POST handlers. */
function requireChallengeOrHoneypot(req: Request, res: Response): boolean {
  const hp = typeof req.body?.hp === 'string' ? req.body.hp : '';
  if (hp !== '') {
    // Honeypot filled — silently succeed (bots believe they won) but write nothing.
    res.status(200).json({ ok: true, isDuplicate: false, message: 'Recorded.' });
    return false;
  }
  const challengeError = verifyChallenge(req.body, Date.now());
  if (challengeError) {
    res.status(400).json({ error: `Verification failed: ${challengeError}` });
    return false;
  }
  return true;
}

function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 100) return null;
  return name;
}

const USER_AGENT_SHA = (req: Request): string =>
  crypto.createHash('sha256').update(req.headers['user-agent'] ?? '', 'utf8').digest('hex');
/** GET /api/civic/capabilities — provider + assurance transparency. */
router.get('/capabilities', readLimiter, (_req: Request, res: Response) => {
  const caps = listCapabilities().map((c) => ({
    provider: c.provider,
    maxAssurance: c.maxAssurance,
    production: c.production,
    sandbox: c.sandbox,
    description: c.description,
  }));
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({
    protocolVersion: '0.1',
    capabilities: caps,
    identityHashConfigured: isIdentityHashConfigured(),
    signatureHashConfigured: isSignatureHashConfigured(),
    identitySecretConfigured: isPetitionIdentityConfigured(),
  });
});

/**
 * POST /api/civic/verification/start
 * body: { name, mobile, challenge, sig, honeypot?, assurance? }
 */
router.post('/verification/start', mutateLimiter, async (req: Request, res: Response) => {
  try {
    if (!requireChallengeOrHoneypot(req, res)) return;
    if (!isPetitionIdentityConfigured() || !isIdentityHashConfigured()) {
      return res.status(503).json({ error: 'SERVICE_TEMPORARILY_BUSY' });
    }
    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json({ error: 'invalid_name' });
    const subject = typeof req.body?.mobile === 'string' ? req.body.mobile : '';
    const requestedAssurance = Number(req.body?.assurance ?? AssuranceLevel.SELF_ASSERTED_MOBILE);
    if (![0, 1, 2, 3, 4].includes(requestedAssurance)) {
      return res.status(400).json({ error: 'invalid_assurance' });
    }

    const result = await startVerification({
      subject,
      requestedAssurance: requestedAssurance as AssuranceLevel,
      requestId: (req as any).requestId,
      clientIpHash: req.ip,
      userAgentHash: USER_AGENT_SHA(req),
    });

    res.setHeader('Cache-Control', 'no-store');
    res.status(201).json(result);
  } catch (e: any) {
    if (e?.message === 'invalid_mobile') return res.status(400).json({ error: 'invalid_mobile' });
    if (/cannot satisfy assurance/i.test(e?.message ?? '')) return res.status(400).json({ error: 'assurance_not_available' });
    logger.error('[civic/verification/start]', e?.message);
    res.status(503).json({ error: 'SERVICE_TEMPORARILY_BUSY' });
  }
});

/**
 * POST /api/civic/verification/complete
 * body: { transactionRef, mobile, consent, challenge, sig, honeypot? }
 */
router.post('/verification/complete', mutateLimiter, async (req: Request, res: Response) => {
  try {
    if (!requireChallengeOrHoneypot(req, res)) return;
    const transactionRef = typeof req.body?.transactionRef === 'string' ? req.body.transactionRef.trim() : '';
    const subject = typeof req.body?.mobile === 'string' ? req.body.mobile : '';
    const consent = req.body?.consent === true;

    if (!/^[A-Z0-9-]{8,64}$/i.test(transactionRef)) {
      return res.status(400).json({ error: 'invalid_transaction_ref' });
    }
    if (!consent) return res.status(400).json({ error: 'consent_required' });

    const result = await completeVerification({
      transactionRef,
      subject,
      consent,
      requestId: (req as any).requestId,
      clientIpHash: req.ip,
      userAgentHash: USER_AGENT_SHA(req),
    });

    const body: Record<string, unknown> = {
      ok: result.ok,
      transactionRef: result.transactionRef,
      state: result.state,
      assuranceLevel: result.assuranceLevel,
    };
    if (result.ok) {
      body.identityPrefix = result.logPrefix; // non-reversible HMAC prefix only
    } else {
      body.failureReason = result.failureReason;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.ok ? 200 : 400).json(body);
  } catch (e: any) {
    if (e?.message === 'invalid_mobile') return res.status(400).json({ error: 'invalid_mobile' });
    if (e?.message === 'transaction_not_found') return res.status(404).json({ error: 'transaction_not_found' });
    logger.error('[civic/verification/complete]', e?.message);
    res.status(503).json({ error: 'SERVICE_TEMPORARILY_BUSY' });
  }
});
/**
 * POST /api/civic/sign
 * body: { transactionRef, mobile, name, idempotencyKey?, challenge, sig, honeypot? }
 */
router.post('/sign', mutateLimiter, async (req: Request, res: Response) => {
  try {
    if (!requireChallengeOrHoneypot(req, res)) return;
    if (!isSignatureHashConfigured()) return res.status(503).json({ error: 'SERVICE_TEMPORARILY_BUSY' });

    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json({ error: 'invalid_name' });
    const subject = typeof req.body?.mobile === 'string' ? req.body.mobile : '';
    const transactionRef = typeof req.body?.transactionRef === 'string' ? req.body.transactionRef.trim() : '';
    if (!/^[A-Z0-9-]{8,64}$/i.test(transactionRef)) {
      return res.status(400).json({ error: 'invalid_transaction_ref' });
    }
    const idempotencyKey = typeof req.body?.idempotencyKey === 'string' ? req.body.idempotencyKey.slice(0, 128) : undefined;

    const tx = await getTransaction(transactionRef);
    if (!tx) return res.status(404).json({ error: 'transaction_not_found' });
    if (tx.state !== 'VERIFIED') {
      const why = tx.state === 'FAILED' ? 'verification_failed' : tx.state === 'EXPIRED' ? 'verification_expired' : 'verification_not_complete';
      return res.status(400).json({ error: why });
    }

    const mobile = normalizeMobile(subject);
    if (!mobile.ok) return res.status(400).json({ error: 'invalid_mobile' });
    const ikh = identityKeyHash(mobile.canonical);
    // The transaction's stored identity must match the signing subject.
    if (tx.identityKeyHash && tx.identityKeyHash !== ikh) {
      return res.status(400).json({ error: 'identity_mismatch' });
    }

    const civicSignId = generateCivicSignId();
    const signatureHash = computeSignatureHash({
      petitionId: 'global',
      identityKeyHash: ikh,
      civicSignId,
      provider: tx.provider,
      assuranceLevel: tx.assuranceLevel,
    });

        const result = await recordCivicSign({
      petitionId: 'global',
      identityKeyHash: ikh,
      fullName: name,
      phoneLast4: mobile.last4,
      verificationTxRef: transactionRef,
      provider: tx.provider,
      assuranceLevel: tx.assuranceLevel,
      signatureHash,
      civicSignId,
            identityKeyVersion: tx.identityKeyVersion,
      userAgentHash: USER_AGENT_SHA(req),
      idempotencyKey,
    });

    await logAudit({
      actorKind: 'system',
      action: result.isDuplicate ? 'CIVIC_SIGN_DUPLICATE' : 'CIVIC_SIGN_CREATED',
      target: `petition_mobile_signs/${result.civicSignId}`,
      detail: {
        identityPrefix: identityLogPrefix(ikh),
        phoneLast4: mobile.last4,
        assurance: tx.assuranceLevel,
        provider: tx.provider,
      },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    const countRow = await db.queryOne<{ signature_count: number }>(
      'SELECT signature_count FROM petition_stats WHERE id = $1', ['global'],
    );

    res.setHeader('Cache-Control', 'no-store');
    res.status(result.isDuplicate ? 200 : 201).json({
      ok: true,
      isDuplicate: result.isDuplicate,
      civicSignId: result.civicSignId,
      signHash: result.signHash,
      signedAt: result.signedAt ?? new Date().toISOString(),
      count: Number(countRow?.signature_count ?? 0),
      message: result.isDuplicate ? 'You have already signed this petition.' : 'Signature recorded.',
    });
  } catch (e: any) {
    if (e?.code === 'CONSUME_FAILED') return res.status(400).json({ error: 'verification_already_used' });
    logger.error('[civic/sign]', e?.message);
    res.status(503).json({ error: 'SERVICE_TEMPORARILY_BUSY' });
  }
});

/** GET /api/civic/signatures/ledger — public anonymized signatures. */
router.get('/signatures/ledger', async (_req: Request, res: Response) => {
  try {
    const items = await listPublicCivicSigns(50);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ signatures: items });
  } catch (e: any) {
    logger.error('[civic/ledger]', e?.message);
    res.status(503).json({ error: 'SERVICE_TEMPORARILY_BUSY' });
  }
});

/** GET /api/civic/signatures/:civicId — masked single-signature lookup. */
router.get('/signatures/:civicId', async (req: Request, res: Response) => {
  try {
    const civicId = (req.params.civicId || '').toUpperCase();
    if (!/^[A-Z0-9]{4,32}$/.test(civicId)) return res.status(400).json({ valid: false });
    const row = await getCivicSignByCivicId(civicId);
    if (!row) return res.status(404).json({ valid: false });
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      valid: true,
      civicSignId: row.civic_sign_id,
      phoneLast4: row.phone_last4,
      signedAt: row.created_at,
    });
  } catch (e: any) {
    logger.error('[civic/signatures/:id]', e?.message);
    res.status(503).json({ error: 'SERVICE_TEMPORARILY_BUSY' });
  }
});

export default router;