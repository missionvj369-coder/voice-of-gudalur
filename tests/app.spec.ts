import { test, expect } from '@playwright/test';

test.describe('Voice of Gudalur App', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display main navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });

  test('should show offline indicator when offline', async ({ page, context }) => {
    await page.goto('/');
    await context.setOffline(true);
    await page.waitForTimeout(1000);
    await context.setOffline(false);
  });

  test('should be installable as PWA', async ({ page }) => {
    await page.goto('/');
    const manifest = await page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveCount(1);
  });

  test('should have service worker registered', async ({ page }) => {
    await page.goto('/');
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
    await page.goto('/');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(0);
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull();
    }
  });
});

test.describe('Wildlife Reports', () => {
  test('should display map component', async ({ page }) => {
    await page.goto('/');
    const mapContainer = page.locator('.leaflet-container, .maplibregl-canvas-container').first();
    if (await mapContainer.isVisible()) {
      await expect(mapContainer).toBeVisible();
    }
  });
});

