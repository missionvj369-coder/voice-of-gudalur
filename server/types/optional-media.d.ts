/**
 * Voice of Gudalur — ambient types for the OPTIONAL heavy media dependencies.
 *
 * `server/services/mediaProcessor.ts` is the seam for the responsive-media
 * pipeline (320/800/1600 px x AVIF/WebP/JPEG + BlurHash placeholder + dominant
 * colour) whose storage columns exist in
 * server/db/migrations/010_media_responsive_variants.sql. Its two runtime
 * dependencies are deliberately NOT installed in this repo:
 *
 *   • sharp    — a native binary (~30 MB); this backend also runs as a Netlify
 *                Function (serverless-http), where bundle size is budgeted.
 *   • blurhash — only pays for itself once the pipeline is switched on.
 *
 * Nothing imports mediaProcessor yet, so leaving the packages out of
 * package.json keeps every deploy lean while the code stays type-checked.
 *
 * TO ENABLE THE PIPELINE: `npm i sharp blurhash`, then DELETE THIS FILE — the
 * packages' own .d.ts files take over. This declaration intentionally covers
 * only the handful of methods mediaProcessor actually calls.
 */

declare module 'sharp' {
  interface OutputInfo {
    width: number;
    height: number;
    channels?: number;
  }

  interface Metadata {
    width?: number;
    height?: number;
    format?: string;
  }

  interface Stats {
    channels: Array<{ mean: number }>;
  }

  interface SharpPipeline {
    resize(width?: number | null, height?: number | null, options?: Record<string, unknown>): SharpPipeline;
    raw(options?: Record<string, unknown>): SharpPipeline;
    webp(options?: Record<string, unknown>): SharpPipeline;
    avif(options?: Record<string, unknown>): SharpPipeline;
    jpeg(options?: Record<string, unknown>): SharpPipeline;
    metadata(): Promise<Metadata>;
    stats(): Promise<Stats>;
    toBuffer(options: { resolveWithObject: true }): Promise<{ data: Buffer; info: OutputInfo }>;
    toBuffer(options?: { resolveWithObject?: false }): Promise<Buffer>;
  }

  function sharp(input?: Buffer | string): SharpPipeline;

  export default sharp;
}

declare module 'blurhash' {
  export function encode(
    pixels: Uint8ClampedArray | Uint8Array | ArrayLike<number>,
    width: number,
    height: number,
    componentX: number,
    componentY: number,
  ): string;
}
