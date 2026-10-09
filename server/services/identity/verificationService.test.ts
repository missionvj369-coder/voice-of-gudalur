/**
 * Verification service tests — state machine, replay prevention, single-use
 * consume, expiry. The DB repo + audit log are mocked; provider behavior is
 * real (SelfAssertedVerifier) or an injected fake for failure paths.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Mock the transaction repository (in-memory, state-machine faithful) ──
const txStore = new Map<string, any>();
let seq = 0;

vi.mock('../../db/repositories/verificationTransactionRepository', async () => {
  return {
    createVerificationTransaction: vi.fn(async (input: any) => {
      const rec: any = {
        id: 'id-' + (++seq),
        transactionRef: input.transactionRef,
        provider: input.provider,
        state: 'CREATED',
        assuranceLevel: input.assuranceLevel,
        createdAt: new Date().toISOString(),
        expiresAt: input.expiresAt.toISOString(),
        consumedAt: null,
        verifiedAt: null,
        requestId: input.requestId ?? null,
        providerRef: null,
        identityKeyHash: null,
        resultReference: null,
        errorCode: null,
      };
      txStore.set(rec.transactionRef, rec);
      return rec;
    }),
    getVerificationTransaction: vi.fn(async (ref: string) => txStore.get(ref) ?? null),
    transitionVerificationTransaction: vi.fn(async (
      ref: string,
      from: string[],
      to: string,
      patch: any = {},
    ) => {
      const rec = txStore.get(ref);
      if (!rec) return null;
      if (!from.includes(rec.state)) return null;
      rec.state = to;
      rec.providerRef = patch.providerRef ?? rec.providerRef;
      rec.identityKeyHash = patch.identityKeyHash ?? rec.identityKeyHash;
      rec.resultReference = patch.resultReference ?? rec.resultReference;
      rec.errorCode = patch.errorCode ?? rec.errorCode;
      rec.verifiedAt = patch.verifiedAt?.toISOString() ?? rec.verifiedAt;
      if (to === 'CONSUMED') rec.consumedAt = new Date().toISOString();
      return rec;
    }),
    consumeVerificationTransaction: vi.fn(async (ref: string) => {
      const rec = txStore.get(ref);
      if (!rec || rec.state !== 'VERIFIED' || rec.consumedAt) return null;
      rec.state = 'CONSUMED';
      rec.consumedAt = new Date().toISOString();
      return rec;
    }),
    expireStaleVerificationTransactions: vi.fn(async (now: Date) => {
      let n = 0;
      for (const rec of txStore.values()) {
        if (['CREATED', 'STARTED'].includes(rec.state) && new Date(rec.expiresAt) < now) {
          rec.state = 'EXPIRED'; n++;
        }
      }
      return n;
    }),
  };
});

vi.mock('../../middleware/auth', () => ({
  logAudit: vi.fn(async () => undefined),
}));

vi.mock('../../db/client', () => ({
  db: { query: vi.fn(), queryOne: vi.fn(), execute: vi.fn(), withTransaction: vi.fn() },
}));

import {
  startVerification,
  completeVerification,
  getTransaction,
  consumeVerificationTransaction,
  isTransactionExpired,
} from './verificationService';
import { AssuranceLevel, VerificationState } from './types';
import { providerErrors } from './providers/errors';
import { _registerForTesting } from './registry';
import { SelfAssertedVerifier } from './selfAsserted';

const SECRET = 'verification-secret-with-32+chars-entropy!!';
describe('verification service (single-use transaction lifecycle)', () => {
  beforeEach(() => {
    txStore.clear();
    seq = 0;
    process.env.VERIFICATION_IDENTITY_SECRET = SECRET;
    process.env.PETITION_IDENTITY_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.VERIFICATION_IDENTITY_SECRET;
    delete process.env.PETITION_IDENTITY_SECRET;
    _registerForTesting('self-asserted', new SelfAssertedVerifier());
  });

  it('start → CREATED with a VOG-VT reference and future expiry', async () => {
    const res = await startVerification({
      subject: '9876543210',
      requestedAssurance: AssuranceLevel.SELF_ASSERTED_MOBILE,
    });
    expect(res.transactionRef).toMatch(/^VOG-VT-/);
    expect(res.state).toBe(VerificationState.CREATED);
    expect(new Date(res.expiresAt).getTime()).toBeGreaterThan(Date.now());
    const tx = await getTransaction(res.transactionRef);
    expect(tx?.provider).toBe('self-asserted');
  });

  it('complete → VERIFIED at SELF_ASSERTED_MOBILE, storing only the identity hash', async () => {
    const start = await startVerification({ subject: '9876543210', requestedAssurance: AssuranceLevel.SELF_ASSERTED_MOBILE });
    const done = await completeVerification({
      transactionRef: start.transactionRef,
      subject: '9876543210',
      consent: true,
    });
    expect(done.ok).toBe(true);
    expect(done.state).toBe(VerificationState.VERIFIED);
    expect(done.identityKeyHash).toMatch(/^[0-9a-f]{64}$/);
    const tx = await getTransaction(start.transactionRef);
    expect(tx?.identityKeyHash).toMatch(/^[0-9a-f]{64}$/);
    // raw subject never persisted
    expect(JSON.stringify(tx)).not.toContain('9876543210');
  });

  it('complete without consent → FAILED (self-asserted requires explicit consent)', async () => {
    const start = await startVerification({ subject: '9876543210', requestedAssurance: AssuranceLevel.SELF_ASSERTED_MOBILE });
    const done = await completeVerification({
      transactionRef: start.transactionRef,
      subject: '9876543210',
      consent: false,
    });
    expect(done.ok).toBe(false);
    expect(done.failureReason).toBe('not_verified');
    const tx = await getTransaction(start.transactionRef);
    expect(tx?.state).toBe(VerificationState.FAILED);
  });

  it('complete twice → second is deterministically refused (replay protection)', async () => {
    const start = await startVerification({ subject: '9876543210', requestedAssurance: AssuranceLevel.SELF_ASSERTED_MOBILE });
    const first = await completeVerification({ transactionRef: start.transactionRef, subject: '9876543210', consent: true });
    expect(first.ok).toBe(true);
    const second = await completeVerification({ transactionRef: start.transactionRef, subject: '9876543210', consent: true });
    expect(second.ok).toBe(false);
    expect(second.failureReason).toBe('invalid_request');
  });

  it('complete after expiry → EXPIRED', async () => {
    const start = await startVerification({ subject: '9876543210', requestedAssurance: AssuranceLevel.SELF_ASSERTED_MOBILE });
    const tx = txStore.get(start.transactionRef);
    tx.expiresAt = new Date(Date.now() - 1000).toISOString();
    const done = await completeVerification({ transactionRef: start.transactionRef, subject: '9876543210', consent: true });
    expect(done.ok).toBe(false);
    expect(done.failureReason).toBe('expired');
    expect((await getTransaction(start.transactionRef))?.state).toBe(VerificationState.EXPIRED);
  });

  it('isTransactionExpired — VERIFIED/CONSUMED never count as expired', () => {
    const t = (state: string, expiresAt: string) => ({ state, expiresAt } as any);
    expect(isTransactionExpired(t('VERIFIED', new Date(Date.now() - 9e9).toISOString()))).toBe(false);
    expect(isTransactionExpired(t('CONSUMED', new Date(Date.now() - 9e9).toISOString()))).toBe(false);
    expect(isTransactionExpired(t('EXPIRED', new Date().toISOString()))).toBe(true);
    expect(isTransactionExpired(t('CREATED', new Date(Date.now() - 1000).toISOString()))).toBe(true);
    expect(isTransactionExpired(t('CREATED', new Date(Date.now() + 60000).toISOString()))).toBe(false);
  });

  it('provider transport failure → FAILED with provider_timeout', async () => {
    _registerForTesting('self-asserted', {
      getCapabilities: () => ({
        provider: 'self-asserted', maxAssurance: AssuranceLevel.SELF_ASSERTED_MOBILE,
        production: true, sandbox: false, description: 'test',
      }),
      verify: async () => { throw providerErrors.timeout('self-asserted'); },
    });
    const start = await startVerification({ subject: '9876543210', requestedAssurance: AssuranceLevel.SELF_ASSERTED_MOBILE });
    const done = await completeVerification({ transactionRef: start.transactionRef, subject: '9876543210', consent: true });
    expect(done.ok).toBe(false);
    expect(done.failureReason).toBe('provider_timeout');
    const tx = await getTransaction(start.transactionRef);
    expect(tx?.state).toBe(VerificationState.FAILED);
    expect(tx?.errorCode).toBe('provider_timeout');
  });

  it('consume → VERIFIED→CONSUMED exactly once (single-use)', async () => {
    const start = await startVerification({ subject: '9876543210', requestedAssurance: AssuranceLevel.SELF_ASSERTED_MOBILE });
    await completeVerification({ transactionRef: start.transactionRef, subject: '9876543210', consent: true });
    const first = await consumeVerificationTransaction(start.transactionRef);
    expect(first?.state).toBe(VerificationState.CONSUMED);
    const second = await consumeVerificationTransaction(start.transactionRef);
    expect(second).toBeNull();
  });

  it('concurrent consume race → exactly one wins', async () => {
    const start = await startVerification({ subject: '9876543210', requestedAssurance: AssuranceLevel.SELF_ASSERTED_MOBILE });
    await completeVerification({ transactionRef: start.transactionRef, subject: '9876543210', consent: true });
    const [a, b, c] = await Promise.all([
      consumeVerificationTransaction(start.transactionRef),
      consumeVerificationTransaction(start.transactionRef),
      consumeVerificationTransaction(start.transactionRef),
    ]);
    const wins = [a, b, c].filter(Boolean);
    expect(wins.length).toBe(1);
    expect(wins[0]?.state).toBe(VerificationState.CONSUMED);
  });

  it('unknown transaction → transaction_not_found', async () => {
    await expect(
      completeVerification({ transactionRef: 'VOG-VT-NOPE', subject: '9876543210', consent: true }),
    ).rejects.toThrow(/transaction_not_found/);
  });

  it('invalid subject → invalid_mobile', async () => {
    await expect(
      startVerification({ subject: '12345', requestedAssurance: AssuranceLevel.SELF_ASSERTED_MOBILE }),
    ).rejects.toThrow(/invalid_mobile/);
  });

  it('audit events never contain the raw subject', async () => {
    const { logAudit } = await import('../../middleware/auth');
    await startVerification({ subject: '9876543210', requestedAssurance: AssuranceLevel.SELF_ASSERTED_MOBILE });
    const start2 = await startVerification({ subject: '9876543211', requestedAssurance: AssuranceLevel.SELF_ASSERTED_MOBILE });
    await completeVerification({ transactionRef: start2.transactionRef, subject: '9876543211', consent: true });
    const serialized = JSON.stringify(vi.mocked(logAudit).mock.calls);
    expect(serialized).not.toContain('9876543210');
    expect(serialized).not.toContain('9876543211');
  });
});