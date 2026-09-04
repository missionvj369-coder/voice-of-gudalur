// Voice of Gudalur — smart QR decode pipeline.
//
// The key insight that separates a toy reader from a professional one: don't
// blindly brute-force a fixed chain of enhancements. Instead, MEASURE the
// image once (brightness / contrast / blur / noise), then apply the ONE or
// TWO enhancements that actually address its defects. A dim backlit photo gets
// CLAHE; a half-shadowed photo gets Sauvola local thresholding; a motion-blurred
// frame gets adaptive deblurring. This is both faster (fewer decode attempts)
// and far more likely to succeed on the hard cases.
//
// For live camera: multi-frame temporal fusion averages N frames (noise drops
// as 1/√N) so codes read instantly even in bad light.
// For photos: heavy enhancement runs on a Web Worker pool so scrolling/touch
// stay buttery on the main thread.

import type { QrDecodeHit, DecodeProgress } from "./types";
import {
  assessQuality, grayscaleFromRgba, clahe, otsuThreshold, binarizeGray,
  sauvolaThreshold, unsharpGray, normalizeRange, gammaCorrect, denoiseMedian,
} from "./preprocess";
import { decodeImageData } from "./engines";
import { CameraFusion } from "./cameraFusion";
import { preprocessOnWorker } from "./workerPool";

type PhotoBitmap = ImageBitmap | HTMLImageElement;

/** Shared camera-fusion instance (one per scanner modal). */
export const cameraFusion = new CameraFusion(4);

export async function loadPhotoBitmap(file: File): Promise<PhotoBitmap> {
  if (typeof createImageBitmap === "function") {
    try {
      // Respect EXIF orientation so photos taken sideways aren't processed rotated.
      const bmp = await Promise.race([
        createImageBitmap(file, { imageOrientation: "from-image" }),
        new Promise<never>((_, rej) => window.setTimeout(() => rej(new Error("timeout")), 3000)),
      ]);
      return bmp;
    } catch {
      // Fallback without EXIF handling if the option isn't supported.
      try {
        return await Promise.race([
          createImageBitmap(file),
          new Promise<never>((_, rej) => window.setTimeout(() => rej(new Error("timeout")), 3000)),
        ]);
      } catch { /* fall through to Image */ }
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("Unsupported image")); img.src = url; });
    return img;
  } finally { URL.revokeObjectURL(url); }
}

function bitmapSize(src: PhotoBitmap): { w: number; h: number } {
  return "naturalWidth" in src ? { w: src.naturalWidth, h: src.naturalHeight } : { w: src.width, h: src.height };
}

function renderImageData(src: PhotoBitmap, maxSide: number): { img: ImageData; ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement } | null {
  const { w: sw, h: sh } = bitmapSize(src);
  if (!sw || !sh) return null;
  const scale = Math.min(1, Math.min(maxSide, 2560) / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, w, h);
  return { img: ctx.getImageData(0, 0, w, h), ctx, canvas };
}

function grayToImageData(ctx: CanvasRenderingContext2D, gray: Uint8ClampedArray, w: number, h: number): ImageData {
  const out = ctx.createImageData(w, h);
  for (let i = 0, j = 0; j < gray.length; i += 4, j++) { out.data[i] = gray[j]; out.data[i + 1] = gray[j]; out.data[i + 2] = gray[j]; out.data[i + 3] = 255; }
  ctx.putImageData(out, 0, 0);
  return out;
}

export function planDecodeVariants(w: number, h: number): number[] {
  const longest = Math.max(1, Math.max(w, h));
  const top = Math.min(longest, 2560);
  const ladder = [top, 2200, 1600, 1200, 900, 640, 440].filter((s) => s <= top);
  if (top < 700) ladder.unshift(Math.max(300, Math.min(1400, top * 2)));
  return [...new Set(ladder)].sort((a, b) => b - a);
}

interface Strategy { label: string; derive: (img: ImageData, ctx: CanvasRenderingContext2D) => ImageData; }

function pickStrategies(q: import("./types").QualityMetrics): Strategy[] {
  const s: Strategy[] = [];
  s.push({ label: "original", derive: (img) => img });
  if (q.contrast < 45) s.push({ label: "clahe", derive: (img, ctx) => { const g = grayscaleFromRgba(img.data); return grayToImageData(ctx, clahe(g, img.width, img.height), img.width, img.height); } });
  if (q.contrast < 60 || q.brightness < 70 || q.brightness > 185) s.push({ label: "sauvola", derive: (img, ctx) => { const g = grayscaleFromRgba(img.data); return grayToImageData(ctx, sauvolaThreshold(g, img.width, img.height), img.width, img.height); } });
  if (q.blur < 60) { const amount = q.blur < 25 ? 1.8 : q.blur < 45 ? 1.3 : 0.9; s.push({ label: "deblur", derive: (img, ctx) => { const g = grayscaleFromRgba(img.data); return grayToImageData(ctx, unsharpGray(g, img.width, img.height, amount), img.width, img.height); } }); }
  if (q.brightness < 60) s.push({ label: "brighten", derive: (img, ctx) => { const g = grayscaleFromRgba(img.data); return grayToImageData(ctx, normalizeRange(gammaCorrect(g, 0.6)), img.width, img.height); } });
  if (q.brightness > 200) s.push({ label: "darken", derive: (img, ctx) => { const g = grayscaleFromRgba(img.data); return grayToImageData(ctx, normalizeRange(gammaCorrect(g, 1.6)), img.width, img.height); } });
  if (q.noise > 30) s.push({ label: "denoise", derive: (img, ctx) => { const g = grayscaleFromRgba(img.data); const clean = denoiseMedian(g, img.width, img.height); return grayToImageData(ctx, binarizeGray(clean, otsuThreshold(clean)), img.width, img.height); } });
  s.push({ label: "otsu", derive: (img, ctx) => { const g = grayscaleFromRgba(img.data); return grayToImageData(ctx, binarizeGray(g, otsuThreshold(g)), img.width, img.height); } });
  return s;
}

