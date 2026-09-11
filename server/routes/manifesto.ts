/**
 * Voice of Gudalur — Manifesto routes (Phase 8).
 *
 * POST /api/manifesto/signature     — resident endorses (auth required)
 * GET  /api/manifesto/stats         — live counter (no drift)
 * POST /api/manifesto/submission    — email-docket submission (auth required)
 * GET  /api/manifesto/submission/:ref — docket verification (public)
 */
import { Router, Request, Response } from 'express';
import { db } from '../db/client';
import { recordManifestoSignature, getManifestoStats, recordManifestoSubmission, getSubmissionByRef, getMyManifestoStatus } from '../db/repositories/manifestoRepository';
import { requireAuth, requireRole, logAudit } from '../middleware/auth';
import { logger } from '../utils/logger';
import { cacheWrap, cacheDel } from '../utils/ttlCache';

const router = Router();

// Public aggregate reads are polled by many clients at once. Collapse them
// onto a single in-process producer per TTL window (mirrors petitions/media),
// so a crowd hits the DB once per window instead of once per request.
const STATS_TTL_MS = 6 * 1000;
const DOCKET_TTL_MS = 10 * 1000;
const STATS_KEY = 'manifesto:stats';
const DOCKET_KEY = 'manifesto:docket:';

/** POST /api/manifesto/signature — resident endorses the manifesto. */
router.post('/signature', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const result = await recordManifestoSignature({
      name: user.name,
      locality: user.localityName,
      contact: user.phone?.slice(-4),
      gudalurId: user.gudalurId,
      idempotencyKey: req.body?.idempotencyKey,
    });
    await logAudit({
      actorId: user.uid, actorKind: 'user',
      action: result.isDuplicate ? 'ENDORSE_MANIFESTO_DUP' : 'ENDORSE_MANIFESTO',
      target: 'manifesto_signatures',
      detail: { gudalurId: user.gudalurId, isDuplicate: result.isDuplicate },
      ip: req.ip, userAgent: req.get('user-agent'),
    });
    res.status(result.isDuplicate ? 200 : 201).json({
      signatureId: result.signatureId,
      isDuplicate: result.isDuplicate,
      count: result.count,
      message: result.isDuplicate ? 'You have already endorsed the manifesto.' : 'Endorsement recorded.',
    });
    cacheDel(STATS_KEY); // fresh endorsement → next stats read recomputes within one TTL
  } catch (e: any) {
    logger.error('manifesto signature:', e.message);
    res.status(500).json({ error: 'Could not record endorsement' });
  }
});

/** GET /api/manifesto/stats — live counter (TTL-cached; recomputes on endorsement). */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await cacheWrap(STATS_KEY, STATS_TTL_MS, () => getManifestoStats());
    res.json({ signatures: stats.signatureCount, submissions: stats.submissionCount, lastUpdated: stats.lastUpdated });
  } catch (e: any) {
    logger.error('manifesto stats:', e.message);
    res.status(500).json({ error: 'Failed to load manifesto stats' });
  }
});

/** GET /api/manifesto/my-status — this resident's signed flag + latest docket. */
router.get('/my-status', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  if (!user.gudalurId) return res.json({ hasSigned: false, submission: null });
  const status = await getMyManifestoStatus(user.gudalurId);
  res.json(status);
});

/** POST /api/manifesto/submission — email-docket submission. */
router.post('/submission', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const result = await recordManifestoSubmission({
      senderName: user.name,
      senderPhone: user.phone,
      gudalurId: user.gudalurId,
      locality: user.localityName,
      subject: req.body?.subject ?? '',
      lang: req.body?.lang ?? 'en',
      sourceUrl: req.body?.sourceUrl,
      toEmails: req.body?.toEmails,
      ccEmails: req.body?.ccEmails,
      idempotencyKey: req.body?.idempotencyKey,
    });
    await logAudit({
      actorId: user.uid, actorKind: 'user',
      action: result.isDuplicate ? 'SUBMIT_DOCKET_DUP' : 'SUBMIT_DOCKET',
      target: 'manifesto_submissions',
      detail: { docketRef: result.docketRef, isDuplicate: result.isDuplicate },
      ip: req.ip,
    });
    res.status(result.isDuplicate ? 200 : 201).json({ docketRef: result.docketRef, isDuplicate: result.isDuplicate });
    cacheDel(`${DOCKET_KEY}${req.body?.ref ?? ''}`);
  } catch (e: any) {
    logger.error('manifesto submission:', e.message);
    res.status(500).json({ error: 'Could not record submission' });
  }
});

/** GET /api/manifesto/submission/:ref — docket verification (public, masked fields, TTL-cached). */
router.get('/submission/:ref', async (req: Request, res: Response) => {
  const row = await cacheWrap(`${DOCKET_KEY}${req.params.ref}`, DOCKET_TTL_MS, () => getSubmissionByRef(req.params.ref));
  if (!row) return res.status(404).json({ error: 'Docket not found' });
  // snake_case matches the public proof contract consumed by /verify-docket.
  res.json({
    docket_ref: row.docket_ref,
    sender_name: row.sender_name,
    gudalur_id: row.gudalur_id,
    locality: row.locality,
    subject: row.subject,
    lang: row.lang,
    created_at: row.created_at,
    source_url: row.source_url,
  });
});

/** GET /api/manifesto/official/signatures — officials can list endorsers. */
router.get('/official/signatures', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), async (_req, res) => {
  const rows = await db.query(
    `SELECT id, name, locality, contact, gudalur_id, created_at FROM manifesto_signatures ORDER BY created_at DESC LIMIT 500`,
  );
  res.json({ signatures: rows.rows });
});

export default router;
