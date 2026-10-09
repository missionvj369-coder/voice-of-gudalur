import { test, expect } from '@playwright/test';
import {
  hasTestDatabase,
  seedWitnessToken,
  cleanupWitnessSeed,
  closeTestPool,
  completeIntro,
  type WitnessSeed,
} from './helpers/witnessDb';

/**
 * THE LIVE WITNESS FUNNEL — a REAL, ACTIVE validation token.
 *
 * tests/witness-funnel.spec.ts proves the intro hand-off with an UNKNOWN token
 * (hermetic: no DB, no account, no write). That deliberately leaves the most
 * important path unasserted: a witness opening a link that actually WORKS. This
 * spec closes that gap for real:
 *
 *   a real resident + signature + ACTIVE validation link is written to the
 *   configured vog_test database, the browser opens /validate/<real token>, the
 *   intro plays for the brand-new visitor, and when it ends THE REGISTRATION
 *   FORM IS OPEN ON SCREEN — with the live signature (Sign & Validate) behind
 *   it, and with NO Google/Telegram sign-in offered at registration.
 *
 * Every seeded row carries an `e2e-witness-*` marker and is DELETED again in
 * afterAll (which runs even when the test fails). Skips cleanly when no
 * DATABASE_URL is configured.
 */

let seed: WitnessSeed | null = null;

test.beforeAll(async () => {
  test.skip(!hasTestDatabase(), 'vog_test database not configured (no DATABASE_URL)');
  seed = await seedWitnessToken();
});

test.afterAll(async () => {
  await cleanupWitnessSeed(seed);
  await closeTestPool();
});

test('a real validation token: intro plays, then the registration form opens over the live signature', async ({ page }) => {
  test.skip(!seed, 'no seeded fixture');
  const fixture = seed!;

  await page.goto(`/validate/${fixture.rawToken}`, { waitUntil: 'domcontentloaded' });

  // Brand-new visitor → the introduction still plays.
  const intro = page.getByRole('dialog', { name: 'Welcome' });
  await expect(intro).toBeVisible({ timeout: 30_000 });
  await completeIntro(page);
  await expect(intro).toHaveCount(0);

  // THE PAYOFF — previously un-E2E-asserted: the intro's hand-off opens the
  // registration form by itself. The witness is on a real, ACTIVE link, so this
  // is the exact screen a stranger on WhatsApp sees.
  const registerDialog = page.getByRole('dialog', { name: /Digital Supporter ID/ });
  await expect(registerDialog).toBeVisible({ timeout: 15_000 });

  // It is the REGISTRATION form (name + mobile), not a login gate. Anchored to
  // the label text itself — the form's note and footer also mention a mobile
  // number, and getByText substring-matches them otherwise.
  await expect(registerDialog.getByText(/^Full Name \*$/)).toBeVisible();
  await expect(registerDialog.getByText(/^Mobile Number \*$/)).toBeVisible();

  // REGISTRATION IS SOCIAL-FREE: Google/Telegram are authentication +
  // verification offered AFTER signing — never on the registration form.
  await expect(registerDialog.getByRole('button', { name: 'Google' })).toHaveCount(0);
  await expect(registerDialog.getByRole('button', { name: 'Telegram' })).toHaveCount(0);
  await expect(registerDialog.getByText(/are not used to register/i)).toBeVisible();

  // And behind the modal, the link is ALIVE — the live signature's verdict:
  // the auth gate names the seeded signature (its display_name), and the
  // confirm action is one tap away. (The "Token:" footer only renders for an
  // already-logged-in resident; this visitor is registering first.)
  await expect(page.getByText(fixture.marker)).toBeVisible();
  await expect(page.getByRole('button', { name: /Sign & Validate/ })).toBeVisible();
});