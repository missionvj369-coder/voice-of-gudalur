// Voice of Gudalur — multi-engine, on-device QR extraction from photos.
//
// Built for the hard case: dense Version-25+ Aadhaar Secure QRs
// (~129-145 modules/side) photographed on low-end phone cameras with blur,
// dim light, glare and uneven contrast.
//
// Engines (ALL run locally in the browser — zero network, zero PII leaves
// the device, preserving the project's privacy-first guarantee):
//   1. native BarcodeDetector (Chromium/Android — fastest when present)
//   2. ZBar via WebAssembly (@undecaf/zbar-wasm) — best-in-class for dense,
//      low-quality QRs; the same engine pyzbar-based Aadhaar tools use
//   3. jsQR (pure JS, full-resolution ImageData, no sampling blind spots)
//
// Each engine is tried over a ladder of image variants (scale ladder →
// Otsu binarization → unsharp sharpening) until one decodes.

export interface DecodeProgress {
  (msg: string): void;
}

export interface QrDecodeHit {
  text: string;
  engine: string;
}

/* ======================= pure helpers (unit-tested) ======================= */

/**
 * Scale ladder for photo decoding. Aadhaar secure QRs are Version-25+ codes
 * (~129-145 modules/side) — they only resolve when the photo is scaled so the
 * QR spans roughly 500-1600 px. We try the native size first (sharpest), then
 * step down; small images get an upscale attempt too.
 */
export function planDecodeVariants(w: number, h: number): number[] {
  const longest = Math.max(1, Math.max(w, h));
  // Never upscale past the native size — above `longest` only adds blur — and
  // cap huge photos (12MP+) at 2560px: at native size a 4000px photo would
  // blow a ~48MB canvas, enough to OOM a low-end Android. 2560px is plenty for
  // a QR to resolve and keeps memory/timing sane across all devices.
  const LONGEST_WORKABLE = 2560;
  const top = Math.min(longest, LONGEST_WORKABLE);
  const ladder = [top, 2200, 1600, 1200, 900, 640, 440].filter((s) => s <= top);
  if (top < 700) {
    // Small shots (thumbnails/screenshots): try a meaningful upscale once.
    ladder.unshift(Math.max(300, Math.min(1400, top * 2)));
  }
  return [...new Set(ladder)].sort((a, b) => b - a);
}

/** Rec.601 luma per pixel from an RGBA buffer (1 byte per pixel). */
export function grayscaleFromRgba(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const n = rgba.length >> 2;
  const gray = new Uint8ClampedArray(n);
  for (let i = 0, j = 0; j < n; i += 4, j++) {
    gray[j] = (19595 * rgba[i] + 38469 * rgba[i + 1] + 7472 * rgba[i + 2]) >> 16;
  }
  return gray;
}

/**
 * Otsu's method — pick the grayscale threshold that maximises between-class
 * variance. This is what rescues dim / unevenly-lit photos: after adaptive
 * binarization at this threshold, a barely-readable QR becomes pure black/white.
 */
export function otsuThreshold(gray: Uint8ClampedArray): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  if (total === 0) return 128;

  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let best = 0;
  let bestVar = -1;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    // `>=` selects the LAST maximizing t — the upper edge of the dark class.
    // With `>` a quantized bimodal image (e.g. pixels exactly at both modes)
    // would return the dark value itself, and binarizeGray's strict `>`
    // would then erase the entire dark class to black.
    if (between >= bestVar) {
      bestVar = between;
      best = t;
    }
  }
  return best;
}

/** Apply a threshold to a grayscale buffer → pure black/white (0/255). */
export function binarizeGray(gray: Uint8ClampedArray, threshold: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length);
  for (let i = 0; i < gray.length; i++) out[i] = gray[i] > threshold ? 255 : 0;
  return out;
}

/**
 * Unsharp mask (3x3 box blur, amount-scaled) on a grayscale buffer —
 * rescues slightly-out-of-focus photos. Flat areas come back unchanged;
 * edges get locally amplified.
 */
