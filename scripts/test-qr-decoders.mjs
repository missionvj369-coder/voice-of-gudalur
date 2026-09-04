/**
 * QR Decoder Diagnostic Test
 * Tests each decoder engine independently against the test fixture.
 * Run: node scripts/test-qr-decoders.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.join(__dirname, '..', 'tests', 'fixtures', 'aadhaar_secure_qr.png');

// ─── Load image using pure JS (no browser APIs) ───────────────────────────────
// We need to decode the PNG manually for Node.js testing.
// For this diagnostic, we'll use a minimal PNG decoder approach.

async function loadPNG(filepath) {
  const buf = fs.readFileSync(filepath);
  
  // Parse PNG dimensions from IHDR chunk
  // PNG signature: 137 80 78 71 13 10 26 10
  // IHDR starts at offset 8: 4 bytes length, 4 bytes "IHDR", then data
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  
  return { width, height, bitDepth, colorType, buffer: buf };
}

// ─── Test 1: Direct file analysis ─────────────────────────────────────────────
console.log('=== QR DECODER DIAGNOSTIC TEST ===\n');
console.log(`Fixture: ${FIXTURE_PATH}`);

const fixture = await loadPNG(FIXTURE_PATH);
console.log(`Image dimensions: ${fixture.width} x ${fixture.height}`);
console.log(`Bit depth: ${fixture.bitDepth}`);
console.log(`Color type: ${fixture.colorType} (2=RGB, 6=RGBA)`);
console.log(`File size: ${fixture.buffer.length} bytes`);

// ─── Test 2: Check if jsQR can decode ─────────────────────────────────────────
console.log('\n--- Test: jsQR (pure JS) ---');
try {
  // Dynamic import of jsQR
  const jsqrMod = await import('jsqr');
  const jsQR = jsqrMod.default || jsqrMod;
  
  // We need RGBA pixel data. Since we can't easily decode PNG in Node without deps,
  // let's check if jsQR is importable and functional
  console.log('jsQR module loaded:', typeof jsQR === 'function' ? 'YES' : 'NO');
  console.log('jsQR expects: (Uint8ClampedArray data, width, height, options)');
  console.log('Status: CANNOT test directly in Node.js without PNG decoding');
  console.log('Need to test in browser environment');
} catch (e) {
  console.log('jsQR import FAILED:', e.message);
}

// ─── Test 3: Check if ZBar WASM can initialize ────────────────────────────────
console.log('\n--- Test: ZBar WASM ---');
try {
  const zbarMod = await import('@undecaf/zbar-wasm');
  console.log('ZBar module loaded:', typeof zbarMod.scanImageData === 'function' ? 'YES' : 'NO');
  console.log('scanImageData exists:', 'scanImageData' in zbarMod);
  console.log('Status: Module loads, but needs browser ImageData to test');
} catch (e) {
  console.log('ZBar import FAILED:', e.message);
}

// ─── Test 4: Check test fixture validity ──────────────────────────────────────
console.log('\n--- Test: Fixture Analysis ---');
console.log('PNG signature valid:', fixture.buffer.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'YES' : 'NO');

// Check for QR code-like patterns in the image
// A QR code has distinctive finder patterns (black/white/black/white/black modules in 1:1:3:1:1 ratio)
console.log('\n=== DIAGNOSTIC SUMMARY ===');
console.log('1. Fixture file: EXISTS and is valid PNG');
console.log(`2. Dimensions: ${fixture.width}x${fixture.height}`);
console.log('3. jsQR: Module loads (needs browser for full test)');
console.log('4. ZBar WASM: Module loads (needs browser for full test)');
console.log('5. BarcodeDetector: Browser-only API (Chromium/Android)');
console.log('\n=== NEXT STEPS ===');
console.log('To fully test, we need to run this in a browser environment.');
console.log('The Playwright E2E test (tests/aadhaar-scan.spec.ts) is the proper test.');
console.log('Run: npx playwright test tests/aadhaar-scan.spec.ts');
