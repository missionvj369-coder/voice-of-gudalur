import { test, expect, type Page } from '@playwright/test';

/**
 * Witness funnel — what a SHARED validation link must do to the intro overlay.
 *
 * `/validate/<token>` is the one deep link that needs a resident account, so
 * App.tsx decides about the intro from the locally-cached resident card *before
 * the first paint* (AuthContext's async session restore lands far too late to be
 * what that decision waits for):
 *
 *   • a resident already on this device — no intro at all, straight to the screen
 *     the link points at;
 *   • a brand-new visitor — the normal introduction still plays, and finishing it
 *     hands them the registration form instead of a login gate.
 *
 * These assertions are hermetic: an UNKNOWN token makes the API answer 404, so no
 * account, signature, session or write of any kind is required — only the two
 * intro outcomes are under test.
 */

const PROFILE_KEY = 'VoiceOfGudalur_resident_profile';
const UNKNOWN_TOKEN = 'playwright-witness-funnel-unknown-token';
/**
 * The validate screen's own verdict card. An unknown token makes the API answer
 * 404 → "no longer active"; if the API cannot be reached (no DB, offline) the
 * same card renders as "Could not open …" with a retry. Either way the intro
 * must not be covering it — which is what this file is about.
 */
const VERDICT_CARD = /This validation link is no longer active|Could not open this validation link/i;

/** Seed the resident card exactly as AuthContext caches it (GD-YYYY-XXXXXX). */
async function seedRegisteredResident(page: Page) {
  await page.addInitScript((key: string) => {
    localStorage.setItem(key, JSON.stringify({
      gudalurId: 'GD-2026-0A1B2C',
      name: 'Funnel Test Witness',
      phone: '9000000001',
    }));
  }, PROFILE_KEY);
}

/** Play the intro to the end: language → concern → intro → cost → open. */
async function completeIntro(page: Page) {
  await page.getByRole('button', { name: /Continue in English/ }).click();
  await page.getByRole('button', { name: /தொடரவும்/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Open Voice of Gudalur' }).click();
}

/** Count the intro → validate-page hand-off events this page receives. */
async function countWitnessHandoffs(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __vogWitnessHandoffs?: number }).__vogWitnessHandoffs ?? 0);
}

test.describe('Witness validation link', () => {
  test('a resident already on this device never sees the intro', async ({ page }) => {
    await seedRegisteredResident(page);
    await page.goto(`/validate/${UNKNOWN_TOKEN}`, { waitUntil: 'domcontentloaded' });

    // The link's own verdict, straight away — and nothing covering it.
    await expect(page.getByRole('heading', { name: VERDICT_CARD }))
      .toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('dialog', { name: 'Welcome' })).toHaveCount(0);
  });

  test('a brand-new visitor gets the intro, then the validate screen', async ({ page }) => {
    // Observe the hand-off the intro performs when it ends (the flag ValidatePage
    // consumes, and the event it listens for).
    await page.addInitScript(() => {
      const w = window as unknown as { __vogWitnessHandoffs?: number };
      w.__vogWitnessHandoffs = 0;
      window.addEventListener('vog:witness-register', () => {
        w.__vogWitnessHandoffs = (w.__vogWitnessHandoffs ?? 0) + 1;
      });
    });
    await page.goto(`/validate/${UNKNOWN_TOKEN}`, { waitUntil: 'domcontentloaded' });

    const intro = page.getByRole('dialog', { name: 'Welcome' });
    await expect(intro).toBeVisible({ timeout: 30_000 });

    await completeIntro(page);

    // Intro gone, and the link the visitor came for is what they are left with.
    await expect(intro).toHaveCount(0);
    await expect(page.getByRole('heading', { name: VERDICT_CARD }))
      .toBeVisible({ timeout: 15_000 });

    // The funnel is wired: ending the intro asked for registration, and the
    // validate page consumed that request (its listener clears the one-shot flag).
    expect(await countWitnessHandoffs(page)).toBe(1);
    expect(await page.evaluate(() => sessionStorage.getItem('vog_witness_register'))).toBeNull();
  });
});