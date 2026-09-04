// Voice of Gudalur — QR decode public API barrel.

export { decodePhotoQr, decodeVideoFrame } from "./decode";
export { planDecodeVariants } from "./decode";
export { CameraFusion } from "./cameraFusion";
export { preprocessOnWorker } from "./workerPool";
export {
  assessQuality, binarizeGray, clahe, denoiseMedian, gammaCorrect,
  grayscaleFromRgba, normalizeRange, otsuThreshold,
  sauvolaThreshold, unsharpGray,
} from "./preprocess";
export { getNativeDetector } from "./engines";
export { getScannerCapabilities, recommendDecodeParams } from "./capabilities";
export type { ScannerCapabilities } from "./capabilities";
export type { QrDecodeHit, DecodeProgress, QualityMetrics, DecodeResult, DecodeFailureReason } from "./types";
