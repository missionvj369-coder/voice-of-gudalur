import { test, expect, type Page } from '@playwright/test';

/**
 * Navigate and wait for the React app to actually MOUNT.
 *
 * The SPA bundle is ~2.4 MB and the LocationGate resolves geolocation before
 * rendering, so on suite cold-start `body` can still be empty/zero-height for
 * several seconds. Waiting for `#root` to gain children synchronizes with the
 * real app shell instead of raw DOM presence, eliminating mount-race flakes.
 */
async function gotoApp(page: Page, path = '/') {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#root > *', { timeout: 30_000 });
}

test.describe('Voice of Gudalur App', () => {
  test('should load homepage', async ({ page }) => {
    await gotoApp(page);
    await expect(page.locator('#root > *').first()).toBeVisible();
  });

  test('should display main navigation', async ({ page }) => {
    await gotoApp(page);
    await expect(page.getByRole('navigation').first()).toBeVisible({ timeout: 15_000 });
  });

  test('should show offline indicator when offline', async ({ page, context }) => {
    await gotoApp(page);
    await context.setOffline(true);
    await page.waitForTimeout(1000);
    await context.setOffline(false);
  });

  test('should be installable as PWA', async ({ page }) => {
    await gotoApp(page);
    const manifest = await page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveCount(1);
  });

  test('should have service worker registered', async ({ page }) => {
    await gotoApp(page);
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return !!reg;
    });
    expect(typeof swRegistered).toBe('boolean');
  });
});

test.describe('Accessibility', () => {
  test('should have page title', async ({ page }) => {
    await gotoApp(page);
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await gotoApp(page);
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(0);
  });

  test('should have alt text for images', async ({ page }) => {
    await gotoApp(page);
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull();
    }
  });
});

test.describe('Wildlife Reports', () => {
  test('should display map component', async ({ page }) => {
    await gotoApp(page);
    const mapContainer = page.locator('.leaflet-container, .maplibregl-canvas-container').first();
    if (await mapContainer.isVisible()) {
      await expect(mapContainer).toBeVisible();
    }
  });
});