export async function decodePhotoQr(file: File, onProgress?: DecodeProgress): Promise<QrDecodeHit | null> {
  let bitmap: PhotoBitmap;
  try { bitmap = await loadPhotoBitmap(file); } catch { return null; }
  const { w, h } = bitmapSize(bitmap);
  if (!w || !h) return null;
  const firstRender = renderImageData(bitmap, Math.min(Math.max(w, h), 1600));
  if (!firstRender) return null;
  const quality = assessQuality(grayscaleFromRgba(firstRender.img.data), firstRender.img.width, firstRender.img.height);
  const strategies = pickStrategies(quality);
  const scales = planDecodeVariants(w, h);
  const started = Date.now();
  const TIME_CAP_MS = 20_000;
  let attempts = 0;
  const ATTEMPT_CAP = 40;

  // Split strategies: cheap ones (original/otsu) run on main thread, heavy ones
  // (clahe/sauvola/deblur/brighten/darken/denoise) are batched to a worker.
  const heavy = strategies.filter((s) => s.label !== "original" && s.label !== "otsu");
  const cheap = strategies.filter((s) => s.label === "original" || s.label === "otsu");

  for (const maxSide of scales) {
    if (attempts >= ATTEMPT_CAP || Date.now() - started > TIME_CAP_MS) return null;
    const rendered = renderImageData(bitmap, maxSide);
    if (!rendered) continue;

    // Cheap strategies: main thread.
    for (const strategy of cheap) {
      if (attempts >= ATTEMPT_CAP || Date.now() - started > TIME_CAP_MS) return null;
      attempts++;
      onProgress?.(`Analyzing — ${strategy.label}, ${rendered.img.width}×${rendered.img.height} (pass ${attempts})…`);
      const derived = strategy.derive(rendered.img, rendered.ctx);
      const hit = await decodeImageData(derived, rendered.canvas);
      if (hit) return hit;
    }

    // Heavy strategies: offload to worker if available, else main thread.
    if (heavy.length) {
      attempts++;
      onProgress?.(`Enhancing image (${heavy.map((s) => s.label).join("+")})…`);
      try {
        // Copy pixels (transfer would mutate the shared buffer) and run on worker.
        const pixels = new Uint8ClampedArray(rendered.img.data);
        const frames = await preprocessOnWorker(rendered.img.width, rendered.img.height, pixels, heavy.map((s) => s.label));
        for (const frameBuffer of frames) {
          if (Date.now() - started > TIME_CAP_MS) return null;
          const frameData = new Uint8ClampedArray(frameBuffer);
          const frameImg = { data: frameData, width: rendered.img.width, height: rendered.img.height } as ImageData;
          const hit = await decodeImageData(frameImg, rendered.canvas);
          if (hit) return hit;
        }
      } catch {
        // Worker unavailable — fall back to main-thread heavy processing.
        for (const strategy of heavy) {
          if (attempts >= ATTEMPT_CAP || Date.now() - started > TIME_CAP_MS) return null;
          const derived = strategy.derive(rendered.img, rendered.ctx);
          const hit = await decodeImageData(derived, rendered.canvas);
          if (hit) return hit;
        }
      }
    }
  }
  return null;
}

export async function decodeVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement, heavy: boolean): Promise<QrDecodeHit | null> {
  const { getNativeDetector } = await import("./engines");
  const detector = getNativeDetector();
  if (detector) { try { const codes = await detector.detect(video); const raw = codes.find((c) => c.rawValue)?.rawValue; if (raw) return { text: raw, engine: "native" }; } catch { /* fall through */ } }
  if (!heavy) return null;
  const w = video.videoWidth, h = video.videoHeight;
  if (!w || !h) return null;
  const scale = Math.min(1, 1280 / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, cw, ch);
  const img = ctx.getImageData(0, 0, cw, ch);

  // Single-frame decode first (low latency).
  const single = await decodeImageData(img, canvas);
  if (single) return single;

  // Multi-frame temporal fusion: average 4 frames to cut noise 2×, then decode.
  // This is what makes live reading reliable in dim light / on shaky hands.
  const gray = grayscaleFromRgba(img.data);
  const fused = cameraFusion.push(gray, cw, ch);
  if (fused) {
    const fusedHit = await decodeImageData(fused, canvas);
    if (fusedHit) return { text: fusedHit.text, engine: "fused-" + fusedHit.engine };
  }
  return null;
}
