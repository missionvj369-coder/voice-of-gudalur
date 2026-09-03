// Voice of Gudalur — image quality assessment + enhancement toolkit.
//
// Professional QR readers don't brute-force one fixed pipeline; they MEASURE
// the image once, then apply the RIGHT enhancement. A dim backlit photo needs
// CLAHE; a half-shadowed photo needs adaptive (Sauvola) thresholding; a
// motion-blurred frame needs deblurring. This module is the "measure, then
// enhance" core. All functions are pure and run on the main thread or in a
// Web Worker identically.

import type { QualityMetrics } from "./types";

/* ───────────────────────────── helpers ───────────────────────────── */

/** Rec.601 luma per pixel (1 byte out per pixel). */
export function grayscaleFromRgba(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const n = rgba.length >> 2;
  const gray = new Uint8ClampedArray(n);
  for (let i = 0, j = 0; j < n; i += 4, j++) {
    gray[j] = (19595 * rgba[i] + 38469 * rgba[i + 1] + 7472 * rgba[i + 2]) >> 16;
  }
  return gray;
}

function minMax(gray: Uint8ClampedArray): [number, number] {
  let lo = 255;
  let hi = 0;
  for (let i = 0; i < gray.length; i++) {
    const v = gray[i];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [lo, hi];
}

/* ───────────────────── quality assessment (one pass) ───────────────────── */

/**
 * Profile an image's defects in a single pass. Cheap enough to run before
 * every decode attempt — it pays for itself by avoiding useless enhancements.
 */
export function assessQuality(gray: Uint8ClampedArray, w: number, h: number): QualityMetrics {
  const n = gray.length;
  let sum = 0;
  let sumSq = 0;
  let lap = 0;
  let lapCount = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const v = gray[i];
      sum += v;
      sumSq += v * v;
      if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
        const l = -4 * v + gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w];
        lap += Math.abs(l);
        lapCount++;
      }
    }
  }
  const mean = sum / n;
  const contrast = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
  const blur = lapCount > 0 ? lap / lapCount : 0;
  const noise = Math.max(0, contrast - blur * 0.1);
  return { brightness: mean, contrast, blur, noise };
}

/* ──────────────────── contrast: CLAHE ──────────────────── */
// CLAHE rescues dim, washed-out, or unevenly-lit photos. We tile the image,
// equalize each tile's histogram (clipping the peak so noise doesn't blow up),
// then bilinearly interpolate between tile centres to kill blocking artefacts.

export function clahe(
  gray: Uint8ClampedArray,
  w: number,
  h: number,
  clipLimit = 3.0,
  tile = 8,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length);
  const tilesX = Math.max(1, Math.ceil(w / tile));
  const tilesY = Math.max(1, Math.ceil(h / tile));
  const tileLuts = new Uint8Array(tilesX * tilesY * 256);
  const clip = (clipLimit * tile * tile) / 256;

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const hist = new Uint32Array(256);
      const x0 = tx * tile;
      const y0 = ty * tile;
      const x1 = Math.min(x0 + tile, w);
      const y1 = Math.min(y0 + tile, h);
      for (let y = y0; y < y1; y++) {
        let i = y * w + x0;
        for (let x = x0; x < x1; x++) hist[gray[i++]]++;
      }
      let excess = 0;
      for (let b = 0; b < 256; b++) {
        if (hist[b] > clip) {
          excess += hist[b] - clip;
          hist[b] = clip;
        }
      }
      const add = excess / 256;
      let acc = 0;
      const base = (ty * tilesX + tx) * 256;
      const total = (x1 - x0) * (y1 - y0);
      for (let b = 0; b < 256; b++) {
        acc += hist[b] + add;
        tileLuts[base + b] = (255 * acc) / total;
      }
    }
  }

  for (let y = 0; y < h; y++) {
    const ty = y / tile - 0.5;
    const ty0 = Math.max(0, Math.min(tilesY - 1, Math.floor(ty)));
    const ty1 = Math.max(0, Math.min(tilesY - 1, ty0 + 1));
    const fy = Math.max(0, Math.min(1, ty - ty0));
    for (let x = 0; x < w; x++) {
      const tx = x / tile - 0.5;
      const tx0 = Math.max(0, Math.min(tilesX - 1, Math.floor(tx)));
      const tx1 = Math.max(0, Math.min(tilesX - 1, tx0 + 1));
      const fx = Math.max(0, Math.min(1, tx - tx0));
      const v = gray[y * w + x];
      const top =
        tileLuts[(ty0 * tilesX + tx0) * 256 + v] * (1 - fx) +
        tileLuts[(ty0 * tilesX + tx1) * 256 + v] * fx;
      const bot =
        tileLuts[(ty1 * tilesX + tx0) * 256 + v] * (1 - fx) +
        tileLuts[(ty1 * tilesX + tx1) * 256 + v] * fx;
      out[y * w + x] = top * (1 - fy) + bot * fy;
    }
  }
  return out;
}

