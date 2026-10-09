/**
 * REAL-DATA FIXTURE for the witness funnel E2E.
 *
 * The "register modal opens after the intro" path needs a VALID, ACTIVE
 * validation token — an unknown token renders the dead-link card and never
 * exercises the live path. So this helper writes a real resident + signature +
 * active validation link into the configured vog_test database, hands back the
 * RAW token the app can open, and removes every row again afterwards.
 *
 * Safety rails:
 *  - Every row carries a unique `e2e-witness-*` marker so cleanup can find it
 *    even if an id changed; afterAll runs even when the test fails.
 *  - The database is the shared dev/test DB (DATABASE_URL → vog_test). Nothing
 *    here touches production data; the fixture is deleted, not disabled.
 *  - `hasTestDatabase()` lets the spec skip cleanly when no DB is configured
 *    (e.g. a CI runner without secrets).
 */
import 'dotenv/config';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Pool } from 'pg';

export function hasTestDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Same digest the server uses (server/security/vouTokens.ts#hashToken). */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export interface WitnessSeed {
  marker: string;
  uid: string;
  phone: string;
  gudalurId: string;
  signatureId: string;
  signHash: string;
  /** The token a real witness would receive in their link. */
  rawToken: string;
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  }
  return pool;
}

/** Play the intro to the end: language → concern → intro → cost → open. */
export async function completeIntro(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: /Continue in English/ }).click();
  await page.getByRole('button', { name: /தொடரவும்/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Open Voice of Gudalur' }).click();
}

export async function seedWitnessToken(): Promise<WitnessSeed> {
  // The Cockroach Cloud endpoint occasionally blips DNS (ENOTFOUND) — retry
  // connection-level failures so a network hiccup doesn't fail the whole run.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await seedWitnessTokenOnce();
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || err?.code || '');
      if (!/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|Connection terminated/i.test(msg)) throw err;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

async function seedWitnessTokenOnce(): Promise<WitnessSeed> {
  const marker = `e2e-witness-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const uid = `e2e-${randomUUID()}`;
  const gudalurId = `GD-2026-${randomBytes(3).toString('hex').toUpperCase()}`;
  const signHash = `VOGE2E-${randomBytes(9).toString('hex').toUpperCase()}`;
  const rawToken = randomBytes(32).toString('base64url');
  const db = getPool();

  // A unique 10-digit mobile (users.phone is UNIQUE — retry the astronomically
  // unlikely collision instead of failing the run).
  let phone = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    phone = `9${Date.now().toString().slice(-9)}`;
    const clash = await db.query('SELECT 1 FROM users WHERE phone = $1', [phone]);
    if (clash.rowCount === 0) break;
    await new Promise((r) => setTimeout(r, 3));
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // 1. The resident who signed.
    await client.query(
      `INSERT INTO users (uid, phone, gudalur_id, name, locality_name, pincode)
       VALUES ($1, $2, $3, $4, $5, '643212')`,
      [uid, phone, gudalurId, `E2E Witness ${marker.slice(-12)}`, 'E2E Test Gudalur'],
    );
    // 2. Their signature — the civic `signatures` row the link points at.
    const sig = await client.query<{ id: string }>(
      `INSERT INTO signatures
         (petition_id, identity_id, public_reference, public_display_mode,
          display_name, area, status, signed_at, sign_method, unicode_sort_key)
       VALUES ('global', $1, $2, 'community', $3, 'E2E Test Gudalur', 'PENDING', now(), 'GD_ID', 100)
       RETURNING id`,
      [uid, signHash, marker],
    );
    const signatureId = sig.rows[0].id;
    // 3. The ACTIVE single-use witness link.
    await client.query(
      `INSERT INTO validation_links (signature_id, token_hash, expires_at, status)
       VALUES ($1, $2, now() + INTERVAL '7 days', 'active')`,
      [signatureId, hashToken(rawToken)],
    );
    await client.query('COMMIT');
    return { marker, uid, phone, gudalurId, signatureId, signHash, rawToken };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* already closed */ }
    throw err;
  } finally {
    client.release();
  }
}

/** Best-effort removal of EVERYTHING the seed created — safe to call twice. */
export async function cleanupWitnessSeed(seed: WitnessSeed | null): Promise<void> {
  if (!seed) return;
  const db = getPool();
  try {
    // Links/witnesses/authorizations reference the signature by STRING (see the
    // documented UUID/STRING drift) — cast both sides like the routes do.
    await db.query(
      `DELETE FROM validation_links WHERE signature_id::STRING = $1::STRING`,
      [seed.signatureId],
    );
    await db.query(
      `DELETE FROM validation_witnesses WHERE signature_id::STRING = $1::STRING`,
      [seed.signatureId],
    );
    await db.query(
      `DELETE FROM signature_authorizations WHERE signature_id::STRING = $1::STRING`,
      [seed.signatureId],
    );
    await db.query(`DELETE FROM signatures WHERE id::STRING = $1::STRING`, [seed.signatureId]);
    // Belt and braces: anything left carrying the unique marker.
    await db.query(`DELETE FROM signatures WHERE display_name = $1`, [seed.marker]);
    await db.query(`DELETE FROM users WHERE uid = $1`, [seed.uid]);
    await db.query(`DELETE FROM users WHERE phone = $1`, [seed.phone]);
  } catch (err) {
    console.warn('[witness-seed] cleanup failed (rows carry the marker):', err);
  }
}

export async function closeTestPool(): Promise<void> {
  if (pool) {
    const p = pool;
    pool = null;
    await p.end().catch(() => { /* best effort */ });
  }
}