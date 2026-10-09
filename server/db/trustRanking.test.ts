/**
 * The public trust ranking — the ladder that decides how the petition ledger
 * orders signatures. These pins hold the WHOLE feature together:
 *
 *  1. the tiers keep their documented order (fully validated on top);
 *  2. the SQL CASE is the ONLY ladder implementation (no copy lives in a route);
 *  3. applyTrustRank actually writes the recomputed key AND mirrors it onto the
 *     source petition_signs row — a witness validation must never downgrade a
 *     signature that was already authorized with Google/Telegram.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  TRUST_RANK,
  TRUST_RANK_CASE_SQL,
  trustRankSelectSql,
  applyTrustRank,
} from './trustRanking';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(path.resolve(here, p), 'utf8');

describe('trust rank tiers', () => {
  it('keeps the documented order — fully validated on top, recorded at the bottom', () => {
    const t = TRUST_RANK;
    expect(t.FULLY_VALIDATED).toBeGreaterThan(t.BOTH_AUTHORIZED);
    expect(t.BOTH_AUTHORIZED).toBeGreaterThan(t.LEGACY_TELEGRAM_VALIDATED);
    expect(t.LEGACY_TELEGRAM_VALIDATED).toBeGreaterThan(t.LEGACY_GOOGLE_VALIDATED);
    expect(t.LEGACY_GOOGLE_VALIDATED).toBeGreaterThan(t.LEGACY_TELEGRAM_AUTHORIZED);
    expect(t.LEGACY_TELEGRAM_AUTHORIZED).toBeGreaterThan(t.LEGACY_GOOGLE_AUTHORIZED);
    expect(t.LEGACY_GOOGLE_AUTHORIZED).toBeGreaterThan(t.COMMUNITY_VALIDATED);
    expect(t.COMMUNITY_VALIDATED).toBeGreaterThan(t.RECORDED);
  });

  it('requires BOTH providers and a witness validation for the top tier', () => {
    const both = new RegExp(
      `${TRUST_RANK.FULLY_VALIDATED}[\\s\\S]*?${TRUST_RANK.BOTH_AUTHORIZED}`,
    );
    expect(TRUST_RANK_CASE_SQL).toMatch(both);
  });
});

describe('trust rank CASE SQL', () => {
  const sql = trustRankSelectSql();

  it('counts telegram only when the shared number MATCHED the registered one', () => {
    // Telegram is offered as mobile-number validation: an authorization that
    // never shared (or never matched) a number must earn no telegram rung.
    const branches = TRUST_RANK_CASE_SQL.split('WHEN').slice(1);
    expect(branches.length).toBeGreaterThanOrEqual(6);
    expect(TRUST_RANK_CASE_SQL).toMatch(/phone_matched = true/g);
  });

  it('keeps the legacy sign_method tiers and the plain witness tier', () => {
    expect(TRUST_RANK_CASE_SQL).toMatch(/sign_method = 'TELEGRAM'/);
    expect(TRUST_RANK_CASE_SQL).toMatch(/sign_method = 'GOOGLE'/);
    expect(TRUST_RANK_CASE_SQL).toMatch(/validation_count > 0/);
    expect(TRUST_RANK_CASE_SQL).toMatch(new RegExp(`ELSE ${TRUST_RANK.RECORDED}`));
  });

  it('casts the join sides to STRING (the documented UUID/STRING drift guard)', () => {
    expect(TRUST_RANK_CASE_SQL).toMatch(/a\.signature_id::STRING = s\.id::STRING/);
  });

  it('is parameterized by exactly one signature id', () => {
    expect(sql).toMatch(/\$1/);
    expect(sql).not.toMatch(/\$2/);
  });
});

describe('applyTrustRank', () => {
  const calls: Array<{ text: string; params?: any[] }> = [];
  const executor = {
    async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
      calls.push({ text, params });
      return { unicode_sort_key: TRUST_RANK.FULLY_VALIDATED } as T;
    },
    async execute(text: string, params?: any[]): Promise<void> {
      calls.push({ text, params });
    },
  };

  it('reads the ladder, writes signatures, then mirrors onto petition_signs', async () => {
    calls.length = 0;
    const rank = await applyTrustRank(executor, 'sig-uuid-1');
    expect(rank).toBe(TRUST_RANK.FULLY_VALIDATED);
    expect(calls.length).toBe(3);
    expect(calls[0].text).toMatch(/FROM signatures s/);
    expect(calls[1].text).toMatch(/UPDATE signatures SET unicode_sort_key = \$1/);
    expect(calls[1].params).toEqual([TRUST_RANK.FULLY_VALIDATED, 'sig-uuid-1']);
    expect(calls[2].text).toMatch(/UPDATE petition_signs/);
    expect(calls[2].text).toMatch(/sign_hash = \(SELECT public_reference FROM signatures/);
  });

  it('falls back to RECORDED when the signature row is missing', async () => {
    const rank = await applyTrustRank(
      {
        async queryOne() { return null; },
        async execute() {},
      },
      'ghost',
    );
    expect(rank).toBe(TRUST_RANK.RECORDED);
  });
});

describe('the ladder has ONE implementation', () => {
  const validationRoute = read('../routes/validation.ts');
  const authorizationRoute = read('../routes/authorization.ts');

  it('witness-accept path delegates to applyTrustRank', () => {
    expect(validationRoute).toMatch(/import \{ applyTrustRank \} from '\.\.\/db\/trustRanking';/);
    expect(validationRoute).toMatch(/await applyTrustRank\(tx, link\.signature_id\)/);
  });

  it('authorization path delegates to applyTrustRank', () => {
    expect(authorizationRoute).toMatch(/import \{ applyTrustRank \} from '\.\.\/db\/trustRanking';/);
    expect(authorizationRoute).toMatch(/await applyTrustRank\(db, signature\.id\)/);
  });

  it('no route re-implements the tier ladder inline', () => {
    for (const [name, src] of [['validation.ts', validationRoute], ['authorization.ts', authorizationRoute]] as const) {
      expect(src, name).not.toMatch(/THEN 1000/);
      expect(src, name).not.toMatch(/WHEN sign_method = 'TELEGRAM'/);
    }
  });
});
