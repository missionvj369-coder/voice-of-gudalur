// Voice of Gudalur — multi-frame temporal fusion for live camera QR reading.
//
// A single camera frame is noisy. The professional technique: accumulate N
// grayscale frames, average them (noise drops as 1/√N), then decode once on
// the clean average. This is why dedicated barcode scanners read instantly in
// bad light while naive single-frame readers fail. We keep it lightweight:
// a fixed-size ring buffer of 16-bit accumulators, no per-pixel history.

import type { QrDecodeHit } from "./types";

export class CameraFusion {
  private w = 0;
  private h = 0;
  private acc: Uint32Array | null = null;
  private count = 0;
  private readonly maxFrames: number;

  constructor(maxFrames = 4) {
    this.maxFrames = Math.max(1, Math.min(8, maxFrames));
  }

  reset(): void {
    this.acc = null;
    this.count = 0;
  }

  /**
   * Add a grayscale frame. Returns the averaged ImageData once `maxFrames`
   * frames have been accumulated (then resets), or null while still filling.
   * Caller still runs single-frame decode every frame for latency; this gives
   * a higher-quality attempt in parallel.
   */
  push(gray: Uint8ClampedArray, w: number, h: number): ImageData | null {
    if (this.w !== w || this.h !== h || !this.acc) {
      this.w = w; this.h = h;
      this.acc = new Uint32Array(w * h);
      this.count = 0;
    }
    for (let i = 0; i < gray.length; i++) this.acc![i] += gray[i];
    this.count++;
    if (this.count < this.maxFrames) return null;
    // Emit the average and reset for the next window.
    const out = new ImageData(w, h);
    for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
      const v = (this.acc![i] / this.count) | 0;
      out.data[j] = v; out.data[j + 1] = v; out.data[j + 2] = v; out.data[j + 3] = 255;
    }
    this.acc = null;
    this.count = 0;
    return out;
  }
}
