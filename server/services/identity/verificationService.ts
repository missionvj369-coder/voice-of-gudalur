/**
 * Open Civic Signature Protocol — verification service.
 *
 * Orchestrates the verification lifecycle. It:
 *  - allocates a single-use verification transaction (CREATED)
 *  - runs a provider adapter (self-asserted consent or CAMARA network verify)
 *  - transitions VERIFIED/FAILED/EXPIRED deterministically
 *  - consumes a VERIFIED transaction EXACTLY ONCE (replay/reuse prevention)
 *  - emits structured security events (never raw subjects)
 *
 * Single-use guarantee: consumeForSignature uses an atomic SQL transition
 * guarded by `state = ANY(['VERIFIED'])`; a concurrent second consume returns
 * null → signature creation refuses and returns the already-existing signature
 * (the UNIQUE(petition_id, identity_key_hash) index is the final authority).
 */
import crypto from 'crypto';
import { db } from '../../db/client';
import { logger } from '../../utils/logger';
import { logAudit } from '../../middleware/auth';
import {
  AssuranceLevel,
  ASSURANCE_LEVEL_MAX,
  IdentityProviderName,
  MobileIdentityVerifier,
  VerificationState,
  VERIFICATION_TX_TTL_SECONDS,
  TRANSACTION_REF_PREFIX,
  VerificationRequest,
  VerificationResult,
  VerificationFailureReason,
} from './types';
import { getVerifier, resolveProviderForAssurance } from './registry';
import {
  createVerificationTransaction,
  expireStaleVerificationTransactions,
  getVerificationTransaction,
  transitionVerificationTransaction,
  consumeVerificationTransaction,
  VerificationTransactionRow,
} from '../../db/repositories/verificationTransactionRepository';
import { normalizeMobile } from '../../utils/petitionIdentity';
import { identityKeyHash, identityLogPrefix, ACTIVE_KEY_VERSION } from './identityHash';
import { ProviderError } from './providers/errors';

// ── Structured event names (batch 19 observability contract) ────────────
export const VERIFICATION_EVENTS = {
  STARTED: 'verification_started',
  VERIFIED: 'verification_verified',
  FAILED: 'verification_failed',
  EXPIRED: 'verification_expired',
  PROVIDER_TIMEOUT: 'provider_timeout',
  PROVIDER_ERROR: 'provider_error',
  RATE_LIMITED: 'rate_limited',
} as const;

export interface VerificationStartInput {
  subject: string; // canonical national mobile (server-normalized by route)
  provider?: IdentityProviderName; // optional; resolves by requested level otherwise
  requestedAssurance: AssuranceLevel;
  requestId?: string;
  clientIpHash?: string;
  userAgentHash?: string;
}

export interface VerificationStartResult {
  transactionRef: string;
  provider: IdentityProviderName;
  state: VerificationState;
  expiresAt: string;
  assuranceLevel: number;
  /** Present when the provider has an interactive step (e.g. operator redirect). */
  redirectUrl?: string;
}

export interface CompleteVerificationInput {
  transactionRef: string;
  subject: string;          // canonical national mobile
  consent: boolean;          // self-asserted path requires explicit user consent
  requestId?: string;
  clientIpHash?: string;
  userAgentHash?: string;
}

export interface CompleteVerificationResult {
  ok: boolean;
  transactionRef: string;
  state: VerificationState;
  assuranceLevel: number;
  failureReason?: VerificationFailureReason;
  identityKeyHash?: string;
  identityKeyVersion?: number;
  logPrefix?: string;
}

function providerFor(provider: string | undefined, requestedAssurance: AssuranceLevel): MobileIdentityVerifier {
  if (provider) return getVerifier(provider);
  const resolved = resolveProviderForAssurance(requestedAssurance);
  if (!resolved) throw new Error(`No provider can satisfy assurance ${requestedAssurance}`);
  return resolved.verifier;
}

function hashIp(ip?: string): string | undefined {
  if (!ip) return undefined;
  return crypto.createHash('sha256').update(ip, 'utf8').digest('hex');
}

