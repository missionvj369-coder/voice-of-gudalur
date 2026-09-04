/**
 * Voice of Gudalur — Petition routes (Phase 5).
 *
 * POST /api/petitions/sign   — resident signs a petition (req.auth required)
 * GET  /api/petitions/verify/:hash — public verification (no auth needed)
 * GET  /api/petitions/list       — list community petitions
 * GET  /api/petitions/:id       — petition detail
 * GET  /api/officials/signs     — officials only (requireRole approved-official)
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { recordPetitionSign, verifyPetitionSign, listPetitionSigns } from '../db/repositories/petitionRepository';
import { requireAuth, requireRole, logAudit } from '../middleware/auth';
import { db } from '../db/client';
import { logger } from '../utils/logger';

const router = Router();

/** POST /api/petitions/sign — resident signs the petition. */
router.post('/sign', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    // Aadhaar minimization: fetch the resident's stored verification metadata
    // server-side. Never trust client-supplied Aadhaar data; never store raw phone.
    const resident = await db.queryOne<{ aadhaar_last4: string | null; aadhaar_ref: string | null }>(
      'SELECT aadhaar_last4, aadhaar_ref FROM users WHERE uid = $1',
      [user.uid],
    );
    const input = {
      userUid: user.uid,
      gdrId: user.gudalurId ?? '',
      fullName: user.name,
      village: user.localityName,
      phone: user.phone ?? '',
      aadhaarLast4: resident?.aadhaar_last4 ?? undefined,
      aadhaarRef: resident?.aadhaar_ref ?? undefined,
      lat: req.body?.lat,
      lng: req.body?.lng,
      userAgentHash: req.headers['user-agent']
        ? crypto.createHash('sha256').update(req.headers['user-agent'] as string).digest('hex')
        : undefined,
      assignBatch: true,
      idempotencyKey: req.body?.idempotencyKey,
    };
    const result = await recordPetitionSign(input);
    await logAudit({
      actorId: user.uid, actorKind: 'user',
      action: result.isDuplicate ? 'SIGN_PETITION_DUP' : 'SIGN_PETITION',
      target: 'petition_signs',
      detail: { gdr_id: user.gudalurId, isDuplicate: result.isDuplicate },
      ip: req.ip, userAgent: req.get('user-agent'),
    });
    res.status(result.isDuplicate ? 200 : 201).json({
      signHash: result.signHash,
      batchNo: result.batchNo,
      verifyUrl: result.verifyUrl,
      isDuplicate: result.isDuplicate,
      message: result.isDuplicate ? 'You have already signed this petition.' : 'Signature recorded.',
    });
  } catch (e: any) {
    logger.error('petition sign:', e.message);
    res.status(500).json({ error: 'Could not record signature' });
  }
});