export function unsharpGray(
  gray: Uint8ClampedArray,
  w: number,
  h: number,
  amount = 0.9
): Uint8ClampedArray {
  if (w < 3 || h < 3) return gray;
  const blurred = new Uint8ClampedArray(gray.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const avg =
        (gray[i - w - 1] + gray[i - w] + gray[i - w + 1] +
          gray[i - 1] + gray[i] + gray[i + 1] +
          gray[i + w - 1] + gray[i + w] + gray[i + w + 1]) / 9;
      blurred[i] = avg;
    }
  }
  // Leave the 1px border as-is (blur skipped it there).
  for (let x = 0; x < w; x++) {
    blurred[x] = gray[x];
    blurred[(h - 1) * w + x] = gray[(h - 1) * w + x];
  }
  for (let y = 0; y < h; y++) {
    blurred[y * w] = gray[y * w];
    blurred[y * w + w - 1] = gray[y * w + w - 1];
  }
  const out = new Uint8ClampedArray(gray.length);
  for (let i = 0; i < gray.length; i++) {
    out[i] = gray[i] + amount * (gray[i] - blurred[i]);
  }
  return out;
}

/* ===================== engines (all local, lazy-loaded) ===================== */

interface DetectedBarcodeLike {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<DetectedBarcodeLike[]>;
}

/** Native BarcodeDetector (Chromium) — null when unsupported. */
let nativeDetector: BarcodeDetectorLike | null | undefined;
function getNativeDetector(): BarcodeDetectorLike | null {
  if (nativeDetector !== undefined) return nativeDetector;
  try {
    const Ctor = (
      globalThis as {
        BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike;
      }
    ).BarcodeDetector;
    nativeDetector = Ctor ? new Ctor({ formats: ["qr_code"] }) : null;
  } catch {
    nativeDetector = null;
  }
  return nativeDetector;
}

/** ZBar over WASM — lazily imported so the ~100KB wasm loads only when needed. */
async function zbarDecode(img: ImageData): Promise<string | null> {
  try {
    const { scanImageData } = await import("@undecaf/zbar-wasm");
    const symbols = await scanImageData(img);
    for (const s of symbols) {
      const text = s.decode();
      if (text) return text;
    }
  } catch {
    /* wasm unavailable / no symbol — fall through */
  }
  return null;
}

/** jsQR — pure JS, reads the full-resolution RGBA buffer. */
async function jsqrDecode(img: ImageData): Promise<string | null> {
  try {
    const mod = await import("jsqr");
    const jsQR = mod.default;
    const code = jsQR(img.data, img.width, img.height, {
      inversionAttempts: "attemptBoth",
    });
    return code?.data || null;
  } catch {
    return null;
  }
}

/** Native detector (passes the real canvas) first, then ZBar, then jsQR. */
async function decodeImageData(
  img: ImageData,
  canvas: ImageBitmapSource
): Promise<QrDecodeHit | null> {
  const detector = getNativeDetector();
  if (detector) {
    try {
      const codes = await detector.detect(canvas);
      const raw = codes.find((c) => c.rawValue)?.rawValue;
      if (raw) return { text: raw, engine: "BarcodeDetector" };
    } catch {
      /* keep trying other engines */
    }
  }
  const zbar = await zbarDecode(img);
  if (zbar) return { text: zbar, engine: "ZBar-wasm" };
  const jsqr = await jsqrDecode(img);
  if (jsqr) return { text: jsqr, engine: "jsQR" };
  return null;
}

/**
 * Decode a single live-camera frame.
 * Light pass (every frame): native BarcodeDetector reads the video element
 * directly — cheapest and fastest on Chromium.
 * Heavy pass (every other frame): draw to canvas (≤1280px) and run the full
 * ZBar-wasm → jsQR chain on the pixels.
 */
export async function decodeVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  heavy: boolean
): Promise<QrDecodeHit | null> {
  const detector = getNativeDetector();
  if (detector) {
    try {
      const codes = await detector.detect(video);
      const raw = codes.find((c) => c.rawValue)?.rawValue;
      if (raw) return { text: raw, engine: "BarcodeDetector" };
    } catch {
      /* fall through to the canvas engines */
    }
  }
  if (!heavy) return null;
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;
  const scale = Math.min(1, 1280 / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, cw, ch);
  const img = ctx.getImageData(0, 0, cw, ch);
  return decodeImageData(img, canvas);
}

/* ========================= DOM-dependent pipeline ========================= */

type PhotoBitmap = ImageBitmap | HTMLImageElement;

