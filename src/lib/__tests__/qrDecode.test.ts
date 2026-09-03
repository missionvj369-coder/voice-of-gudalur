import { describe, expect, it } from "vitest";
import {
  binarizeGray,
  grayscaleFromRgba,
  otsuThreshold,
  planDecodeVariants,
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
    // 8x8: left half dark, right half bright — sharpening steepens the step.
    const w = 8;
    const h = 8;
    const gray = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) gray[y * w + x] = x < 4 ? 60 : 200;
    const out = unsharpGray(gray, w, h);
    // The pixel just left of the edge dips below 60; just right rises above 200.
    const leftOfEdge = out[3 + 4 * w];
    const rightOfEdge = out[4 + 4 * w];
    expect(leftOfEdge).toBeLessThan(60);
    expect(rightOfEdge).toBeGreaterThan(200);
  });
});
