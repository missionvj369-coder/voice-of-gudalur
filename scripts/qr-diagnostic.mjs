/**
 * QR Decoder Browser Diagnostic
 * Tests each decoder layer independently in a real browser environment.
 * Run: node scripts/qr-diagnostic.mjs
 */
import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.join(__dirname, '..', 'tests', 'fixtures', 'aadhaar_secure_qr.png');

async function main() {
  console.log('=== QR DECODER BROWSER DIAGNOSTIC ===\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Collect console logs
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[qr]') || text.includes('QR') || text.includes('decoder') || text.includes('BarcodeDetector')) {
      console.log(`  [browser] ${text}`);
    }
  });

  const results = {
    fixture: { path: FIXTURE_PATH },
    barcodeDetector: { available: false, result: null, error: null },
    zbar: { result: null, error: null },
    jsqr: { result: null, error: null },
    preprocessing: { variants: [] },
    finalResult: null,
  };

  try {
    // Navigate to about:blank and run diagnostic
    await page.goto('about:blank');
    
    // Read fixture as base64
    const fs = await import('fs');
    const fixtureBase64 = fs.readFileSync(FIXTURE_PATH).toString('base64');
    
    const diagnosticResult = await page.evaluate(async (fixtureB64) => {
      const result = {};
      
      // 1. Check BarcodeDetector availability
      result.barcodeDetectorAvailable = typeof BarcodeDetector !== 'undefined';
      
      // 2. Load image from base64
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = 'data:image/png;base64,' + fixtureB64;
      });
      
      result.imageWidth = img.naturalWidth;
      result.imageHeight = img.naturalHeight;
      
      // 3. Draw to canvas and get ImageData
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      result.pixelCount = imageData.data.length / 4;
      result.canvasWidth = canvas.width;
      result.canvasHeight = canvas.height;
      
      // 4. Test BarcodeDetector
      if (result.barcodeDetectorAvailable) {
        try {
          const detector = new BarcodeDetector({ formats: ['qr_code'] });
          const codes = await detector.detect(img);
          result.barcodeDetectorResult = codes.length > 0 ? codes[0].rawValue : null;
          result.barcodeDetectorCount = codes.length;
        } catch (e) {
          result.barcodeDetectorError = e.message;
        }
      }
      
      // 5. Test ZBar WASM
      try {
        const { scanImageData } = await import('/node_modules/@undecaf/zbar-wasm/dist/index.js');
        const symbols = await scanImageData(imageData);
        result.zbarResult = symbols.length > 0 ? symbols[0].decode() : null;
        result.zbarCount = symbols.length;
      } catch (e) {
        result.zbarError = e.message;
      }
      
      // 6. Test jsQR
      try {
        const jsqrMod = await import('/node_modules/jsqr/dist/jsQR.js');
        const jsQR = jsqrMod.default || jsqrMod;
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });
        result.jsqrResult = code ? code.data : null;
      } catch (e) {
        result.jsqrError = e.message;
      }
      
      return result;
    }, fixtureBase64);

    console.log('Results:');
    console.log(`  Image: ${diagnosticResult.imageWidth}x${diagnosticResult.imageHeight}`);
    console.log(`  BarcodeDetector available: ${diagnosticResult.barcodeDetectorAvailable}`);
    console.log(`  BarcodeDetector result: ${diagnosticResult.barcodeDetectorResult ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`  BarcodeDetector count: ${diagnosticResult.barcodeDetectorCount || 0}`);
    console.log(`  ZBar result: ${diagnosticResult.zbarResult ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`  ZBar count: ${diagnosticResult.zbarCount || 0}`);
    console.log(`  jsQR result: ${diagnosticResult.jsqrResult ? 'FOUND' : 'NOT FOUND'}`);
    
    if (diagnosticResult.barcodeDetectorError) console.log(`  BarcodeDetector error: ${diagnosticResult.barcodeDetectorError}`);
    if (diagnosticResult.zbarError) console.log(`  ZBar error: ${diagnosticResult.zbarError}`);
    if (diagnosticResult.jsqrError) console.log(`  jsQR error: ${diagnosticResult.jsqrError}`);

  } catch (e) {
    console.error('Diagnostic failed:', e.message);
  } finally {
    await browser.close();
  }
  
  console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

main().catch(console.error);
