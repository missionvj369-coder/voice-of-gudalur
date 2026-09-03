// Voice of Gudalur — shared types for the on-device QR decode pipeline.

export interface QrDecodeHit {
  text: string;
  engine: string;
}

export interface DecodeProgress {
  (msg: string): void;
}

/** One-pass image quality profile — drives the smart-preprocessing selector. */
export interface QualityMetrics {
  /** Mean luminance, 0–255. <50 = too dark, >200 = too bright. */
  brightness: number;
  /** Std dev of luminance, 0–128. <35 = flat / low contrast. */
  contrast: number;
  /** Laplacian variance. Higher = sharper; low = motion/defocus blur. */
  blur: number;
  /** Estimated per-pixel noise (MAD of Laplacian). High = grainy. */
  noise: number;
}

/** Why a photo failed to decode — surfaced to the UI for actionable guidance. */
export type DecodeFailureReason =
  | "no-qr-found"
  | "low-contrast"
  | "blurry"
  | "too-dark"
  | "too-bright"
  | "undecodable-payload";

export interface DecodeResult {
  hit: QrDecodeHit | null;
  reason: DecodeFailureReason | null;
  /** Engine that succeeded — "native" | "zbar" | "jsqr". */
  engine?: string;
  /** Attempts spent (variants × engines) — for telemetry. */
  attempts?: number;
}
