/**
 * Open Civic Signature Protocol — verification transaction repository.
 *
 * Owns ALL writes/reads for identity_verification_transactions (migration 017).
 * The service layer (verificationTransactions.ts) enforces the state machine;
 * this module only maps rows ↔ typed objects and guarantees terminal-state
 * transitions are atomic.
 */
import { db, TxClient } from '../../db/client';
import {
  AssuranceLevel,
  IdentityProviderName,
  VerificationState,
} from '../../services/identity/types';

export interface VerificationTransactionRow {
  id: string;
  transactionRef: string;
  provider: IdentityProviderName;
  state: VerificationState;
  assuranceLevel: number;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
  verifiedAt: string | null;
  requestId: string | null;
  providerRef: string | null;
  identityKeyHash: string | null;
  identityKeyVersion: number;
  resultReference: string | null;
  errorCode: string | null;
  clientIpHash: string | null;
  userAgentHash: string | null;
}

function mapRow<T extends Record<string, any>>(r: T): VerificationTransactionRow {
  return {
    id: String(r.id),
    transactionRef: String(r.transaction_ref),
    provider: r.provider as IdentityProviderName,
    state: r.state as VerificationState,
    assuranceLevel: Number(r.assurance_level),
    createdAt: String(r.created_at),
    expiresAt: String(r.expires_at),
    consumedAt: r.consumed_at ? String(r.consumed_at) : null,
    verifiedAt: r.verified_at ? String(r.verified_at) : null,
    requestId: r.request_id ? String(r.request_id) : null,
        providerRef: r.provider_ref ? String(r.provider_ref) : null,
    identityKeyHash: r.identity_key_hash ? String(r.identity_key_hash) : null,
    identityKeyVersion: Number(r.identity_key_version) || 1,
    resultReference: r.result_reference ? String(r.result_reference) : null,
    errorCode: r.error_code ? String(r.error_code) : null,
    clientIpHash: r.client_ip_hash ? String(r.client_ip_hash) : null,
    userAgentHash: r.user_agent_hash ? String(r.user_agent_hash) : null,
  };
}

export interface CreateVerificationTxInput {
  transactionRef: string;
  provider: IdentityProviderName;
  assuranceLevel: AssuranceLevel;
  expiresAt: Date;
  requestId?: string;
  clientIpHash?: string;
  userAgentHash?: string;
}

export async function createVerificationTransaction(input: CreateVerificationTxInput): Promise<VerificationTransactionRow> {
  const row = await db.queryOne(
    `INSERT INTO identity_verification_transactions
       (transaction_ref, provider, state, assurance_level, expires_at, request_id, client_ip_hash, user_agent_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      input.transactionRef,
      input.provider,
      VerificationState.CREATED,
      input.assuranceLevel,
      input.expiresAt.toISOString(),
      input.requestId ?? null,
      input.clientIpHash ?? null,
      input.userAgentHash ?? null,
    ],
  );
  return mapRow(row!);
}

export async function getVerificationTransaction(ref: string): Promise<VerificationTransactionRow | null> {
  const row = await db.queryOne(
    'SELECT * FROM identity_verification_transactions WHERE transaction_ref = $1 LIMIT 1',
    [ref],
  );
  return row ? mapRow(row) : null;
}

export async function getVerificationTransactionById(id: string): Promise<VerificationTransactionRow | null> {
  const row = await db.queryOne(
    'SELECT * FROM identity_verification_transactions WHERE id = $1 LIMIT 1',
    [id],
  );
  return row ? mapRow(row) : null;
}

/** Atomic transition guard — only succeeds when the current state matches `from`. */
export async function transitionVerificationTransaction(
  ref: string,
  from: VerificationState[],
  to: VerificationState,
  patch: {
    providerRef?: string;
    identityKeyHash?: string;
    resultReference?: string;
    errorCode?: string;
    verifiedAt?: Date;
  } = {},
): Promise<VerificationTransactionRow | null> {
  const row = await db.queryOne(
    `UPDATE identity_verification_transactions
     SET state = $3,
         updated_at = now(),
         provider_ref = COALESCE($4, provider_ref),
         identity_key_hash = COALESCE($5, identity_key_hash),
         result_reference = COALESCE($6, result_reference),
         error_code = COALESCE($7, error_code),
         verified_at = COALESCE($8, verified_at),
         consumed_at = CASE WHEN $3 = 'CONSUMED' THEN now() ELSE consumed_at END
     WHERE transaction_ref = $1 AND state = ANY($2::text[])
     RETURNING *`,
    [ref, from, to, patch.providerRef ?? null, patch.identityKeyHash ?? null, patch.resultReference ?? null, patch.errorCode ?? null, patch.verifiedAt?.toISOString() ?? null],
  );
  return row ? mapRow(row) : null;
}

/** Transactional consume: marks CONSUMED only if state is VERIFIED and not yet
 *  consumed. Returns the row or null when not consumable. */
export function consumeVerificationTransaction(ref: string): Promise<VerificationTransactionRow | null> {
  return transitionVerificationTransaction(ref, [VerificationState.VERIFIED], VerificationState.CONSUMED);
}

/** Atomically mark stale CREATED/STARTED transactions EXPIRED. */
export async function expireStaleVerificationTransactions(now: Date = new Date()): Promise<number> {
  const res = await db.query(
    `UPDATE identity_verification_transactions
     SET state = 'EXPIRED', updated_at = now()
     WHERE state IN ('CREATED','STARTED') AND expires_at < $1`,
    [now.toISOString()],
  );
  return res.rowCount ?? 0;
}

/** Full row with tx-scoped helpers for in-transaction use. */
export interface VerificationTxHandle {
  query: TxClient['query'];
  queryOne: TxClient['queryOne'];
  execute: TxClient['execute'];
}

export default {
  create: createVerificationTransaction,
  get: getVerificationTransaction,
  getById: getVerificationTransactionById,
  transition: transitionVerificationTransaction,
  consume: consumeVerificationTransaction,
  expireStale: expireStaleVerificationTransactions,
};