/* ─────────────── binarization: Otsu (global) + Sauvola (local) ─────────────── */

export function otsuThreshold(gray: Uint8ClampedArray): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  if (total === 0) return 128;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, best = 0, bestVar = -1;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between >= bestVar) { bestVar = between; best = t; }
  }
  return best;
}

export function binarizeGray(gray: Uint8ClampedArray, threshold: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length);
  for (let i = 0; i < gray.length; i++) out[i] = gray[i] > threshold ? 255 : 0;
  return out;
}

/**
 * Sauvola local thresholding — the rescue for uneven lighting / shadows, the
 * single most common real-world failure. Each pixel's threshold adapts to the
 * mean (m) and std-dev (s) of its neighbourhood: T = m·(1 + k·(s/R − 1)).
 * Uses an integral image so the per-pixel cost is O(1).
 */
export function sauvolaThreshold(gray: Uint8ClampedArray, w: number, h: number, window = 25, k = 0.2, R = 128): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length);
  const area = new Float64Array((w + 1) * (h + 1));
  const areaSq = new Float64Array((w + 1) * (h + 1));
  for (let y = 1; y <= h; y++) {
    let row = 0, rowSq = 0;
    for (let x = 1; x <= w; x++) {
      const v = gray[(y - 1) * w + (x - 1)];
      row += v; rowSq += v * v;
      area[y * (w + 1) + x] = area[(y - 1) * (w + 1) + x] + row;
      areaSq[y * (w + 1) + x] = areaSq[(y - 1) * (w + 1) + x] + rowSq;
    }
  }
  const half = Math.floor(window / 2);
  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - half), y2 = Math.min(h, y + half + 1);
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - half), x2 = Math.min(w, x + half + 1);
      const cnt = (x2 - x1) * (y2 - y1);
      const sum = area[y2 * (w + 1) + x2] - area[y1 * (w + 1) + x2] - area[y2 * (w + 1) + x1] + area[y1 * (w + 1) + x1];
      const sumSq = areaSq[y2 * (w + 1) + x2] - areaSq[y1 * (w + 1) + x2] - areaSq[y2 * (w + 1) + x1] + areaSq[y1 * (w + 1) + x1];
      const m = sum / cnt, s = Math.sqrt(Math.max(0, sumSq / cnt - m * m));
      out[y * w + x] = gray[y * w + x] >= m * (1 + k * (s / R - 1)) ? 255 : 0;
    }
  }
  return out;
}

/* ────────────────── sharpening: adaptive unsharp mask ────────────────── */

export function unsharpGray(gray: Uint8ClampedArray, w: number, h: number, amount = 1.0): Uint8ClampedArray {
  if (w < 3 || h < 3) return gray;
  const out = new Uint8ClampedArray(gray.length);
  for (let x = 0; x < w; x++) { out[x] = gray[x]; out[(h - 1) * w + x] = gray[(h - 1) * w + x]; }
  for (let y = 1; y < h - 1; y++) {
    let i = y * w; out[i] = gray[i]; i++;
    for (let x = 1; x < w - 1; x++) {
      const blurred = (gray[i - w - 1] + gray[i - w] + gray[i - w + 1] + gray[i - 1] + gray[i] + gray[i + 1] + gray[i + w - 1] + gray[i + w] + gray[i + w + 1]) / 9;
      const s = gray[i] + amount * (gray[i] - blurred);
      out[i] = s < 0 ? 0 : s > 255 ? 255 : s; i++;
    }
    out[i] = gray[i];
  }
  return out;
}

export function normalizeRange(gray: Uint8ClampedArray): Uint8ClampedArray {
  const [lo, hi] = minMax(gray);
  if (hi - lo < 1) return gray;
  const scale = 255 / (hi - lo);
  const out = new Uint8ClampedArray(gray.length);
  for (let i = 0; i < gray.length; i++) out[i] = (gray[i] - lo) * scale;
  return out;
}

export function gammaCorrect(gray: Uint8ClampedArray, gamma: number): Uint8ClampedArray {
  const lut = new Uint8Array(256); const inv = 1 / gamma;
  for (let i = 0; i < 256; i++) lut[i] = Math.pow(i / 255, inv) * 255;
  const out = new Uint8ClampedArray(gray.length);
  for (let i = 0; i < gray.length; i++) out[i] = lut[gray[i]];
  return out;
}

export function denoiseMedian(gray: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  if (w < 3 || h < 3) return gray;
  const out = new Uint8ClampedArray(gray.length);
  const win = new Uint8ClampedArray(9);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x === 0 || x === w - 1 || y === 0 || y === h - 1) { out[y * w + x] = gray[y * w + x]; continue; }
    let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) win[n++] = gray[(y + dy) * w + (x + dx)];
    win.sort(); out[y * w + x] = win[4];
  }
  return out;
}