function newTransactionRef(): string {
  return `${TRANSACTION_REF_PREFIX}-${crypto.randomBytes(9).toString('hex').toUpperCase()}`;
}
/** Route layer normalizes the raw mobile to a canonical subject FIRST. */
export async function startVerification(input: VerificationStartInput): Promise<VerificationStartResult> {
  // Normalize here too so a non-canonical subject can never reach a provider.
  const mobile = normalizeMobile(input.subject);
  if (!mobile.ok) throw new Error('invalid_mobile');

  const verifier = providerFor(input.provider, input.requestedAssurance);
  const caps = verifier.getCapabilities();
  if (caps.maxAssurance < input.requestedAssurance) {
    throw new Error(`provider ${caps.provider} cannot satisfy assurance ${input.requestedAssurance}`);
  }

  const transactionRef = newTransactionRef();
  const now = new Date();
  const tx = await createVerificationTransaction({
    transactionRef,
    provider: caps.provider,
    assuranceLevel: Math.min(input.requestedAssurance, ASSURANCE_LEVEL_MAX),
    expiresAt: new Date(now.getTime() + VERIFICATION_TX_TTL_SECONDS * 1000),
    requestId: input.requestId,
    clientIpHash: hashIp(input.clientIpHash),
    userAgentHash: input.userAgentHash,
  });

  await emitEvent(VERIFICATION_EVENTS.STARTED, tx, undefined, undefined, {
    provider: caps.provider,
    assuranceLevel: tx.assuranceLevel,
    mode: caps.production ? 'production' : caps.sandbox ? 'sandbox' : 'off',
  });

  // Optional interactive start (CAMARA subscriber-consent redirects).
  let redirectUrl: string | undefined;
  if (verifier.start) {
    try {
      const step = await verifier.start({
        transactionRef,
        requestId: input.requestId ?? '',
        subject: mobile.canonical,
        requestedAssurance: input.requestedAssurance,
      });
      redirectUrl = step?.redirectUrl;
    } catch {
      /* interactive start optional */
    }
  }

  return {
    transactionRef,
    provider: caps.provider,
    state: tx.state,
    expiresAt: tx.expiresAt,
    assuranceLevel: tx.assuranceLevel,
    redirectUrl,
  };
}
/**
 * Complete verification for a transaction. In self-asserted mode (production
 * fallback) this runs the SelfAssertedVerifier which requires explicit consent.
 * In CAMARA mode it runs the network verification against sandbox/production
 * endpoint. Never persists/logs the subject.
 */
