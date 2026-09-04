// Voice of Gudalur — scanner capability detection.
// Detects available hardware/software features so the scanner can degrade
// gracefully on low-end devices instead of failing outright.

export interface ScannerCapabilities {
  camera: boolean;
  barcodeDetector: boolean;
  wasm: boolean;
  workers: boolean;
  fileUpload: boolean;
  hardwareConcurrency: number;
  deviceMemory: number; // GB, 0 if unknown
  lowEnd: boolean;
}

let cached: ScannerCapabilities | null = null;

export function getScannerCapabilities(): ScannerCapabilities {
  if (cached) return cached;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);

  // Camera: requires getUserMedia + secure context (or localhost).
  const camera = (() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") return false;
    return true;
  })();

  // BarcodeDetector: Chromium/Android only. Optional acceleration.
  const barcodeDetector = (() => {
    try {
      return typeof (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector === "function";
    } catch {
      return false;
    }
  })();

  // WASM: required for ZBar. Nearly universal since ~2017.
  const wasm = typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function";

  // Workers: required for off-main-thread preprocessing.
  const workers = typeof Worker === "function";

  // File upload: always available in browsers.
  const fileUpload = typeof document !== "undefined";

  // Hardware concurrency (0 if unknown).
  const hardwareConcurrency = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 0;

  // Device memory in GB (0 if unknown — most browsers don't expose this).
  const deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory || 0;

  // Low-end heuristic: mobile with ≤4 cores OR ≤2 GB RAM OR no workers.
  const lowEnd = isMobile && (hardwareConcurrency > 0 && hardwareConcurrency <= 4 || deviceMemory > 0 && deviceMemory <= 2 || !workers);

  cached = {
    camera,
    barcodeDetector,
    wasm,
    workers,
    fileUpload,
    hardwareConcurrency,
    deviceMemory,
    lowEnd: !!lowEnd,
  };
  return cached;
}

/** Recommend decode parameters based on detected capabilities. */
export function recommendDecodeParams(caps: ScannerCapabilities): {
  maxSide: number;
  scaleCount: number;
  useWorkers: boolean;
  frameIntervalMs: number;
} {
  if (caps.lowEnd) {
    return { maxSide: 1280, scaleCount: 3, useWorkers: false, frameIntervalMs: 300 };
  }
  if (caps.hardwareConcurrency >= 8) {
    return { maxSide: 2560, scaleCount: 7, useWorkers: true, frameIntervalMs: 150 };
  }
  // Mid-range: 4-7 cores.
  return { maxSide: 1920, scaleCount: 5, useWorkers: caps.workers, frameIntervalMs: 200 };
}