/** GET /api/petitions/verify/:hash — public verification (independent of signing). */
router.get('/verify/:hash', async (req: Request, res: Response) => {
  try {
    const row = await verifyPetitionSign(req.params.hash);
    if (!row) return res.status(404).json({ valid: false });
    // Only masked proof fields are exposed publicly (no raw PII).
    res.json({
      valid: true,
      sign_hash: row.sign_hash,
      full_name: row.full_name,
      village: row.village,
      phone_last4: row.phone_last4,
      aadhaar_last4: row.aadhaar_last4,
      batch_no: row.batch_no,
      created_at: row.signed_at,
      verified: row.verified,
    });
  } catch (e: any) {
    logger.error('verify:', e.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/** GET /api/petitions/list — public list (seeds canonical demands on first read). */
router.get('/list', async (_req: Request, res: Response) => {
  const rows = await db.query(
    `SELECT id, title, title_ta, problem, problem_ta, demand, demand_ta,
            target_authority, target_authority_ta, evidence_summary, evidence_summary_ta,
            support_count, supporters_json, target_signatures, deadline, status,
            created_by, created_by_name, created_at
     FROM petitions WHERE status IN ('OPEN', 'ACTIVE', 'IN_GOVT_REVIEW')
     ORDER BY created_at DESC LIMIT 50`,
  );
  if (rows.rows.length === 0) {
    // Server-owned seed: populate the canonical citizen demands on first read.
    const { SEED_PETITIONS } = await import('../db/seedPetitions');
    for (const pet of SEED_PETITIONS) {
      await db.execute(
        `INSERT INTO petitions (id, title, title_ta, problem, problem_ta, demand, demand_ta,
           target_authority, target_authority_ta, evidence_summary, evidence_summary_ta,
           support_count, supporters_json, status, created_by, created_by_name, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now())
         ON CONFLICT (id) DO NOTHING`,
        [pet.id, pet.title, pet.title_ta, pet.problem, pet.problem_ta, pet.demand, pet.demand_ta,
         pet.target_authority, pet.target_authority_ta, pet.evidence_summary,
         pet.evidence_summary_ta ?? null, pet.support_count,
         JSON.stringify(pet.supporters_json), pet.status, pet.created_by,
         pet.created_by_name, pet.created_at],
      );
    }
    const seeded = await db.query(
      `SELECT id, title, title_ta, problem, problem_ta, demand, demand_ta,
              target_authority, target_authority_ta, evidence_summary, evidence_summary_ta,
              support_count, supporters_json, target_signatures, deadline, status,
              created_by, created_by_name, created_at
       FROM petitions WHERE status IN ('OPEN', 'ACTIVE', 'IN_GOVT_REVIEW')
       ORDER BY created_at DESC LIMIT 50`,
    );
    return res.json({ petitions: seeded.rows });
  }
  res.json({ petitions: rows.rows });
});

/** GET /api/petitions/sign-stats — public live totals + per-place leaderboard (highest first). */
router.get('/sign-stats', async (_req: Request, res: Response) => {
  try {
    const total = await db.queryOne<{ count: number }>('SELECT COUNT(*)::int AS count FROM petition_signs');
    const places = await db.query<{ place: string; count: number }>(
      `SELECT COALESCE(NULLIF(village, ''), 'Gudalur') AS place, COUNT(*)::int AS count
       FROM petition_signs
       GROUP BY 1
       ORDER BY count DESC, place ASC
       LIMIT 60`,
    );
    // CockroachDB returns COUNT(*) (INT8) as strings through pg — coerce to numbers.
    res.json({
      total: Number(total?.count ?? 0),
      places: places.rows.map((r) => ({ place: String(r.place), count: Number(r.count) })),
    });
  } catch (e: any) {
    logger.error('sign-stats:', e.message);
    res.json({ total: 0, places: [] });
  }
});

/** GET /api/petitions/:id — petition detail. */
router.get('/:id', async (req: Request, res: Response) => {
  const row = await db.queryOne<{
    id: string; title: string; title_ta: string; problem: string; problem_ta: string;
    demand: string; demand_ta: string; target_authority: string; evidence_summary: string;
    evidence_summary_ta: string; support_count: number; target_signatures: number;
    deadline: string | null; status: string; created_at: string;
  }>('SELECT * FROM petitions WHERE id = $1', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Petition not found' });
  res.json({ petition: row });
});

/** GET /api/petitions/:id/support — endorse a petition (idempotent-ish; uses supporter list). */
router.post('/:id/support', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const supporter = {
    uid: user.uid, gudalurId: user.gudalurId, name: user.name,
    locality: user.localityName, phoneLast4: user.phone ? user.phone.slice(-4) : null,
    ts: Date.now(),
  };
  const result = await db.withTransaction<{ supportCount: number; isDuplicate: boolean }>(async (tx) => {
    // Prevent duplicate support per resident (exact uid match inside the JSON array).
    const existing = await tx.queryOne<{ id: string }>(
      `SELECT id FROM petitions WHERE id = $1
       AND EXISTS (SELECT 1 FROM jsonb_array_elements(supporters_json::JSONB) elem
                   WHERE elem->>'uid' = $2)`,
      [req.params.id, user.uid],
    );
    if (existing) {
      const row = await tx.queryOne<{ support_count: number }>('SELECT support_count FROM petitions WHERE id = $1', [req.params.id]);
      return { supportCount: row?.support_count ?? 0, isDuplicate: true };
    }
    await tx.query(
      `UPDATE petitions
       SET support_count = support_count + 1,
           supporters_json = (supporters_json::JSONB || $2::JSONB)::STRING,
           updated_at = now()
       WHERE id = $1`,
      [req.params.id, JSON.stringify([supporter])],
    );
    const row = await tx.queryOne<{ support_count: number }>('SELECT support_count FROM petitions WHERE id = $1', [req.params.id]);
    return { supportCount: row?.support_count ?? 0, isDuplicate: false };
  });
  await logAudit({
    actorId: user.uid, actorKind: 'user',
    action: result.isDuplicate ? 'SUPPORT_PETITION_DUP' : 'SUPPORT_PETITION', target: `petitions/${req.params.id}`,
    detail: { gudalurId: user.gudalurId, isDuplicate: result.isDuplicate }, ip: req.ip,
  });
  res.status(result.isDuplicate ? 200 : 201).json({ supportCount: result.supportCount, isDuplicate: result.isDuplicate });
});

/** GET /api/officials/signs — officials-only. */
router.get('/signs/all', requireAuth, requireRole('OFFICIAL', 'APPROVED_OFFICIAL', 'ADMIN', 'PLATFORM_ADMIN'), async (_req: Request, res: Response) => {
  const rows = await listPetitionSigns(undefined, 200, 0);
  res.json({ signs: rows.rows });
});

export default router;