async function loadPhotoBitmap(file: File): Promise<PhotoBitmap> {
  if (typeof createImageBitmap === "function") {
    try {
      // iOS Safari can silently hang createImageBitmap on some HEIC/EXIF
      // images — race it against a timeout so we fall back to <img>.
      const bitmap = await Promise.race([
        createImageBitmap(file),
        new Promise<never>((_, rej) =>
          window.setTimeout(() => rej(new Error("createImageBitmap timeout")), 3000)
        ),
      ]);
      return bitmap;
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Unsupported image"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function bitmapSize(src: PhotoBitmap): { w: number; h: number } {
  return "naturalWidth" in src
    ? { w: src.naturalWidth, h: src.naturalHeight }
    : { w: src.width, h: src.height };
}

function renderImageData(
  src: PhotoBitmap,
  maxSide: number
): { img: ImageData; ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement } | null {
  const { w: sw, h: sh } = bitmapSize(src);
  if (!sw || !sh) return null;
  // Cap the working dimension: a QR only needs ~500-1600px to resolve, and
  // a 12MP phone photo at native size would blow a 48MB canvas — enough to
  // OOM a low-end Android. 2560px is plenty and keeps memory/timing sane.
  const LONGEST_WORKABLE = 2560;
  const scale = Math.min(1, Math.min(maxSide, LONGEST_WORKABLE) / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, w, h);
  return { img: ctx.getImageData(0, 0, w, h), ctx, canvas };
}

/** Rebuild a derived grayscale buffer as an ImageData (R=G=B=gray). */
function grayToImageData(
  ctx: CanvasRenderingContext2D,
  gray: Uint8ClampedArray,
  w: number,
  h: number
): ImageData {
  const out = ctx.createImageData(w, h);
  for (let i = 0, j = 0; j < gray.length; i += 4, j++) {
    out.data[i] = gray[j];
    out.data[i + 1] = gray[j];
    out.data[i + 2] = gray[j];
    out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return out;
}

/**
 * Master photo decoder — engines × variants until one hits.
 * Variant passes: 1) raw at each scale, 2) Otsu-binarized, 3) sharpened.
 * Hard caps keep worst-case photos under ~25 s instead of spinning forever.
 */
export async function decodePhotoQr(
  file: File,
  onProgress?: DecodeProgress
): Promise<QrDecodeHit | null> {
  let bitmap: PhotoBitmap;
  try {
    bitmap = await loadPhotoBitmap(file);
  } catch {
    return null;
  }
  const { w, h } = bitmapSize(bitmap);
  if (!w || !h) return null;

  const scales = planDecodeVariants(w, h);
  const started = Date.now();
  const TIME_CAP_MS = 25_000;
  let attempts = 0;
  const ATTEMPT_CAP = 30;

  const runPass = async (
    label: string,
    derive: (img: ImageData, ctx: CanvasRenderingContext2D) => ImageData
  ): Promise<QrDecodeHit | null> => {
    for (const maxSide of scales) {
      if (attempts >= ATTEMPT_CAP || Date.now() - started > TIME_CAP_MS) return null;
      const rendered = renderImageData(bitmap, maxSide);
      if (!rendered) continue;
      attempts++;
      onProgress?.(
        `Analyzing photo — ${label}, ${rendered.img.width}×${rendered.img.height} (pass ${attempts})…`
      );
      const derived = derive(rendered.img, rendered.ctx);
      // The detector prefers a real canvas element (not raw ImageData) for
      // max compatibility across Chrome / Samsung Internet / in-app browsers;
      // binarize/sharpen passes update rendered.canvas in place via putImageData.
      const source = rendered.canvas;
      const hit = await decodeImageData(derived, source);
      if (hit) return hit;
    }
    return null;
  };

  // Pass 1 — raw photo at each scale (hits most decent photos).
  const raw = await runPass("original", (img) => img);
  if (raw) return raw;

  // Pass 2 — Otsu binarization (dim / uneven lighting).
  const bin = await runPass("contrast", (img, ctx) => {
    const gray = grayscaleFromRgba(img.data);
    const bw = binarizeGray(gray, otsuThreshold(gray));
    return grayToImageData(ctx, bw, img.width, img.height);
  });
  if (bin) return bin;

  // Pass 3 — unsharp sharpening (slight blur).
  const sharp = await runPass("sharpen", (img, ctx) => {
    const gray = grayscaleFromRgba(img.data);
    const us = unsharpGray(gray, img.width, img.height);
    return grayToImageData(ctx, us, img.width, img.height);
  });
  if (sharp) return sharp;

  return null;
}
