/**
 * transcriptionService.ts — on-device, open-source speech-to-text.
 *
 * Engine: Whisper via @huggingface/transformers (Transformers.js, Apache-2.0).
 * The model runs entirely in the browser (WASM/WebGPU) — audio NEVER leaves
 * the phone, and after the first download the model is cached by the browser
 * so transcription works fully OFFLINE (critical for zero-network Gudalur).
 *
 * Fallback: POST /api/voice/transcribe → server proxies to a self-hosted
 * faster-whisper/Speaches endpoint when WHISPER_URL is configured.
 */

const WHISPER_MODEL = import.meta.env.VITE_WHISPER_MODEL || 'onnx-community/whisper-base';

let pipelinePromise: Promise<any> | null = null;

export interface TranscribeProgress {
  status: string;
  file?: string;
  progress?: number;
}

async function getTranscriber(onProgress?: (p: TranscribeProgress) => void) {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      return pipeline('automatic-speech-recognition', WHISPER_MODEL, {
        dtype: 'q8',
        progress_callback: onProgress,
      });
    })().catch((e) => {
      pipelinePromise = null; // allow retry on next call
      throw e;
    });
  }
  return pipelinePromise;
}

/** Decode any browser-supported audio blob (webm/opus, mp3, wav…) to 16 kHz mono Float32. */
async function blobToFloat32PCM(blob: Blob, targetRate = 16000): Promise<Float32Array> {
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new Ctx({ sampleRate: targetRate });
  try {
    const buf = await blob.arrayBuffer();
    const decoded = await ctx.decodeAudioData(buf);
    let data: Float32Array;
    if (decoded.numberOfChannels === 1) {
      data = decoded.getChannelData(0).slice();
    } else {
      const len = decoded.length;
      data = new Float32Array(len);
      for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
        const d = decoded.getChannelData(ch);
        for (let i = 0; i < len; i++) data[i] += d[i] / decoded.numberOfChannels;
      }
    }
    return data;
  } finally {
    ctx.close().catch(() => {});
  }
}

export interface TranscribeResult {
  text: string;
  source: 'device' | 'server';
}

/**
 * Transcribe a recording. Priority:
 *   1. On-device Whisper (private + offline) — model auto-detects language
 *      (Tamil/English/malayalam supported by the multilingual model).
 *   2. Self-hosted server proxy (/api/voice/transcribe), if configured.
 *   3. Empty string — caller falls back to manual description.
 */
export async function transcribeAudioBlob(
  blob: Blob,
  opts: { lang?: string; onProgress?: (p: TranscribeProgress) => void } = {},
): Promise<TranscribeResult> {
  try {
    const transcriber = await getTranscriber(opts.onProgress);
    const audio = await blobToFloat32PCM(blob);
    if (audio.length < 1600) return { text: '', source: 'device' }; // <0.1 s of silence
    const out = await transcriber(audio, {
      language: opts.lang === 'ta' ? 'tamil' : opts.lang,
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
    });
    const text = (Array.isArray(out) ? out[0]?.text : out?.text) || '';
    return { text: typeof text === 'string' ? text.trim() : '', source: 'device' };
  } catch (deviceErr) {
    console.warn('[Transcribe] on-device Whisper failed, trying server proxy:', deviceErr);
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'voice.webm');
      if (opts.lang) fd.append('language', opts.lang);
      const res = await fetch('/api/voice/transcribe', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        return { text: data.text || '', source: 'server' };
      }
    } catch (serverErr) {
      console.warn('[Transcribe] server proxy failed:', serverErr);
    }
    return { text: '', source: 'device' };
  }
}

export function isDeviceTranscriptionSupported(): boolean {
  return typeof window !== 'undefined' && 'AudioContext' in window;
}
