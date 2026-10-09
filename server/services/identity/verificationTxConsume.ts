/**
 * Open Civic Signature Protocol — transaction-scoped verification consume.
 *
 * Runs INSIDE a caller-owned DB transaction (TxClient) so consume + signature
 * insert are atomic. Returns true only when this caller won the consume
 * (VERIFIED → CONSUMED); a concurrent/second call returns false deterministically.
 */
import { VerificationState } from './types';

export interface EvidenceTxHandle {
  query: <T = any>(text: string, params?: any[]) => Promise<{ rows: T[]; rowCount: number }>;
  queryOne: <T = any>(text: string, params?: any[]) => Promise<T | null>;
  execute: (text: string, params?: any[]) => Promise<void>;
}

/** Consume a VERIFIED verification transaction inside the current tx. */
export async function consumeVerificationTxInTx(
  tx: EvidenceTxHandle,
  transactionRef: string,
): Promise<{ consumed: boolean; reason?: 'not_found' | 'not_verified' | 'expired' | 'already_consumed' }> {
  const row = await tx.queryOne<{
    state: string;
    expires_at: string;
    consumed_at: string | null;
  }>(
    `SELECT state, expires_at, consumed_at
     FROM identity_verification_transactions
     WHERE transaction_ref = $1 LIMIT 1`,
    [transactionRef],
  );

  if (!row) return { consumed: false, reason: 'not_found' };
  if (row.state === VerificationState.CONSUMED) return { consumed: false, reason: 'already_consumed' };
  if (row.state !== VerificationState.VERIFIED) return { consumed: false, reason: 'not_verified' };
  if (new Date(row.expires_at).getTime() < Date.now()) return { consumed: false, reason: 'expired' };

  // Atomic claim.
  const updated = await tx.queryOne<{ id: string }>(
    `UPDATE identity_verification_transactions
     SET state = 'CONSUMED', consumed_at = now(), updated_at = now()
     WHERE transaction_ref = $1 AND state = 'VERIFIED' AND consumed_at IS NULL
     RETURNING id`,
    [transactionRef],
  );

  return updated ? { consumed: true } : { consumed: false, reason: 'already_consumed' };
}