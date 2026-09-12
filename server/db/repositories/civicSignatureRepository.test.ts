/**
 * Civic signature repository tests — scripted DB tx proving:
 *  - verification tx must be consumable (CONSUME_FAILED otherwise)
 *  - UNIQUE(petition_id, mobile_identity_hash) wins on concurrent duplicate (23505)
 *  - idempotency-key retries return the ORIGINAL response
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

type Call = { sql: string; result?: any; error?: any };

function makeScriptedTx(script: Call[]) {
  let i = 0;
  const tx = {
    query: async (_sql: string, _p?: any[]) => {
      const s = script[i++] ?? { sql: _sql, result: { rows: [], rowCount: 0 } };
      if (s.error) throw s.error;
      return s.result ?? { rows: [], rowCount: 0 };
    },
    queryOne: async (_sql: string, _p?: any[]) => {
      const s = script[i++] ?? { sql: _sql, result: null };
      if (s.error) throw s.error;
      return s.result ?? null;
    },
    execute: async () => undefined,
  };
  return tx;
}

vi.mock('../client', () => ({
  db: {
    withTransaction: (fn: (tx: any) => Promise<any>) => fn((globalThis as any).__scriptedTx),
  },
}));

import { recordCivicSign } from './civicSignatureRepository';
import { consumeVerificationTxInTx } from '../../services/identity/verificationTxConsume';
import { VerificationState } from '../../services/identity/types';

const IKH = 'a'.repeat(64);
const TX_REF = 'VOG-VT-TEST1';

describe('verificationTxConsume (tx-scoped single-use consume)', () => {
  it('consumes a VERIFIED tx atomically', async () => {
    (globalThis as any).__scriptedTx = makeScriptedTx([
      { sql: 'SELECT', result: { state: 'VERIFIED', expires_at: new Date(Date.now() + 60000).toISOString(), consumed_at: null } },
      { sql: 'UPDATE', result: { id: 'tx-1' } },
    ]);
    const r = await consumeVerificationTxInTx(makeScriptedTx([
      { sql: 'SELECT', result: { state: 'VERIFIED', expires_at: new Date(Date.now() + 60000).toISOString(), consumed_at: null } },
      { sql: 'UPDATE', result: { id: 'tx-1' } },
    ]), TX_REF);
    expect(r.consumed).toBe(true);
  });

  it('refuses when tx is not VERIFIED', async () => {
    const r = await consumeVerificationTxInTx(makeScriptedTx([
      { sql: 'SELECT', result: { state: 'CREATED', expires_at: new Date(Date.now() + 60000).toISOString(), consumed_at: null } },
    ]), TX_REF);
    expect(r.consumed).toBe(false);
    expect(r.reason).toBe('not_verified');
  });

  it('refuses when tx is already consumed', async () => {
    const r = await consumeVerificationTxInTx(makeScriptedTx([
      { sql: 'SELECT', result: { state: 'CONSUMED', expires_at: new Date().toISOString(), consumed_at: new Date().toISOString() } },
    ]), TX_REF);
    expect(r.consumed).toBe(false);
    expect(r.reason).toBe('already_consumed');
  });

  it('refuses when tx is expired', async () => {
    const r = await consumeVerificationTxInTx(makeScriptedTx([
      { sql: 'SELECT', result: { state: 'VERIFIED', expires_at: new Date(Date.now() - 1000).toISOString(), consumed_at: null } },
    ]), TX_REF);
    expect(r.consumed).toBe(false);
    expect(r.reason).toBe('expired');
  });

  it('refuses when tx not found', async () => {
    const r = await consumeVerificationTxInTx(makeScriptedTx([{ sql: 'SELECT', result: null }]), TX_REF);
    expect(r.consumed).toBe(false);
    expect(r.reason).toBe('not_found');
  });

  it('refuses when the atomic claim loses the race', async () => {
    const r = await consumeVerificationTxInTx(makeScriptedTx([
      { sql: 'SELECT', result: { state: 'VERIFIED', expires_at: new Date(Date.now() + 60000).toISOString(), consumed_at: null } },
      { sql: 'UPDATE', result: null }, // lost race
    ]), TX_REF);
    expect(r.consumed).toBe(false);
    expect(r.reason).toBe('already_consumed');
  });

  it('VERIFIED state constant is terminal-safe', () => {
    expect(VerificationState.VERIFIED).toBe('VERIFIED');
    expect(VerificationState.CONSUMED).toBe('CONSUMED');
  });
});

describe('recordCivicSign (uniqueness + idempotency + consume gating)', () => {
  const baseInput = {
    petitionId: 'global',
    identityKeyHash: IKH,
    fullName: 'Test User',
    phoneLast4: '3210',
    verificationTxRef: TX_REF,
    provider: 'self-asserted',
    assuranceLevel: 2,
    signatureHash: 'h'.repeat(64),
    civicSignId: 'VOG-AAAAAAAAAAAAAAAA',
    idempotencyKey: 'idem-1',
  };

  beforeEach(() => { (globalThis as any).__scriptedTx = undefined; });

  it('happy path: consume tx → dup check null → insert → returns created', async () => {
    (globalThis as any).__scriptedTx = makeScriptedTx([
      // idempotency lookup (none)
      { sql: 'SELECT', result: null },
      // consumeVerificationTxInTx: SELECT + UPDATE
      { sql: 'SELECT', result: { state: 'VERIFIED', expires_at: new Date(Date.now() + 60000).toISOString(), consumed_at: null } },
      { sql: 'UPDATE', result: { id: 'tx-1' } },
      // duplicate lookup (none)
      { sql: 'SELECT', result: null },
      // batch lookup (none) → INSERT batch
      { sql: 'SELECT', result: null },
      // batch insert
      { sql: 'INSERT' },
      // signature insert
      { sql: 'INSERT', result: { created_at: '2026-01-01T00:00:00Z' } },
      // idempotency write
      { sql: 'INSERT' },
    ]);
    const r = await recordCivicSign(baseInput);
    expect(r.isDuplicate).toBe(false);
    expect(r.signHash).toMatch(/^VG-[0-9a-f]{32}$/);
    expect(r.civicSignId).toBe('VOG-AAAAAAAAAAAAAAAA');
    expect(r.signedAt).toBe('2026-01-01T00:00:00Z');
  });

  it('concurrent duplicate (23505) resolves to the winner deterministically', async () => {
    (globalThis as any).__scriptedTx = makeScriptedTx([
      { sql: 'SELECT', result: { state: 'VERIFIED', expires_at: new Date(Date.now() + 60000).toISOString(), consumed_at: null } },
      { sql: 'UPDATE', result: { id: 'tx-1' } },              // consume wins here
      { sql: 'SELECT', result: null },                       // dup check (none)
      { sql: 'SELECT', result: { batch_no: 3 } },             // batch exists
      { sql: 'UPDATE' },                                      // batch update
      { sql: 'INSERT', error: Object.assign(new Error('duplicate'), { code: '23505' }) },
      { sql: 'SELECT', result: { sign_hash: 'VG-winner', civic_sign_id: 'VOG-WIN', signature_hash: 'h'.repeat(64), created_at: '2026-01-01T00:00:00Z', batch_no: 3 } },
    ]);
    const r = await recordCivicSign({ ...baseInput, idempotencyKey: undefined });
    expect(r.isDuplicate).toBe(true);
    expect(r.signHash).toBe('VG-winner');
    expect(r.signedAt).toBe('2026-01-01T00:00:00Z');
  });

  it('non-consumable verification tx → CONSUME_FAILED (replay protection)', async () => {
    (globalThis as any).__scriptedTx = makeScriptedTx([
      { sql: 'SELECT', result: { state: 'CONSUMED', expires_at: new Date().toISOString(), consumed_at: new Date().toISOString() } },
    ]);
    await expect(recordCivicSign({ ...baseInput, idempotencyKey: undefined })).rejects.toMatchObject({ code: 'CONSUME_FAILED' });
  });

  it('idempotency-key retry returns the ORIGINAL response', async () => {
    (globalThis as any).__scriptedTx = makeScriptedTx([
      { sql: 'SELECT', result: { response: JSON.stringify({ signHash: 'VG-original', civicSignId: 'VOG-ORIGINAL', signatureHash: 'h'.repeat(64), batchNo: 2 }) } },
      { sql: 'SELECT', result: { created_at: '2026-01-01T00:00:00Z' } },
    ]);
    const r = await recordCivicSign(baseInput);
    expect(r.signHash).toBe('VG-original');
    expect(r.civicSignId).toBe('VOG-ORIGINAL');
    expect(r.isDuplicate).toBe(false);
    expect(r.signedAt).toBe('2026-01-01T00:00:00Z');
  });
});