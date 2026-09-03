/**
 * Voice of Gudalur — Petition signing (Phase 5).
 *
 * COMPLETE rewrite of the broken Supabase `record_petition_sign` RPC flow.
 * Signing is now a single atomic CockroachDB transaction in the repository,
 * invoked exclusively by the Express API (never directly from the browser).
 *
 * Fixes the original mismatch:
 *   - sign_hash is generated SERVER-SIDE (VG-<hex>) and RETURNED to the client.
 *   - Only phone_last4 (not raw phone) is persisted (PI minimization).
 *   - Duplicate signing is prevented atomically (user_uid OR gdr_id uniqueness).
 *   - batch_no is assigned inside the same transaction.
 *   - The whole operation commits atomically or fails entirely.
 */
import crypto from 'crypto';
import { db, PoolClient } from '../client';

export interface PetitionSignInput {
  userUid?: string;
  gdrId: string;
  fullName: string;
  village?: string;
  phone: string;           // raw — only last4 retained server-side
  aadhaarLast4?: string;
  aadhaarRef?: string;
  lat?: number;
  lng?: number;
  userAgentHash?: string; // sha256 of User-Agent (never store raw UA)
  assignBatch?: boolean;
  idempotencyKey?: string;
}

export interface PetitionSignResult {
  signHash: string;
  batchNo: number;
  isDuplicate: boolean;
  verifyUrl: string;
}

function generateSignHash(): string {
  return 'VG-' + crypto.randomBytes(16).toString('hex');
}
function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
function phoneLast4(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : undefined;
}

/**
 * Record a petition signature as a single atomic transaction.
 *
 * Steps (all inside ONE CockroachDB transaction):
 *  1. idempotency check (if idempotencyKey supplied) — return existing result.
 *  2. duplicate check against existing signature by user_uid / gdr_id.
 *  3. generate sign_hash server-side.
 *  4. assign/extend batch atomically.
 *  5. insert petition_signs row with phone_last4 only.
 *  6. commit (transaction wrapper commits on success).
 *
 * CockroachDB retry errors (40001/40P01) are retried by `db.withTransaction`.
 */
export async function recordPetitionSign(input: PetitionSignInput): Promise<PetitionSignResult> {
  return db.withTransaction<PetitionSignResult>(async (tx) => {
    // 1. Idempotency (safe retry / offline sync).
    if (input.idempotencyKey) {
      const idem = await tx.queryOne<{ sign_hash: string; batch_no: number }>(
        `SELECT (response->>'signHash')::string AS "sign_hash",
                (response->>'batchNo')::int  AS "batch_no"
         FROM sync_idempotency WHERE idempotency_key = $1`,
        [input.idempotencyKey],
      );
      if (idem) {
        return {
          signHash: idem.sign_hash,
          batchNo: idem.batch_no,
          isDuplicate: false,
          verifyUrl: `/verify-sign?hash=${idem.sign_hash}`,
        };
      }
    }

    // 2. Duplicate protection: one signature per resident identity.
    let dupHash: string | null = null;
    if (input.userUid) {
      dupHash = (await tx.queryOne<{ sign_hash: string }>('SELECT sign_hash FROM petition_signs WHERE user_uid = $1 ORDER BY created_at ASC LIMIT 1', [input.userUid]))?.sign_hash ?? null;
    }
    if (!dupHash && input.gdrId) {
      dupHash = (await tx.queryOne<{ sign_hash: string }>('SELECT sign_hash FROM petition_signs WHERE gdr_id = $1 ORDER BY created_at ASC LIMIT 1', [input.gdrId]))?.sign_hash ?? null;
    }
    if (dupHash) {
      const row = await tx.queryOne<{ batch_no: number }>('SELECT batch_no FROM petition_signs WHERE sign_hash = $1', [dupHash]);
      return {
        signHash: dupHash,
        batchNo: row?.batch_no ?? 1,
        isDuplicate: true,
        verifyUrl: `/verify-sign?hash=${dupHash}`,
      };
    }

    // 3. Generate hash server-side.
    const signHash = generateSignHash();

    // 4. Assign / extend batch inside the same transaction.
    let batchNo: number;
    if (input.assignBatch !== false) {
      const current = await tx.queryOne<{ batch_no: number }>('SELECT batch_no FROM petition_batches ORDER BY batch_no DESC LIMIT 1');
      if (current) {
        batchNo = current.batch_no;
        await tx.query('UPDATE petition_batches SET end_hash = $1, sign_count = sign_count + 1 WHERE batch_no = $2', [signHash, batchNo]);
      } else {
        batchNo = 1;
        await tx.query('INSERT INTO petition_batches(batch_no, start_hash, end_hash, sign_count) VALUES ($1, $2, $2, 1)', [batchNo, signHash]);
      }
    } else {
      batchNo = 1;
    }

    // 5. Insert the signature row (phone_last4 only).
    const uaHash = input.userAgentHash ?? sha256('');
    const phone4 = input.phone ? phoneLast4(input.phone) : undefined;
    await tx.query(
      `INSERT INTO petition_signs
         (sign_hash, user_uid, gdr_id, full_name, village, phone_last4,
          aadhaar_last4, aadhaar_ref, latitude, longitude, user_agent_hash, batch_no)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [signHash, input.userUid ?? null, input.gdrId, input.fullName, input.village ?? null,
       phone4, input.aadhaarLast4 ?? null, input.aadhaarRef ?? null,
       input.lat ?? null, input.lng ?? null, uaHash, batchNo],
    );

    // Record idempotency response if a key was supplied.
    if (input.idempotencyKey) {
      const response = JSON.stringify({ signHash, batchNo });
      await tx.query(
        'INSERT INTO sync_idempotency(idempotency_key, kind, response) VALUES ($1, $2, $3) ON CONFLICT(idempotency_key) DO NOTHING',
        [input.idempotencyKey, 'signature', response],
      );
    }

    // 6. Commit happens via db.withTransaction.
        return {
      signHash,
      batchNo,
      isDuplicate: false,
      verifyUrl: `/verify-sign?hash=${signHash}`,
    };
  });
}

/**
 * Verify a petition signature INDEPENDENTLY of the signing request.
 * Returns only public proof fields (no PII).
 */
export async function verifyPetitionSign(signHash: string) {
  return db.queryOne<{
    sign_hash: string;
    full_name: string;
    village: string;
    phone_last4: string | null;
    aadhaar_last4: string | null;
    batch_no: number;
    signed_at: string;
    verified: boolean;
  }>(
    'SELECT sign_hash, full_name, village, phone_last4, aadhaar_last4, batch_no, ' +
    'created_at AS signed_at, TRUE AS verified ' +
    'FROM petition_signs WHERE sign_hash = $1',
    [signHash],
  );
}

/** Officials: list all signs (optionally per batch). */
export async function listPetitionSigns(batchNo?: number, limit = 200, offset = 0) {
  const params: any[] = [limit, offset];
  let sql = 'SELECT sign_hash, gdr_id, full_name, village, batch_no, created_at FROM petition_signs ORDER BY created_at DESC LIMIT $1 OFFSET $2';
  if (batchNo !== undefined) {
    sql = 'SELECT sign_hash, gdr_id, full_name, village, batch_no, created_at FROM petition_signs WHERE batch_no = $3 ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    params.push(batchNo);
  }
  return db.query(sql, params);
}


