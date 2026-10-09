/**
 * Open Civic Signature Protocol — civic signature repository.
 *
 * Writes into the SAME petition_mobile_signs table (migration 016) that the
 * Layer A mobile-sign flow uses, but enables the protocol fields added in
 * migration 018 (signature_hash, civic_sign_id, verification_tx_ref, provider,
 * assurance_level).
 *
 * Guarantees:
 *   1. The verification transaction is CONSUMED atomically inside the same DB
 *      transaction as the signature insert — a consumed-but-not-signed crash
 *      is impossible, and a signed-but-not-consumed is equally impossible.
 *   2. UNIQUE(petition_id, mobile_identity_hash) remains the sole uniqueness
 *      authority; a concurrent duplicate second INSERT hits 23505 and resolves
 *      to the winner's row (deterministic for both callers).
 *   3. Idempotency-key retries return the ORIGINAL response.
 */
import crypto from 'crypto';
import { db } from '../client';
import { parseIdemResponse } from '../idempotency';
import { EvidenceTxHandle, consumeVerificationTxInTx } from '../../services/identity/verificationTxConsume';

export interface CivicSignInput {
  petitionId?: string;        // 'global'
  identityKeyHash: string;    // HMAC of the canonical subject — never the raw
  fullName: string;
  phoneLast4?: string;
  verificationTxRef?: string; // required by the protocol flow
  provider: string;
  assuranceLevel: number;
  signatureHash: string;
  civicSignId: string;
  identityKeyVersion?: number;
  userAgentHash?: string;
  idempotencyKey?: string;
}

export interface CivicSignResult {
  signHash: string;
  civicSignId: string;
  signatureHash: string;
  batchNo: number;
  isDuplicate: boolean;
  signedAt?: string;
}

