/**
 * Voice of Gudalur — public trust ranking for a civic signature.
 *
 * `signatures.unicode_sort_key` is the campaign's public "higher = more trusted"
 * ordering (migration 020). It used to be computed inline in ONE place — the
 * witness-accept path (`routes/validation.ts`) — which meant any other flow that
 * raised a signature's evidence (a Google/Telegram authorization) either had to
 * duplicate the CASE expression or would silently DOWNGRADE the key on the next
 * witness validation. Both now go through `applyTrustRank`, so a signature can
 * only ever move up the ladder.
 *
 * The ladder (each rung is a documented claim, never "one phone = one human" —
 * see CIVIC_SIGNATURE_PROTOCOL.md §2):
 *
 *   2000  Google + Telegram(mobile) + community witness   → fully validated
 *   1500  Google + Telegram(mobile)                       → both authentications
 *   1000  Telegram(mobile) + witness validation           → legacy sign_method tier
 *    800  Google + witness validation                     → legacy sign_method tier
 *    500  Telegram(mobile) alone                          → legacy sign_method tier
 *    300  Google alone                                    → legacy sign_method tier
 *    200  community witness validation alone
 *    100  signature recorded
 *
 * "Telegram(mobile)" is an authorization whose shared number MATCHED the
 * resident's registered number — Telegram is offered as mobile-number
 * validation, so a Telegram account that never shared a number earns no rung
 * (it is still recorded and still audited; see routes/authorization.ts).
 *
 * LEGACY: the `sign_method = 'TELEGRAM' | 'GOOGLE'` branches are kept so rows
 * written by earlier flows (or by an older client) keep their tier. The web
 * signing flow always writes 'GD_ID'; authorizations are what move the ladder.
 */

/** Minimal client surface — satisfied by both the `db` facade and a `TxClient`. */
export interface TrustRankExecutor {
  queryOne: <T = any>(text: string, params?: any[]) => Promise<T | null>;
  execute: (text: string, params?: any[]) => Promise<void>;
}

export const TRUST_RANK = {
  FULLY_VALIDATED: 2000,
  BOTH_AUTHORIZED: 1500,
  LEGACY_TELEGRAM_VALIDATED: 1000,
  LEGACY_GOOGLE_VALIDATED: 800,
  LEGACY_TELEGRAM_AUTHORIZED: 500,
  LEGACY_GOOGLE_AUTHORIZED: 300,
  COMMUNITY_VALIDATED: 200,
  RECORDED: 100,
} as const;

export type TrustRank = (typeof TRUST_RANK)[keyof typeof TRUST_RANK];

/**
 * Correlated EXISTS for one provider authorization of the row aliased `s`.
 *
 * Both sides cast to STRING on purpose: migration 020 declared
 * `validation_links.signature_id` as STRING while `signatures.id` is UUID, and a
 * column-to-column comparison of two different declared types fails at PLAN time
 * (the HTTP 500 that hit every witness link). `signature_authorizations`
 * declares UUID, but the cast keeps this expression correct on a database whose
 * `signatures.id` drifted the other way.
 */
function authorizedSql(provider: 'google' | 'telegram', requirePhoneMatch = false): string {
  const phone = requirePhoneMatch ? '\n           AND a.phone_matched = true' : '';
  return (
    `EXISTS (SELECT 1 FROM signature_authorizations a\n` +
    `           WHERE a.signature_id::STRING = s.id::STRING\n` +
    `             AND a.provider = '${provider}'${phone})`
  );
}

/**
 * The ladder, as a SQL expression over a `signatures` row aliased `s`.
 * Exported for tests and for any future reporting query — never re-implement it.
 */
export const TRUST_RANK_CASE_SQL = `CASE
         WHEN ${authorizedSql('google')} AND ${authorizedSql('telegram', true)} AND s.validation_count > 0 THEN ${TRUST_RANK.FULLY_VALIDATED}
         WHEN ${authorizedSql('google')} AND ${authorizedSql('telegram', true)} THEN ${TRUST_RANK.BOTH_AUTHORIZED}
         WHEN (${authorizedSql('telegram', true)} OR s.sign_method = 'TELEGRAM') AND s.validation_count > 0 THEN ${TRUST_RANK.LEGACY_TELEGRAM_VALIDATED}
         WHEN (${authorizedSql('google')} OR s.sign_method = 'GOOGLE') AND s.validation_count > 0 THEN ${TRUST_RANK.LEGACY_GOOGLE_VALIDATED}
         WHEN (${authorizedSql('telegram', true)} OR s.sign_method = 'TELEGRAM') THEN ${TRUST_RANK.LEGACY_TELEGRAM_AUTHORIZED}
         WHEN (${authorizedSql('google')} OR s.sign_method = 'GOOGLE') THEN ${TRUST_RANK.LEGACY_GOOGLE_AUTHORIZED}
         WHEN s.validation_count > 0 THEN ${TRUST_RANK.COMMUNITY_VALIDATED}
         ELSE ${TRUST_RANK.RECORDED}
       END`;

/** Reads the ladder value for one signature (no write). */
export function trustRankSelectSql(): string {
  return `SELECT ${TRUST_RANK_CASE_SQL} AS unicode_sort_key
       FROM signatures s
       WHERE s.id = $1`;
}

/**
 * Recalculate `unicode_sort_key` from the signature's CURRENT evidence and mirror
 * the result onto the source `petition_signs` row (the public ledger reads the
 * mirror). Returns the new rank.
 *
 * Must be called AFTER the evidence it reads has been written — the witness
 * accept path bumps `validation_count` first, the authorization path inserts the
 * `signature_authorizations` row first.
 */
export async function applyTrustRank(
  executor: TrustRankExecutor,
  signatureId: string,
): Promise<number> {
  const row = await executor.queryOne<{ unicode_sort_key: number | string | null }>(
    trustRankSelectSql(),
    [signatureId],
  );
  const rank = Number(row?.unicode_sort_key ?? TRUST_RANK.RECORDED);
  await executor.execute('UPDATE signatures SET unicode_sort_key = $1 WHERE id = $2', [
    rank,
    signatureId,
  ]);
  // petition_signs is matched by signatures.public_reference = petition_signs.sign_hash.
  await executor.execute(
    `UPDATE petition_signs
        SET unicode_sort_key = $1
      WHERE sign_hash = (SELECT public_reference FROM signatures WHERE id = $2)`,
    [rank, signatureId],
  );
  return rank;
}
