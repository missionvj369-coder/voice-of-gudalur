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
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { recordPetitionSign, verifyPetitionSign, listPetitionSigns, getMyPetitionSign } from '../db/repositories/petitionRepository';
import { requireAuth, requireRole, logAudit } from '../middleware/auth';
import { db } from '../db/client';
import { logger } from '../utils/logger';
import { clusterPlaces } from '../utils/placeCluster';
import { cacheWrap, cacheDel } from '../utils/ttlCache';
import { validateBody, type ValidationSchema } from '../middleware/validate';

const router = Router();

// Per-IP write limiter for the sign endpoint — stricter than the public limiter
// so a coordinated burst from one IP can't queue up many DB writes.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many sign attempts — please wait a moment.' },
  keyGenerator: (req: any) => {
    const ip: string = req.ip || req.socket?.remoteAddress || 'anonymous';
    if (!ip || ip === 'anonymous') return 'anonymous';
    try { return ipKeyGenerator(ip as any); } catch { return 'anonymous'; }
  },
  validate: { xForwardedForHeader: false, ip: false } as any,
});

// External supporters have NO account — the only throttle is per-IP. Strict cap
// so one IP can't flood the external_supports table with junk rows.
const externalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many support attempts — please try again later.' },
  keyGenerator: (req: any) => {
    const ip: string = req.ip || req.socket?.remoteAddress || 'anonymous';
    if (!ip || ip === 'anonymous') return 'anonymous';
    try { return ipKeyGenerator(ip as any); } catch { return 'anonymous'; }
  },
  validate: { xForwardedForHeader: false, ip: false } as any,
});

// Public aggregate endpoints are polled by every open client. Cache them so a
// crowd collapses to a handful of DB hits instead of one per user per poll.
const STATS_TTL_MS = 6 * 1000;
const LEDGER_TTL_MS = 6 * 1000;
const STATS_KEY = 'petition:sign-stats';
const LEDGER_KEY = 'petition:ledger';

/** POST /api/petitions/sign — resident signs the petition.
 * writeRateLimiter (60/15min per IP) is mounted here so a single IP can't hammer
 * the DB with repeated sign attempts; the broader publicRateLimiter on the whole
 * /api/petitions prefix (in server.ts) still applies as a second layer. */
router.post('/sign', writeLimiter, requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    // Aadhaar minimization: fetch the resident's stored verification metadata
    // server-side. Never trust client-supplied Aadhaar data; never store raw phone.
    // Also fetch the pincode — it drives the Gudalur/Outside split (reliable
    // signal, unlike free-text village matching).
    const resident = await db.queryOne<{ aadhaar_last4: string | null; aadhaar_ref: string | null; pincode: string | null }>(
      'SELECT aadhaar_last4, aadhaar_ref, pincode FROM users WHERE uid = $1',
      [user.uid],
    );
    const input = {
      userUid: user.uid,
      gdrId: user.gudalurId ?? '',
      fullName: user.name,
      // The NATIONAL address the supporter typed at registration/edit time is
      // the source of truth for the place column — never the legacy locality
      // name. Anyone from anywhere in India can sign and the district/state is
      // read from their own details.
      village:
        typeof req.body?.address === 'string' && req.body.address.trim()
          ? req.body.address.trim()
          : (user.localityName ?? ''),
      pincode: resident?.pincode ?? undefined,
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
    // A fresh signature changes the public totals — drop the cache so the next
    // poll recomputes within one TTL window instead of serving a stale count.
    cacheDel(STATS_KEY);
    cacheDel(LEDGER_KEY);
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
      // Always the ORIGINAL signature time — on a duplicate this is the user's
      // very first sign, never the current Date.now().
      signedAt: result.signedAt ?? new Date().toISOString(),
      message: result.isDuplicate ? 'You have already signed this petition.' : 'Signature recorded.',
    });
  } catch (e: any) {
    logger.error('petition sign:', e.message);
    res.status(500).json({ error: `Could not record signature — ${e.message}` });
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
      gdr_id: row.gdr_id,
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
    const data = await cacheWrap(STATS_KEY, STATS_TTL_MS, async () => {
      const totalRow = await db.queryOne<{ count: number }>('SELECT COUNT(*)::int AS count FROM petition_signs');
      const totalNum = Number(totalRow?.count ?? 0);
      const places = await db.query<{ place: string; count: number }>(
        `SELECT village AS place, COUNT(*)::int AS count
         FROM petition_signs WHERE village IS NOT NULL AND village <> ''
         GROUP BY village`,
      );
      const clustered = clusterPlaces(places.rows.map((r) => ({ place: String(r.place), count: Number(r.count) })));
      return { total: totalNum, places: clustered.slice(0, 15) };
    });
    res.json(data);
  } catch (e: any) {
    logger.error('sign-stats:', e.message);
    res.json({ total: 0, places: [] });
  }
});