export async function completeVerification(input: CompleteVerificationInput): Promise<CompleteVerificationResult> {
  const mobile = normalizeMobile(input.subject);
  if (!mobile.ok) throw new Error('invalid_mobile');

  const tx = await getVerificationTransaction(input.transactionRef);
  if (!tx) throw new Error('transaction_not_found');

  if (isTransactionExpired(tx)) {
    const bumped = await transitionVerificationTransaction(
      tx.transactionRef,
      [VerificationState.CREATED, VerificationState.STARTED],
      VerificationState.EXPIRED,
    );
    await emitEvent(VERIFICATION_EVENTS.EXPIRED, tx, undefined);
    return {
      ok: false,
      transactionRef: tx.transactionRef,
      state: VerificationState.EXPIRED,
      assuranceLevel: tx.assuranceLevel,
      failureReason: 'expired',
    };
  }

  if (tx.state !== VerificationState.CREATED) {
    // Already acted upon — deterministic refusal (replay protection).
    return {
      ok: false,
      transactionRef: tx.transactionRef,
      state: tx.state,
      assuranceLevel: tx.assuranceLevel,
      failureReason: tx.state === VerificationState.FAILED ? 'not_verified' : 'invalid_request',
    };
  }

  const verifier = getVerifier(tx.provider);
  const started = await transitionVerificationTransaction(
    tx.transactionRef,
    [VerificationState.CREATED],
    VerificationState.STARTED,
  );
  if (!started) {
    // Lost a race to a concurrent completion → deterministic refusal.
    return {
      ok: false,
      transactionRef: tx.transactionRef,
      state: tx.state,
      assuranceLevel: tx.assuranceLevel,
      failureReason: 'invalid_request',
    };
  }

  const request: VerificationRequest = {
    transactionRef: tx.transactionRef,
    requestId: input.requestId ?? tx.requestId ?? '',
    subject: mobile.canonical,
    requestedAssurance: tx.assuranceLevel as AssuranceLevel,
    callbackData:
      tx.provider === 'self-asserted'
        ? { consent: input.consent ? 'acknowledged' : 'declined' }
        : undefined,
  };

  let result: VerificationResult;
  try {
    result = await verifier.verify(request);
  } catch (e) {
    // Transport/config failures → FAILED with client-safe reason + event.
    // Map provider reasons into the client-safe set ('not_supported' → 'provider_error').
    const providerReason = e instanceof ProviderError ? e.reason : 'provider_error';
    const reason: VerificationFailureReason =
      providerReason === 'not_supported' ? 'provider_error' : providerReason;
    await transitionVerificationTransaction(
      tx.transactionRef,
      [VerificationState.STARTED],
      VerificationState.FAILED,
      { errorCode: reason },
    );
    await emitEvent(
      reason === 'provider_timeout' ? VERIFICATION_EVENTS.PROVIDER_TIMEOUT
        : reason === 'provider_unavailable' ? VERIFICATION_EVENTS.PROVIDER_ERROR
        : VERIFICATION_EVENTS.FAILED,
      tx,
      reason,
    );
    logger.error('[verification] provider error', { event: reason, tx: tx.transactionRef });
    return {
      ok: false,
      transactionRef: tx.transactionRef,
      state: VerificationState.FAILED,
      assuranceLevel: tx.assuranceLevel,
      failureReason: reason,
    };
  }

  if (!result.ok) {
    await transitionVerificationTransaction(
      tx.transactionRef,
      [VerificationState.STARTED],
      VerificationState.FAILED,
      {
        errorCode: result.failureReason ?? 'not_verified',
        providerRef: result.providerRef,
        resultReference: result.resultReference,
      },
    );
    await emitEvent(VERIFICATION_EVENTS.FAILED, tx, result.failureReason);
    return {
      ok: false,
      transactionRef: tx.transactionRef,
      state: VerificationState.FAILED,
      assuranceLevel: tx.assuranceLevel,
      failureReason: result.failureReason ?? 'not_verified',
    };
  }

  const ikh = identityKeyHash(mobile.canonical, ACTIVE_KEY_VERSION);
  const updated = await transitionVerificationTransaction(
    tx.transactionRef,
    [VerificationState.STARTED],
    VerificationState.VERIFIED,
    {
      providerRef: result.providerRef,
      identityKeyHash: ikh,
      resultReference: result.resultReference,
      verifiedAt: new Date(),
    },
  );

  await emitEvent(VERIFICATION_EVENTS.VERIFIED, updated ?? tx, undefined, ikh);

  return {
    ok: true,
    transactionRef: tx.transactionRef,
    state: VerificationState.VERIFIED,
    assuranceLevel: (updated ?? tx).assuranceLevel as number,
    identityKeyHash: ikh,
    identityKeyVersion: ACTIVE_KEY_VERSION,
    logPrefix: identityLogPrefix(ikh),
  };
}
/** True once a transaction has passed its expiry wall. */
export function isTransactionExpired(tx: Pick<VerificationTransactionRow, 'state' | 'expiresAt'>): boolean {
  if (tx.state === VerificationState.EXPIRED) return true;
  if (tx.state === VerificationState.CONSUMED || tx.state === VerificationState.VERIFIED) return false;
  return new Date(tx.expiresAt).getTime() < Date.now();
}

/** Lookup a transaction by reference (no side effects). */
export async function getTransaction(ref: string): Promise<VerificationTransactionRow | null> {
  return getVerificationTransaction(ref);
}

/** Sweep stale CREATED/STARTED transactions to EXPIRED. Returns count expired. */
export async function sweepExpiredTransactions(): Promise<number> {
  const n = await expireStaleVerificationTransactions();
  if (n > 0) logger.info('[verification] expired stale transactions', { count: n });
  return n;
}

export { consumeVerificationTransaction };

async function emitEvent(
  action: string,
  tx: Pick<VerificationTransactionRow, 'transactionRef' | 'provider' | 'assuranceLevel'>,
  failureReason?: VerificationFailureReason,
  identityHash?: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  try {
    await logAudit({
      actorKind: 'system',
      action,
      target: tx.transactionRef,
      detail: {
        provider: tx.provider,
        assurance: tx.assuranceLevel,
        ...(failureReason ? { reason: failureReason } : {}),
        // Only the non-reversible HMAC prefix may ever appear in audit.
        ...(identityHash ? { identityPrefix: identityLogPrefix(identityHash) } : {}),
        ...(extra ?? {}),
      },
    });
  } catch (e) {
    // Audit write failures must never break the sign flow.
    logger.warn('[verification] audit write failed', (e as Error)?.message);
  }
}

export { VERIFICATION_TX_TTL_SECONDS, TRANSACTION_REF_PREFIX };