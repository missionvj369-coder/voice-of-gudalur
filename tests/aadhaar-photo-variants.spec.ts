import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Aadhaar PHOTO-UPLOAD variant matrix — proves the photo route works across
 * real-world image conditions, all through the app's actual file input:
 *
 *   original PNG → JPEG conversion → mobile-sized JPEG (480px)
 *   → rotated 90° JPEG → slightly compressed JPEG (q=0.45)
 *   → NOT-A-QR image (negative: must show actionable guidance, never dead-end)
 *
 * Variants are produced in-browser via <canvas> from the committed synthetic
 * QR fixture (no real PII). Each upload must reach the Verified screen with
 * the decoded resident fields, or (negative case) a stage-specific error.
 */
const FIXTURE = path.join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures', 'aadhaar_secure_qr.png');
const FIXTURE_URL = '/__test_fixture__/aadhaar_secure_qr.png';

async function openRegisterModal(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#root > *', { timeout: 30_000 });
  await page.locator('header .cursor-pointer').first().click();
  await expect(page.getByTestId('photo-scan-button')).toBeVisible({ timeout: 15_000 });
}

async function serveFixture(page: Page) {
  await page.route(FIXTURE_URL, (route) =>
    route.fulfill({ path: FIXTURE, contentType: 'image/png' }),
  );
}

interface Variant { name: string; mime: string; b64: string }

/** Render the fixture into common photo conditions, inside the browser. */
async function makeVariants(page: Page): Promise<Variant[]> {
  return page.evaluate(async (url): Promise<Variant[]> => {
    const res = await fetch(url);
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const out: Variant[] = [];
    const toB64 = (canvas: HTMLCanvasElement, mime: string, quality?: number) =>
      canvas.toDataURL(mime, quality).split(',')[1];

    // Original PNG.
    const c0 = document.createElement('canvas');
    c0.width = bmp.width; c0.height = bmp.height;
    c0.getContext('2d')!.drawImage(bmp, 0, 0);
    out.push({ name: 'original.png', mime: 'image/png', b64: toB64(c0, 'image/png') });

    // JPEG conversion.
    const c1 = document.createElement('canvas');
    c1.width = bmp.width; c1.height = bmp.height;
    c1.getContext('2d')!.drawImage(bmp, 0, 0);
    out.push({ name: 'converted.jpg', mime: 'image/jpeg', b64: toB64(c1, 'image/jpeg', 0.85) });

    // Mobile-sized JPEG (~480 px longest side, typical of a compressed share).
    const scale = 480 / Math.max(bmp.width, bmp.height);
    const c2 = document.createElement('canvas');
    c2.width = Math.round(bmp.width * scale); c2.height = Math.round(bmp.height * scale);
    c2.getContext('2d')!.drawImage(bmp, 0, 0, c2.width, c2.height);
    out.push({ name: 'mobile.jpg', mime: 'image/jpeg', b64: toB64(c2, 'image/jpeg', 0.8) });

    // Rotated 90° JPEG (photo taken sideways).
    const c3 = document.createElement('canvas');
    c3.width = bmp.height; c3.height = bmp.width;
    const ctx3 = c3.getContext('2d')!;
    ctx3.translate(c3.width / 2, c3.height / 2);
    ctx3.rotate(Math.PI / 2);
    ctx3.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
    out.push({ name: 'rotated.jpg', mime: 'image/jpeg', b64: toB64(c3, 'image/jpeg', 0.8) });

    // Slightly compressed JPEG (low quality re-save).
    const c4 = document.createElement('canvas');
    c4.width = bmp.width; c4.height = bmp.height;
    c4.getContext('2d')!.drawImage(bmp, 0, 0);
    out.push({ name: 'compressed.jpg', mime: 'image/jpeg', b64: toB64(c4, 'image/jpeg', 0.45) });

    // NOT a QR — plain coloured rectangle (negative case).
    const c5 = document.createElement('canvas');
    c5.width = 400; c5.height = 300;
    const ctx5 = c5.getContext('2d')!;
    ctx5.fillStyle = '#2E7D32';
    ctx5.fillRect(0, 0, 400, 300);
    out.push({ name: 'not-a-qr.png', mime: 'image/png', b64: toB64(c5, 'image/png') });

    return out;
  }, FIXTURE_URL);
}

const VARIANTS: Array<[string, string]> = [
  ['original PNG', 'original.png'],
  ['JPEG conversion', 'converted.jpg'],
  ['mobile-sized JPEG (480px)', 'mobile.jpg'],
  ['rotated 90° JPEG', 'rotated.jpg'],
  ['slightly compressed JPEG (q=0.45)', 'compressed.jpg'],
];

test.describe('Aadhaar photo-upload variants', () => {
  for (const [label, fileName] of VARIANTS) {
    test(`photo upload — ${label} decodes to resident data`, async ({ page }) => {
      await serveFixture(page);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const variants = await makeVariants(page);
      const v = variants.find((x) => x.name === fileName)!;
      expect(v).toBeTruthy();

      await openRegisterModal(page);
      await page.setInputFiles('input#qr-file-input', {
        name: v.name,
        mimeType: v.mime,
        buffer: Buffer.from(v.b64, 'base64'),
      });

      await expect(page.getByTestId('decoded-name')).toHaveText('Gudalur Test', { timeout: 60_000 });
      await expect(page.getByTestId('decoded-last4')).toContainText('1234');
    });
  }

  test('not-a-QR image → actionable error, upload path still available (no dead end)', async ({ page }) => {
    await serveFixture(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const variants = await makeVariants(page);
    const notQr = variants.find((v) => v.name === 'not-a-qr.png')!;

    await openRegisterModal(page);
    await page.setInputFiles('input#qr-file-input', {
      name: notQr.name,
      mimeType: notQr.mime,
      buffer: Buffer.from(notQr.b64, 'base64'),
    });

    // Stage-specific guidance — NOT a raw decoder failure, and never "Verified".
    await expect(page.locator('text=No QR found in this photo').first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('decoded-name')).toHaveCount(0);
    // The photo path remains available — user can retry immediately.
    await expect(page.getByTestId('photo-scan-button')).toBeVisible();
  });
});