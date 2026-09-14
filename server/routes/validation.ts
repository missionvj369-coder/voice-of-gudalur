/**
 * Open Validation API — witness validation flow (Layer B, Civic Signature Protocol).
 *
 *   GET  /api/validation/verify/:token   — public: fetch signature + link status
 *   POST /api/validation/create          — auth: create a validation link for own signature
 *   POST /api/validation/accept          — auth: accept/witness a validation link (idempotent)
 *   POST /api/validation/reject          — auth: reject/decline a validation link
 *   GET  /api/validation/my-validations  — auth: this identity's signature validation summary
 *
 * Security posture (reuses existing Express infra — never duplicates it):
 *  - Global CSRF double-submit guard (server.ts) on every POST.
 *  - Per-endpoint rate limiters (express-rate-limit), per-IP buckets.
 *  - Session auth via access_token JWT cookie (server/middleware/auth#requireAuth).
 *  - Parameterized SQL via server/db/client (pg + CockroachDB retry semantics).
 *  - Validation links are single-use: accept marks link used + signature VALIDATED;
 *    reject marks link revoked + signature REVIEW_REQUIRED.
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { db } from '../db/client';
import { logger } from '../utils/logger';
import { requireAuth, logAudit } from '../middleware/auth';
import { hashToken, generateSecureToken } from '../security/vouTokens';

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

function requestId(): string {
  return crypto.randomBytes(16).toString('hex');
}


// ----------------------------------------------------------------------
// GET /api/validation/verify/:token  (public, no auth)
// ----------------------------------------------------------------------
router.get('/verify/:token', readLimiter, async (req: Request, res: Response) => {
  const rid = requestId();
  try {
    const token = (req.params.token || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'Token is required', valid: false });
    }
    const tokenHash = hashToken(token);

    const row = await db.queryOne<{
      id: string; signature_id: string; status: string; expires_at: string;
      public_reference: string; public_display_mode: string;
      display_name: string; area: string; status_sig: string;
      signed_at: string; petition_id: string; identity_id: string;
    }>(
      `SELECT
         vl.id, vl.signature_id, vl.status, vl.expires_at,
         s.public_reference, s.public_display_mode,
         s.display_name, s.area, s.status AS status_sig,
         s.signed_at, s.petition_id, s.identity_id
       FROM validation_links vl
       JOIN signatures s ON s.id = vl.signature_id
       WHERE vl.token_hash = $1`,
      [tokenHash],
    );

    if (!row) {
      return res.status(404).json({ error: 'Validation link not found', valid: false });
    }

    if (row.status !== 'active') {
      return res.status(410).json({
        error: 'This validation link has been used or revoked',
        valid: false,
        used: row.status === 'used',
        revoked: row.status === 'revoked',
      });
    }

    if (new Date() > new Date(row.expires_at)) {
      return res.status(410).json({
        error: 'This validation link has expired',
        valid: false,
        expired: true,
      });
    }

    return res.json({
      valid: true,
      validationToken: token,
      signature: {
        id: row.id,
        publicReference: row.public_reference,
        publicDisplayMode: row.public_display_mode,
        displayName: row.display_name,
        area: row.area,
        status: row.status_sig,
        signedAt: row.signed_at,
        petitionId: row.petition_id,
        identityId: row.identity_id,
      },
    });
  } catch (err) {
    logger.error(`[${rid}] validation verify error:`, err);
    return res.status(500).json({ error: 'Failed to verify validation link', valid: false });
  }
});

// ----------------------------------------------------------------------
// POST /api/validation/create  (auth required — owner of signature)
// ----------------------------------------------------------------------
router.post('/create', requireAuth, writeLimiter, async (req: Request, res: Response) => {
  const rid = requestId();
  try {
    const ownerId = (req as any).user?.uid;
    if (!ownerId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const raw = req.body && typeof req.body === 'object' ? req.body : {};
    // The caller may identify its own signature by row id (from the sign
    // response) or by the public sign hash (a result restored from local
    // storage). Both are scoped to the authenticated identity below — the
    // client value is never trusted on its own.
    const signatureId = (raw.signatureId || '').trim();
    const signHash = (raw.signHash || '').trim();
    if (!signatureId && !signHash) {
      return res.status(400).json({ success: false, error: 'signatureId or signHash is required' });
    }

    // Verify ownership + one-shot rule (1 validation per signature).
    const sig = signatureId
      ? await db.queryOne<{ id: string; status: string; validation_count: number; max_validations: number }>(
          'SELECT id, status, validation_count, max_validations FROM signatures WHERE id = $1 AND identity_id = $2',
          [signatureId, ownerId],
        )
      : await db.queryOne<{ id: string; status: string; validation_count: number; max_validations: number }>(
          'SELECT id, status, validation_count, max_validations FROM signatures WHERE public_reference = $1 AND identity_id = $2',
          [signHash, ownerId],
        );
    if (!sig) {
      return res.status(404).json({ success: false, error: 'Signature not found or not owned by you' });
    }
    // Already fully validated → refuse new links (prevents orphaned
    // validation_links rows and wasted DB writes).
    if (sig.status === 'COMMUNITY_VALIDATED' || sig.validation_count >= sig.max_validations) {
      return res.status(409).json({
        success: false,
        error: 'This signature has already been validated',
        code: 'MAX_VALIDATIONS_REACHED',
      });
    }

    // Revoke any existing active links for this signature.
    await db.execute(
      `UPDATE validation_links SET status = 'revoked', revoked_at = NOW()
       WHERE signature_id = $1 AND status = 'active'`,
      [sig.id],
    );

    const { rawToken, tokenHash } = generateSecureToken();
    await db.execute(
      `INSERT INTO validation_links (signature_id, token_hash, expires_at, status)
       VALUES ($1, $2, NOW() + INTERVAL '7 days', 'active')`,
      [sig.id, tokenHash],
    );

    await logAudit({
      actorId: ownerId,
      actorKind: 'user',
      action: 'validation_link.created',
      target: sig.id,
      detail: { signature_id: sig.id, validation_token: rawToken },
      ip: req.ip,
    });

    return res.json({
      success: true,
      validationToken: rawToken,
      message: 'Validation link created — share this token to request a witness.',
    });
  } catch (err: any) {
    logger.error(`[${rid}] validation create error:`, err);
    return res.status(500).json({ success: false, error: 'Failed to create validation link' });
  }
});

// ----------------------------------------------------------------------
// POST /api/validation/accept  (auth — witness accepts validation)
// Idempotent: same idempotencyKey → same result.
// ----------------------------------------------------------------------
router.post('/accept', requireAuth, writeLimiter, async (req: Request, res: Response) => {
  const rid = requestId();
  try {
    const ownerId = (req as any).user?.uid;
    if (!ownerId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const raw = req.body && typeof req.body === 'object' ? req.body : {};
    const validationToken = (raw.validationToken || '').trim();
    const idempotencyKey = (raw.idempotencyKey || '').trim();

    if (!validationToken) {
      return res.status(400).json({ success: false, error: 'validationToken is required' });
    }

    const tokenHash = hashToken(validationToken);

    const link = await db.queryOne<{
      id: string; status: string; signature_id: string; expires_at: string;
    }>(
      'SELECT id, status, signature_id, expires_at FROM validation_links WHERE token_hash = $1',
      [tokenHash],
    );

    if (!link || link.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Invalid or expired validation link' });
    }

    if (new Date() > new Date(link.expires_at)) {
      return res.status(410).json({ success: false, error: 'Validation link has expired' });
    }

    // Idempotency check.
    if (idempotencyKey) {
      const existing = await db.queryOne<{ id: string }>(
        'SELECT id FROM validation_witnesses WHERE idempotency_key = $1',
        [idempotencyKey],
      );
      if (existing) {
        return res.json({
          success: true,
          message: 'Validation accepted',
          replay: true,
          validationToken,
        });
      }
    }

    await db.executeWithRetry(async (tx) => {
      // Check validation limit (1 validation per signature)
      const sig = await tx.queryOne<{ validation_count: number; max_validations: number }>(
        'SELECT validation_count, max_validations FROM signatures WHERE id = $1',
        [link.signature_id],
      );
      if (sig && sig.validation_count >= sig.max_validations) {
        throw Object.assign(new Error('Maximum validations reached for this signature'), { code: 'MAX_VALIDATIONS_REACHED' });
      }

      // Mark link used + signature COMMUNITY_VALIDATED.
      await tx.execute(
        `UPDATE validation_links SET status = 'used', used_at = NOW()
         WHERE id = $1 AND status = 'active'`,
        [link.id],
      );

      await tx.execute(
        `UPDATE signatures SET status = 'COMMUNITY_VALIDATED'
         WHERE id = $1`,
        [link.signature_id],
      );
      // Record the witness.
      await tx.execute(
        `INSERT INTO validation_witnesses (validation_link_id, signature_id, witness_identity_id, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT DO NOTHING`,
        [link.id, link.signature_id, ownerId],
      );

      if (idempotencyKey) {
        await tx.execute(
          `INSERT INTO validation_witnesses (validation_link_id, signature_id, witness_identity_id, created_at, idempotency_key)
           VALUES ($1, $2, $3, NOW(), $4)
           ON CONFLICT DO NOTHING`,
          [link.id, link.signature_id, ownerId, idempotencyKey],
        );
      }

      // Increment validation count on signatures table
      await tx.execute(
        `UPDATE signatures
         SET validation_count = validation_count + 1
         WHERE id = $1 AND validation_count < max_validations`,
        [link.signature_id],
      );

      // Recalculate unicode_sort_key based on method + validation status
      await tx.execute(
        `UPDATE signatures
         SET unicode_sort_key =
           CASE
             WHEN sign_method = 'TELEGRAM' AND validation_count > 0 THEN 1000
             WHEN sign_method = 'GOOGLE' AND validation_count > 0 THEN 800
             WHEN sign_method = 'TELEGRAM' THEN 500
             WHEN sign_method = 'GOOGLE' THEN 300
             WHEN validation_count > 0 THEN 200
             ELSE 100
           END
         WHERE id = $1`,
        [link.signature_id],
      );

      await logAudit({
        actorId: ownerId,
        actorKind: 'user',
        action: 'validation.accepted',
        target: link.id,
        detail: { signature_id: link.signature_id, validation_token: validationToken },
        ip: req.ip,
      });
    });

    return res.json({
      success: true,
      message: 'Validation accepted',
      validationToken,
    });
  } catch (err: any) {
    logger.error(`[${rid}] validation accept error:`, err);
    return res.status(500).json({ success: false, error: 'Failed to accept validation' });
  }
});

// ----------------------------------------------------------------------
// POST /api/validation/reject  (auth — witness declines validation)
// ----------------------------------------------------------------------
router.post('/reject', requireAuth, writeLimiter, async (req: Request, res: Response) => {
  const rid = requestId();
  try {
    const ownerId = (req as any).user?.uid;
    if (!ownerId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const raw = req.body && typeof req.body === 'object' ? req.body : {};
    const validationToken = (raw.validationToken || '').trim();
    if (!validationToken) {
      return res.status(400).json({ success: false, error: 'validationToken is required' });
    }

    const tokenHash = hashToken(validationToken);

    const link = await db.queryOne<{
      id: string; status: string; signature_id: string;
    }>(
      'SELECT id, status, signature_id FROM validation_links WHERE token_hash = $1',
      [tokenHash],
    );

    if (!link || link.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Invalid or expired validation link' });
    }

    await db.executeWithRetry(async (tx) => {
      // Revoke link + set signature REVIEW_REQUIRED.
      await tx.execute(
        `UPDATE validation_links SET status = 'revoked', revoked_at = NOW()
         WHERE id = $1 AND status = 'active'`,
        [link.id],
      );
      await tx.execute(
        `UPDATE signatures SET status = 'REVIEW_REQUIRED'
         WHERE id = $1`,
        [link.signature_id],
      );

      await logAudit({
        actorId: ownerId,
        actorKind: 'user',
        action: 'validation.rejected',
        target: link.id,
        detail: { signature_id: link.signature_id, validation_token: validationToken },
        ip: req.ip,
      });
    });

    return res.json({
      success: true,
      message: 'Validation declined',
      validationToken,
    });
  } catch (err: any) {
    logger.error(`[${rid}] validation reject error:`, err);
    return res.status(500).json({ success: false, error: 'Failed to reject validation' });
  }
});

// GET /api/validation/my-validations  (auth — this identity's summary)
// ----------------------------------------------------------------------
router.get('/my-validations', requireAuth, readLimiter, async (req: Request, res: Response) => {
  const rid = requestId();
  try {
    const ownerId = (req as any).user?.uid;
    if (!ownerId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Counts by signature status for this identity's signatures.
    const counts = await db.queryOne<{
      total: string; validated: string; review_required: string; pending: string;
    }>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'COMMUNITY_VALIDATED')::int AS validated,
         COUNT(*) FILTER (WHERE status = 'REVIEW_REQUIRED')::int AS review_required,
         COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending
       FROM signatures
       WHERE identity_id = $1`,
      [ownerId],
    );

    // Active validation links for this identity's signatures.
    const activeLinks = await db.queryOne<{ activeCount: string }>(
      `SELECT COUNT(*)::int AS activeCount
       FROM validation_links vl
       JOIN signatures s ON s.id = vl.signature_id
       WHERE s.identity_id = $1 AND vl.status = 'active'`,
      [ownerId],
    );

    // Recent validation links (last 10) with signature details.
    const recentResult = await db.query<{
      linkId: string; tokenHash: string; status: string; createdAt: string;
      displayName: string; area: string; statusSig: string;
      petitionId: string; publicReference: string;
    }>(
      `SELECT
         vl.id AS linkId,
         vl.token_hash AS tokenHash,
         vl.status AS status,
         vl.created_at AS createdAt,
         s.display_name AS displayName,
         s.area AS area,
         s.status AS statusSig,
         s.petition_id AS petitionId,
         s.public_reference AS publicReference
       FROM validation_links vl
       JOIN signatures s ON s.id = vl.signature_id
       WHERE s.identity_id = $1
       ORDER BY vl.created_at DESC
       LIMIT 10`,
      [ownerId],
    );
    const recent = recentResult.rows;

    return res.json({
      success: true,
      identityId: ownerId,
      summary: {
        totalSignatures: Number(counts?.total ?? 0),
        validatedCount: Number(counts?.validated ?? 0),
        reviewRequiredCount: Number(counts?.review_required ?? 0),
        pendingCount: Number(counts?.pending ?? 0),
      },
      activeLinkCount: Number(activeLinks?.activeCount ?? 0),
      recentValidations: (recent || []).map((r) => ({
        linkId: r.linkId,
        tokenHash: r.tokenHash,
        status: r.status,
        createdAt: r.createdAt,
        displayName: r.displayName,
        area: r.area,
        signatureStatus: r.statusSig,
        petitionId: r.petitionId,
        publicReference: r.publicReference,
      })),
    });
  } catch (err: any) {
    logger.error(`[${rid}] validation my-validations error:`, err);
    return res.status(500).json({ success: false, error: 'Failed to fetch validation summary' });
  }
});

export default router;