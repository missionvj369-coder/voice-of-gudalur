// Voice of Gudalur — Web Worker for CPU-heavy QR preprocessing offload.
//
// The expensive part of decoding an unclear photo is the image enhancement
// (CLAHE, Sauvola, deblurring over multi-megapixel buffers). That work runs
// here, on a background thread, so the main thread stays free for scrolling and
// touch. The worker receives raw RGBA + which enhancements to apply, and posts
// back the enhanced RGBA frames. The main thread then runs the (fast) decode
// engines over them. Falls back to main-thread processing if no Worker.

/* eslint-disable no-restricted-globals */
const ctx = self as unknown as DedicatedWorkerGlobalScope & {
  onmessage: (e: MessageEvent) => void;
  postMessage: (msg: unknown, transfer?: Transferable[]) => void;
};

ctx.onmessage = async (e: MessageEvent) => {
  const { id, width, height, pixels, strategies } = e.data as {
    id: number;
    width: number;
    height: number;
    pixels: ArrayBuffer;
    strategies: string[]; // e.g. ["clahe","sauvola","deblur"]
  };
  try {
    const { clahe, sauvolaThreshold, unsharpGray, normalizeRange, gammaCorrect, denoiseMedian, otsuThreshold, binarizeGray, grayscaleFromRgba } = await import("./preprocess");
    const rgba = new Uint8ClampedArray(pixels);
    const gray = grayscaleFromRgba(rgba);
    const w = width, h = height;
    const results: ArrayBuffer[] = [];

    for (const strat of strategies) {
      let processed: Uint8ClampedArray;
      switch (strat) {
        case "clahe": processed = clahe(gray, w, h); break;
        case "sauvola": processed = sauvolaThreshold(gray, w, h); break;
        case "deblur": processed = unsharpGray(gray, w, h, 1.5); break;
        case "brighten": processed = normalizeRange(gammaCorrect(gray, 0.6)); break;
        case "darken": processed = normalizeRange(gammaCorrect(gray, 1.6)); break;
        case "denoise": { const c = denoiseMedian(gray, w, h); processed = binarizeGray(c, otsuThreshold(c)); break; }
        case "otsu": processed = binarizeGray(gray, otsuThreshold(gray)); break;
        default: processed = gray;
      }
      // Convert gray back to RGBA for the engine.
      const out = new Uint8ClampedArray(w * h * 4);
      for (let i = 0, j = 0; i < processed.length; i++, j += 4) {
        out[j] = processed[i]; out[j + 1] = processed[i]; out[j + 2] = processed[i]; out[j + 3] = 255;
      }
      results.push(out.buffer);
    }
    ctx.postMessage({ id, frames: results }, results as unknown as Transferable[]);
  } catch (err) {
    ctx.postMessage({ id, error: String(err) });
  }
};

