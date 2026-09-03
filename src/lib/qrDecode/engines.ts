// Voice of Gudalur — multi-engine QR decode layer.
//
// Three independent readers, ordered fast→robust:
//   1. BarcodeDetector — native (Chromium/Android), zero-cost, instant.
//   2. ZBar-wasm     — best-in-class for dense/low-quality codes.
//   3. jsQR          — pure-JS fallback, no WASM, works everywhere.
//
// Each engine is lazy-loaded so the heavy WASM only enters the bundle when a
// decode actually needs it. Failures are warned-once so production issues are
// diagnosable from the console without flooding it.

import type { QrDecodeHit } from "./types";

/* engine 1 — native BarcodeDetector (Chromium) */
let nativeDetector: BarcodeDetectorLike | null | undefined;

interface DetectedBarcodeLike { rawValue: string }
interface BarcodeDetectorLike { detect(source: ImageBitmapSource): Promise<DetectedBarcodeLike[]> }

export function getNativeDetector(): BarcodeDetectorLike | null {
  if (nativeDetector !== undefined) return nativeDetector;
  try {
    const Ctor = (globalThis as { BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
    nativeDetector = Ctor ? new Ctor({ formats: ["qr_code"] }) : null;
  } catch { nativeDetector = null; }
  return nativeDetector;
}

/* engine 2 — ZBar over WASM */
let zbarLoadWarned = false;
async function zbarDecode(img: ImageData): Promise<string | null> {
  try {
    const { scanImageData } = await import("@undecaf/zbar-wasm");
    const symbols = await scanImageData(img);
    for (const s of symbols) { const text = s.decode(); if (text) return text; }
  } catch (e) {
    if (!zbarLoadWarned) { zbarLoadWarned = true; console.warn("[qr] ZBar-wasm unavailable — continuing with jsQR:", e); }
  }
  return null;
}

/* engine 3 — jsQR (pure JS) */
let jsqrLoadWarned = false;
async function jsqrDecode(img: ImageData): Promise<string | null> {
  try {
    const mod = await import("jsqr");
    const jsQR = mod.default;
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
    return code?.data || null;
  } catch (e) {
    if (!jsqrLoadWarned) { jsqrLoadWarned = true; console.warn("[qr] jsQR unavailable:", e); }
  }
  return null;
}

/** Run all engines over one preprocessed image; return the first hit. */
export async function decodeImageData(img: ImageData, source: ImageBitmapSource): Promise<QrDecodeHit | null> {
  const detector = getNativeDetector();
  if (detector) {
    try { const codes = await detector.detect(source); const raw = codes.find((c) => c.rawValue)?.rawValue; if (raw) return { text: raw, engine: "native" }; } catch { /* fall through */ }
  }
  const zbar = await zbarDecode(img);
  if (zbar) return { text: zbar, engine: "zbar" };
  const jsqr = await jsqrDecode(img);
  if (jsqr) return { text: jsqr, engine: "jsqr" };
  return null;
}
