/**
 * Voice of Gudalur — Public (Name+Mobile) petition signing repository.
 *
 * Writes to petition_mobile_signs (migration 016) where the DATABASE enforces
 *   UNIQUE (petition_id, mobile_identity_hash)
 * as the final authority on ONE-MOBILE-ONE-SIGNATURE. The SELECT-then-INSERT
 * here is only a fast path for the common "already signed" case; a concurrent
 * race falls through to INSERT and any 23505 unique-violation is resolved by
 * re-reading the winner's row — so duplicates can never be created, and every
 * retry receives a deterministic result.
 *
 * Retry semantics (CockroachDB 40001/40P01) are handled by db.withTransaction.
 * Idempotency uses the same sync_idempotency table as resident signing, so a
 * retried request with the same key returns the ORIGINAL response.
 */
import crypto from 'crypto';
import { db } from '../client';
import { parseIdemResponse } from '../idempotency';

export interface MobileSignInput {
  petitionId?: string;          // 'global' (the Right to Life petition)
  mobileIdentityHash: string;   // HMAC of the normalized mobile — NEVER the raw number
  fullName: string;
  phoneLast4?: string;          // display-only; the ONLY mobile fragment persisted
  userAgentHash?: string;
  assignBatch?: boolean;
  idempotencyKey?: string;
}

export interface MobileSignResult {
  signHash: string;
  batchNo: number;
  isDuplicate: boolean;
  verifyUrl: string;
  /** Authoritative ORIGINAL sign time (duplicates return the first attempt). */
  signedAt?: string;
}

function generateSignHash(): string {
  return 'VG-' + crypto.randomBytes(16).toString('hex');
}

export async function recordMobileSign(input: MobileSignInput): Promise<MobileSignResult> {
  const petitionId = input.petitionId || 'global';
  return db.withTransaction<MobileSignResult>(async (tx) => {
    // 1. Idempotency — a retried submission (same key) returns the ORIGINAL
    //    response instead of touching the signature table again.
    if (input.idempotencyKey) {
      const idem = await tx.queryOne<{ response: string | Record<string, unknown> | null }>(
        `SELECT response FROM sync_idempotency WHERE idempotency_key = $1`,
        [input.idempotencyKey],
      );
      const parsed = parseIdemResponse<{ signHash: string; batchNo: number }>(idem?.response);
      if (parsed?.signHash) {
        const original = await tx.queryOne<{ created_at: string }>(
          'SELECT created_at FROM petition_mobile_signs WHERE sign_hash = $1',
          [parsed.signHash],
        );
        return {
          signHash: parsed.signHash,
          batchNo: parsed.batchNo,
          isDuplicate: false,
          verifyUrl: `/verify-sign?hash=${parsed.signHash}`,
          signedAt: original?.created_at,
        };
      }
    }

    // 2. Fast duplicate path (the UNIQUE index is the true authority — see 23505 below).
    const dup = await tx.queryOne<{ sign_hash: string; created_at: string; batch_no: number }>(
      `SELECT sign_hash, created_at, batch_no FROM petition_mobile_signs
       WHERE petition_id = $1 AND mobile_identity_hash = $2 LIMIT 1`,
      [petitionId, input.mobileIdentityHash],
    );
    if (dup) {
      return {
        signHash: dup.sign_hash,
        batchNo: Number(dup.batch_no ?? 1),
        isDuplicate: true,
        verifyUrl: `/verify-sign?hash=${dup.sign_hash}`,
        signedAt: dup.created_at,
      };
    }

    // 3. Server-side verification hash + batch assignment.
    const signHash = generateSignHash();
    let batchNo: number;
    if (input.assignBatch !== false) {
      const current = await tx.queryOne<{ batch_no: number }>(
        'SELECT batch_no FROM petition_batches ORDER BY batch_no DESC LIMIT 1',
      );
      if (current) {
        batchNo = current.batch_no;
        await tx.query(
          'UPDATE petition_batches SET end_hash = $1, sign_count = sign_count + 1 WHERE batch_no = $2',
          [signHash, batchNo],
        );
      } else {
        batchNo = 1;
        await tx.query(
          'INSERT INTO petition_batches(batch_no, start_hash, end_hash, sign_count) VALUES ($1, $2, $2, 1)',
          [batchNo, signHash],
        );
      }
    } else {
      batchNo = 1;
    }

    // 4. Insert. On a concurrent duplicate the UNIQUE constraint rejects the
    //    second insert (23505); re-read the winner and return ITS result so
    //    both requests observe exactly one signature.
    const uaHash = input.userAgentHash ?? crypto.createHash('sha256').update('').digest('hex');
    try {
      const inserted = await tx.queryOne<{ created_at: string }>(
        `INSERT INTO petition_mobile_signs
           (petition_id, sign_hash, mobile_identity_hash, full_name, phone_last4, user_agent_hash, batch_no)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING created_at`,
        [petitionId, signHash, input.mobileIdentityHash, input.fullName, input.phoneLast4 ?? null, uaHash, batchNo],
      );
      // 5. Persist the idempotent response for safe retries.
      if (input.idempotencyKey) {
        const response = JSON.stringify({ signHash, batchNo });
        await tx.query(
          'INSERT INTO sync_idempotency(idempotency_key, kind, response) VALUES ($1, $2, $3) ON CONFLICT(idempotency_key) DO NOTHING',
          [input.idempotencyKey, 'mobile-signature', response],
        );
      }
      return {
        signHash,
        batchNo,
        isDuplicate: false,
        verifyUrl: `/verify-sign?hash=${signHash}`,
        signedAt: inserted?.created_at,
      };
    } catch (e: any) {
      if (e?.code === '23505') {
        const winner = await tx.queryOne<{ sign_hash: string; created_at: string; batch_no: number }>(
          `SELECT sign_hash, created_at, batch_no FROM petition_mobile_signs
           WHERE petition_id = $1 AND mobile_identity_hash = $2 LIMIT 1`,
          [petitionId, input.mobileIdentityHash],
        );
        if (winner) {
          return {
            signHash: winner.sign_hash,
            batchNo: Number(winner.batch_no ?? 1),
            isDuplicate: true,
            verifyUrl: `/verify-sign?hash=${winner.sign_hash}`,
            signedAt: winner.created_at,
          };
        }
      }
      throw e;
    }
  });
}

/** Public verification lookup for a mobile-signed receipt (masked fields only). */
export async function getMobileSignByHash(signHash: string) {
  return db.queryOne<{
    sign_hash: string;
    full_name: string;
    phone_last4: string | null;
    batch_no: number;
    created_at: string;
  }>(
    `SELECT sign_hash, full_name, phone_last4, batch_no, created_at
     FROM petition_mobile_signs WHERE sign_hash = $1 LIMIT 1`,
    [signHash],
  );
}