/** GET /api/petitions/ledger — PUBLIC live hash ledger (any user or non-user).
 *  Every signature with its hash; phone is NEVER sent raw — only last-4,
 *  rendered blurred on the client. Same privacy posture as /verify/:hash. */
router.get('/ledger', async (_req: Request, res: Response) => {
  try {
    const data = await cacheWrap(LEDGER_KEY, LEDGER_TTL_MS, async () => {
      const total = await db.queryOne<{ count: number }>('SELECT COUNT(*)::int AS count FROM petition_signs');
      const rows = await db.query<{
        sign_hash: string; full_name: string; village: string; phone_last4: string | null;
        batch_no: number; created_at: string;
      }>(
        `SELECT sign_hash, full_name, village, phone_last4, batch_no, created_at
         FROM petition_signs ORDER BY created_at DESC LIMIT 500`,
      );
      return {
        total: Number(total?.count ?? 0),
        signs: rows.rows.map((r) => ({
          hash: r.sign_hash,
          name: r.full_name,
          village: r.village,
          phoneLast4: r.phone_last4,
          batchNo: r.batch_no,
          signedAt: r.created_at,
          verifyUrl: `/verify-sign?id=${encodeURIComponent(r.sign_hash)}`,
        })),
      };
    });
    res.json(data);
  } catch (e: any) {
    logger.error('ledger:', e.message);
    res.json({ total: 0, signs: [] });
  }
});

/** GET /api/petitions/my-sign — this resident's OWN petition signature (auth).
 *  Lets the app restore the accurate "already signed" UI after a re-login, a
 *  new device, or a cleared localStorage — sourced from the authoritative
 *  petition_signs ledger, never from client state. */
router.get('/my-sign', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const sign = await getMyPetitionSign(user.uid);
    res.json({ sign });
  } catch (e: any) {
    logger.error('my-sign:', e.message);
    res.status(500).json({ error: 'Could not load your signature' });
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

/** POST /api/petitions/:id/external-support — non-resident supports the movement (no auth, no Aadhaar). */
const externalSupportSchema: ValidationSchema = {
  name:    { type: 'string', required: true, min: 1, max: 100 },
  email:   { type: 'string', max: 254 },
  place:   { type: 'string', max: 100 },
  pincode: { type: 'string', min: 6, max: 6 },
  message: { type: 'string', max: 500 },
};

interface ExternalSupportBody {
  name?: string;
  email?: string;
  place?: string;
  pincode?: string;
  message?: string;
}

router.post('/:id/external-support', externalLimiter, validateBody(externalSupportSchema), async (req: Request, res: Response) => {
  try {
    const body: ExternalSupportBody = req.body;
    const pId = req.params.id;
    const result = await db.withTransaction(async (tx) => {
      const existing = await tx.queryOne<{ id: string }>(
        'SELECT id FROM external_supports WHERE petition_id = $1 AND email = $2',
        [pId, body.email || null],
      );
      if (!existing) {
        await tx.query(
          `INSERT INTO external_supports (petition_id, name, email, place, pincode, message)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [pId, body.name, body.email || null, body.place || null, body.pincode || null, body.message || null],
        );
        await tx.query('UPDATE petitions SET external_support_count = external_support_count + 1 WHERE id = $1', [pId]);
      }
      const row = await tx.queryOne<{ external_support_count: number }>('SELECT external_support_count FROM petitions WHERE id = $1', [pId]);
      return { count: row?.external_support_count ?? 0 };
    });
    logger.info('[external-support] recorded', { petitionId: pId, name: body.name, email: body.email });
    res.status(201).json({ ok: true, count: result.count });
  } catch (e: any) {
    if (e.code === '23505') {
      const row = await db.queryOne<{ external_support_count: number }>('SELECT external_support_count FROM petitions WHERE id = $1', [req.params.id]);
      return res.status(200).json({ ok: true, count: row?.external_support_count ?? 0, duplicate: true });
    }
    logger.error('[external-support] error:', e.message);
    res.status(500).json({ error: 'Could not record external support' });
  }
});

/** GET /api/officials/signs — officials-only. */
router.get('/signs/all', requireAuth, requireRole('OFFICIAL', 'APPROVED_OFFICIAL', 'ADMIN', 'PLATFORM_ADMIN'), async (_req: Request, res: Response) => {
  const rows = await listPetitionSigns(undefined, 200, 0);
  res.json({ signs: rows.rows });
});

export default router;
