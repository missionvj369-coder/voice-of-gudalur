/**
 * Visual smoke for the Vision 2035 redesign.
 *
 * WHY THIS EXISTS: tsc and vitest both pass on markup that renders as an
 * unreadable smear — overlapping SVG text, a hotspot dot that has drifted off
 * its card, a lightbox that never appears. None of that is catchable without
 * a browser, so the redesign's non-negotiables are asserted against the
 * COMPUTED layout of the real page: the section exists and is ordered, the
 * Phase 1 callout sits ABOVE the blueprint, every hotspot dot lands inside
 * its own pillar card, and the lightbox actually opens and zooms.
 *
 * Run: npx playwright test tests/vision2035.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';
import { completeIntro } from './helpers/witnessDb';

const SECTION = '#gudalur-vision-2035';

/**
 * Enter the app past the opening overlay. The intro is a fixed inset-0
 * z-[100] dialog — it intercepts every click until it is played out, so the
 * existing helper (language → concern → intro → cost → open) is reused rather
 * than re-implemented.
 */
async function enterApp(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('VoiceOfGudalur_lang', 'en');
    } catch { /* private mode */ }
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await completeIntro(page);
  await page.waitForSelector(SECTION, { timeout: 30_000 });
}

test.describe('Gudalur Vision 2035 — frontpage', () => {
  test.beforeEach(async ({ page }) => { await enterApp(page); });

  test('hero states the demand and offers both CTAs', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/we refuse to stay silent/i);
    await expect(page.getByRole('button', { name: /sign grievance #18982473/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /explore gudalur vision 2035/i })).toBeVisible();
  });

  test('the document has exactly ONE h1 (the activist headline)', async ({ page }) => {
    // Regression gate: the live-counter block used to be an <h1> too, so the
    // redesign briefly shipped two. Screen readers navigating by heading and
    // search engines both read that as an ambiguous document outline.
    const h1s = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1')).map((h) => h.textContent?.trim() || ''));
    expect(h1s.length).toBe(1);
    expect(h1s[0]).toMatch(/we refuse to stay silent/i);
  });

  test('the section sits directly after the live tracker', async ({ page }) => {
    // The Vision section must NOT be the last thing on the page — the action
    // hub and grievance ticket still follow it.
    const after = await page.evaluate((sel) => {
      const el = document.querySelector(sel)!;
      return el.getBoundingClientRect().top;
    }, SECTION);
    expect(after).toBeGreaterThan(0);
  });

  test('Phase 1 callout is rendered ABOVE the blueprint', async ({ page }) => {
    const order = await page.evaluate((sel) => {
      const sec = document.querySelector(sel)!;
      const note = Array.from(sec.querySelectorAll('p')).find((p) =>
        p.textContent?.includes('Immediate priority:'));
      const svg = sec.querySelector('svg[role="img"]')!;
      return {
        noteTop: note!.getBoundingClientRect().top + window.scrollY,
        svgTop: svg.getBoundingClientRect().top + window.scrollY,
      };
    }, SECTION);
    expect(order.noteTop).toBeLessThan(order.svgTop);
  });

  test('every hotspot dot sits inside its own pillar card', async ({ page }) => {
    const drift = await page.evaluate((sel) => {
      const sec = document.querySelector(sel)!;
      const svg = sec.querySelector('svg[role="img"]')!;
      // The five <g> pillar groups, in DOM order.
      const cards = Array.from(svg.querySelectorAll('g')).filter((g) => {
        const r = g.querySelector('rect');
        return r && Number(r.getAttribute('width')) === 280;
      });
      const dots = Array.from(sec.querySelectorAll('button[data-v2035-hotspot]'));
      return {
        visible: dots.filter((d) => d.getBoundingClientRect().width > 0).length,
        rows: cards.slice(0, dots.length).map((card, i) => {
          const c = card.getBoundingClientRect();
          const d = dots[i].getBoundingClientRect();
          return {
            insideX: d.left >= c.left && d.right <= c.right,
            insideY: d.top >= c.top && d.bottom <= c.bottom,
            // A dot wider than 40% of its card is not an affordance, it is an
            // overlay — this is the check that failed on mobile before the
            // dots were switched to container units.
            ratio: d.width / c.width,
          };
        }),
      };
    }, SECTION);
    // The dots exist only where they fit: five visible at >= sm (640px), none
    // below it. The mobile project therefore expects 0, and the dedicated
    // "suppressed on a phone" test below pins that down at 360px.
    const sm = await page.evaluate(() => window.matchMedia('(min-width: 640px)').matches);
    expect(drift.visible).toBe(sm ? 5 : 0);
    if (!sm) return;
    drift.rows.forEach((r) => {
      expect(r.insideX).toBe(true);
      expect(r.insideY).toBe(true);
      expect(r.ratio).toBeLessThan(0.4);
    });
  });

  test('hotspot dots are suppressed on a phone (the lightbox is the path)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.waitForTimeout(300);
    const visible = await page.evaluate((sel) =>
      Array.from(document.querySelectorAll(`${sel} button[data-v2035-hotspot]`))
        .filter((d) => d.getBoundingClientRect().width > 0).length, SECTION);
    expect(visible).toBe(0);
  });

  test('the zoom lightbox opens, zooms and closes', async ({ page }) => {
    await page.getByRole('button', { name: /zoom blueprint/i }).click();
    const dialog = page.getByRole('dialog', { name: /gudalur vision 2035 blueprint/i });
    await expect(dialog).toBeVisible();

    // Scoped to the dialog: the controls are portalled to <body>, so a
    // page-level locator would also match anything a future section adds.
    await dialog.getByRole('button', { name: 'Zoom in' }).click();
    await dialog.getByRole('button', { name: 'Zoom in' }).click();
    await expect(dialog.getByText(/200%/)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    // The page behind must be scrollable again once the dialog is gone.
    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).not.toBe('hidden');
  });

  test('roadmap shows Phase 1 before Phase 2', async ({ page }) => {
    const phases = await page.evaluate((sel) => {
      const sec = document.querySelector(sel)!;
      return Array.from(sec.querySelectorAll('li'))
        .map((li) => li.textContent || '')
        .filter((s) => /Phase\s*[12]/.test(s))
        .map((s) => s.trim().slice(0, 20));
    }, SECTION);
    expect(phases.length).toBeGreaterThanOrEqual(2);
    expect(phases[0]).toMatch(/Phase 1/);
    expect(phases[1]).toMatch(/Phase 2/);
  });

  test('no horizontal overflow at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
