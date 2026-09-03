import { describe, expect, it } from "vitest";
import {
  assessQuality,
  binarizeGray,
  clahe,
  grayscaleFromRgba,
  otsuThreshold,
  planDecodeVariants,
  sauvolaThreshold,
  unsharpGray,
} from "../qrDecode";

describe("planDecodeVariants", () => {
  it("starts at the native size, steps down, and caps huge photos at 2560px", () => {
    const plan = planDecodeVariants(1920, 1080);
    expect(plan[0]).toBe(1920);
    expect(plan.every((s) => s <= 1920)).toBe(true); // never upscales past native
    expect(plan).toContain(640);
    expect([...plan].sort((a, b) => b - a)).toEqual(plan); // descending
    expect(new Set(plan).size).toBe(plan.length); // no duplicates
    // A 12MP (4000px) phone photo must be capped to protect low-end devices.
    expect(planDecodeVariants(4000, 3000)[0]).toBe(2560);
  });

  it("upscales small images (thumbnails) before the ladder", () => {
    const plan = planDecodeVariants(480, 640);
    expect(plan[0]).toBe(1280); // min(1400, 640×2) — one meaningful upscale
    expect(plan).toContain(640);
  });

  it("handles degenerate sizes without crashing", () => {
    expect(planDecodeVariants(0, 0)).toEqual([300, 1]);
    expect(planDecodeVariants(10, 10)).toEqual([300, 10]);
  });
});

describe("grayscaleFromRgba", () => {
  it("computes Rec.601 luma per pixel", () => {
    // white, black, mid-gray
    const rgba = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 100, 100, 100, 255]);
    const gray = grayscaleFromRgba(rgba);
    expect(gray.length).toBe(3);
    expect(gray[0]).toBe(255);
    expect(gray[1]).toBe(0);
    expect(gray[2]).toBeGreaterThan(95);
    expect(gray[2]).toBeLessThan(105);
  });
});

describe("otsuThreshold", () => {
  it("splits a bimodal histogram between the two modes", () => {
    const gray = new Uint8ClampedArray(200);
    gray.fill(20, 0, 100);
    gray.fill(230, 100);
    const t = otsuThreshold(gray);
    expect(t).toBeGreaterThan(20);
    expect(t).toBeLessThan(230);
  });

  it("returns a valid threshold for a flat histogram (no crash)", () => {
    const gray = new Uint8ClampedArray(1000).fill(128);
    const t = otsuThreshold(gray);
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThanOrEqual(255);
  });

  it("handles an empty buffer", () => {
    expect(otsuThreshold(new Uint8ClampedArray(0))).toBe(128);
  });
});

describe("binarizeGray", () => {
  it("maps strictly-above to white and the rest to black", () => {
    const gray = new Uint8ClampedArray([0, 127, 128, 255]);
    const bw = binarizeGray(gray, 127);
    expect([...bw]).toEqual([0, 0, 255, 255]);
  });
});

describe("unsharpGray", () => {
  it("leaves a flat image unchanged", () => {
    const gray = new Uint8ClampedArray(64).fill(90);
    const out = unsharpGray(gray, 8, 8);
    for (let i = 0; i < out.length; i++) expect(out[i]).toBe(90);
  });

  it("amplifies local edge contrast", () => {
    const w = 8, h = 8;
    const gray = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) gray[y * w + x] = x < 4 ? 60 : 200;
    const out = unsharpGray(gray, w, h);
    expect(out[3 + 4 * w]).toBeLessThan(60);
    expect(out[4 + 4 * w]).toBeGreaterThan(200);
  });
});

describe("clahe — contrast enhancement for dim photos", () => {
  it("produces valid deterministic in-range output", () => {
    const w = 64, h = 64;
    const gray = new Uint8ClampedArray(w * h).fill(0).map((_, i) => (i * 7 + (i % 13)) % 200 + 30);
    const out = clahe(gray, w, h);
    // Contract: same length, all values in [0, 255], deterministic.
    expect(out.length).toBe(gray.length);
    let lo = 255, hi = 0;
    for (let i = 0; i < out.length; i++) { if (out[i] < lo) lo = out[i]; if (out[i] > hi) hi = out[i]; }
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(255);
    const out2 = clahe(gray, w, h);
    expect(Array.from(out)).toEqual(Array.from(out2)); // deterministic
  });

  it("amplifies local contrast between differently-lit tiles", () => {
    // Left half dark (40-50), right half bright (200-210): two distinct tiles.
    const w = 64, h = 64;
    const gray = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      gray[y * w + x] = x < w / 2 ? 40 + (x % 10) : 200 + (x % 10);
    }
    const out = clahe(gray, w, h);
    // Both halves must be driven toward opposite extremes (full separation).
    let leftMax = 0, rightMin = 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = out[y * w + x];
      if (x < w / 2) { if (v > leftMax) leftMax = v; } else { if (v < rightMin) rightMin = v; }
    }
    expect(rightMin).toBeGreaterThan(leftMax); // halves fully separated
  });

  it("does not crash on tiny images", () => {
    const out = clahe(new Uint8ClampedArray([50, 200, 100, 150]), 2, 2);
    expect(out.length).toBe(4);
  });
});

describe("sauvolaThreshold — uneven lighting rescue", () => {
  it("separates modules across a brightness gradient (half dark, half light)", () => {
    const w = 32, h = 32;
    const gray = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      // gradient background + a dark QR-like square in the bright half
      const bg = x < w / 2 ? 60 : 200;
      gray[y * w + x] = (x > w / 2 + 4 && x < w / 2 + 12 && y > 4 && y < 12) ? 30 : bg;
    }
    const bw = sauvolaThreshold(gray, w, h);
    // The dark square must read as black (0) even against the bright half.
    expect(bw[8 * w + (w / 2 + 8)]).toBe(0);
    // The surrounding bright area must read as white (255).
    expect(bw[8 * w + (w / 2 + 2)]).toBe(255);
  });
});

describe("assessQuality — defect profiling", () => {
  it("reports low brightness for a dark image", () => {
    const gray = new Uint8ClampedArray(100).fill(30);
    const q = assessQuality(gray, 10, 10);
    expect(q.brightness).toBeLessThan(40);
  });

  it("reports low contrast for a flat image", () => {
    const gray = new Uint8ClampedArray(100).fill(128);
    const q = assessQuality(gray, 10, 10);
    expect(q.contrast).toBeLessThan(1);
  });

  it("reports higher blur metric for a sharp edge than a flat field", () => {
    const w = 10, h = 10;
    const flat = new Uint8ClampedArray(w * h).fill(128);
    const sharp = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) sharp[y * w + x] = x < 5 ? 0 : 255;
    expect(assessQuality(sharp, w, h).blur).toBeGreaterThan(assessQuality(flat, w, h).blur);
  });
});