function newSignHash(): string {
  return 'VG-' + crypto.randomBytes(16).toString('hex');
}
export async function recordCivicSign(input: CivicSignInput): Promise<CivicSignResult> {
  const petitionId = input.petitionId || 'global';
  const signHash = newSignHash();

  return db.withTransaction<CivicSignResult>(async (tx) => {
    // 1. Idempotent retries return the ORIGINAL recorded response.
    if (input.idempotencyKey) {
      const idem = await tx.queryOne<{ response: string | Record<string, unknown> | null }>(
        `SELECT response FROM sync_idempotency WHERE idempotency_key = $1`,
        [input.idempotencyKey],
      );
      const parsed = parseIdemResponse<{ signHash?: string; civicSignId?: string; signatureHash?: string; batchNo?: number }>(idem?.response);
      if (parsed?.signHash) {
        const original = await tx.queryOne<{ created_at: string }>(
          'SELECT created_at FROM petition_mobile_signs WHERE sign_hash = $1',
          [parsed.signHash],
        );
        return {
          signHash: parsed.signHash,
          civicSignId: parsed.civicSignId ?? '',
          signatureHash: parsed.signatureHash ?? '',
          batchNo: parsed.batchNo ?? 1,
          isDuplicate: false,
          signedAt: original?.created_at,
        };
      }
    }

    // 2. Consume the verification transaction ATOMICALLY with the insert.
    if (input.verificationTxRef) {
      const token: EvidenceTxHandle = { query: tx.query, queryOne: tx.queryOne, execute: tx.execute };
      const consumed = await consumeVerificationTxInTx(token, input.verificationTxRef);
      if (!consumed.consumed) {
        throw Object.assign(new Error(`verification transaction not consumable (${consumed.reason ?? 'unknown'})`), { code: 'CONSUME_FAILED' });
      }
    }

    // 3. Fast duplicate path — the UNIQUE index is authoritative (see 23505).
    const dup = await tx.queryOne<{ sign_hash: string; civic_sign_id: string; signature_hash: string; created_at: string; batch_no: number }>(
      `SELECT sign_hash, civic_sign_id, signature_hash, created_at, batch_no
       FROM petition_mobile_signs
       WHERE petition_id = $1 AND mobile_identity_hash = $2 LIMIT 1`,
      [petitionId, input.identityKeyHash],
    );
    if (dup) {
      return {
        signHash: dup.sign_hash,
        civicSignId: dup.civic_sign_id ?? '',
        signatureHash: dup.signature_hash ?? '',
        batchNo: Number(dup.batch_no ?? 1),
        isDuplicate: true,
        signedAt: dup.created_at,
      };
    }

    // 4. Batch assignment (reuses existing petition_batches bookkeeping).
    let batchNo: number;
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

    // 5. Insert + persist the idempotent response, windowing 23505.
    const uaHash = input.userAgentHash ?? crypto.createHash('sha256').update('').digest('hex');
    try {
      const inserted = await tx.queryOne<{ created_at: string }>(
        `INSERT INTO petition_mobile_signs
                      (petition_id, sign_hash, mobile_identity_hash, full_name, phone_last4,
            user_agent_hash, batch_no, signature_hash, civic_sign_id,
            verification_tx_ref, provider, assurance_level, identity_key_version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING created_at`,
        [
          petitionId, signHash, input.identityKeyHash, input.fullName,
          input.phoneLast4 ?? null, uaHash, batchNo,
          input.signatureHash, input.civicSignId,
                     input.verificationTxRef ?? null, input.provider, input.assuranceLevel,
           input.identityKeyVersion ?? 1,
        ],
      );
      if (input.idempotencyKey) {
        const response = JSON.stringify({ signHash, civicSignId: input.civicSignId, signatureHash: input.signatureHash, batchNo });
        await tx.query(
          'INSERT INTO sync_idempotency(idempotency_key, kind, response) VALUES ($1,$2,$3) ON CONFLICT(idempotency_key) DO NOTHING',
          [input.idempotencyKey, 'civic-signature', response],
        );
      }
      return {
        signHash,
        civicSignId: input.civicSignId,
        signatureHash: input.signatureHash,
        batchNo,
        isDuplicate: false,
        signedAt: inserted?.created_at,
      };
    } catch (e: any) {
      if (e?.code === '23505') {
        const winner = await tx.queryOne<{ sign_hash: string; civic_sign_id: string; signature_hash: string; created_at: string; batch_no: number }>(
          `SELECT sign_hash, civic_sign_id, signature_hash, created_at, batch_no
           FROM petition_mobile_signs
           WHERE petition_id = $1 AND mobile_identity_hash = $2 LIMIT 1`,
          [petitionId, input.identityKeyHash],
        );
        if (winner) {
          return {
            signHash: winner.sign_hash,
            civicSignId: winner.civic_sign_id ?? '',
            signatureHash: winner.signature_hash ?? '',
            batchNo: Number(winner.batch_no ?? 1),
            isDuplicate: true,
            signedAt: winner.created_at,
          };
        }
      }
      throw e;
    }
  });
}
/** Public masked lookup by civic_sign_id (receipt / anonymity). */
export async function getCivicSignByCivicId(civicSignId: string) {
  return db.queryOne<{
    civic_sign_id: string;
    sign_hash: string;
    phone_last4: string | null;
    created_at: string;
  }>(
    `SELECT civic_sign_id, sign_hash, phone_last4, created_at
     FROM petition_mobile_signs WHERE civic_sign_id = $1 LIMIT 1`,
    [civicSignId],
  );
}

/**
 * Public anonymized ledger — never exposes mobile, email, IP, identity hash,
 * or provider subject. Only the public id and time.
 */
export async function listPublicCivicSigns(limit = 50) {
  const rows = await db.query<{ civic_sign_id: string; created_at: string }>(
    `SELECT civic_sign_id, created_at
     FROM petition_mobile_signs
     WHERE civic_sign_id IS NOT NULL
     ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return rows.rows.map((r) => ({ civicSignId: r.civic_sign_id, signedAt: r.created_at }));
}