export interface RecordedAudio {
  blob: Blob;
  durationMs: number;
}

/**
 * Voice recorder controller that supports manual stop, continue, and max duration.
 * Returns null if getUserMedia is unsupported or permission denied.
 */
export interface VoiceRecorderController {
  /** Start recording (resumes from beginning, not append) */
  start: () => void;
  /** Stop recording and finalize the blob */
  stop: () => void;
  /** Whether currently recording */
  isRecording: boolean;
  /** Current recording duration in seconds */
  durationSec: number;
  /** Live microphone input level 0..1 (for UI meters) */
  level: number;
  /** The finalized blob after stop() — null until stopped */
  blob: Blob | null;
  /** Reset to initial state */
  reset: () => void;
  /** Error message if any */
  error: string | null;
  /** Subscribe to state changes — returns an unsubscribe function */
  subscribe: (fn: () => void) => () => void;
}

/**
 * Creates a voice recorder with a hard max of 30 seconds.
 * The recorder auto-stops at maxSeconds; the UI can also call stop() manually.
 */
export function createVoiceRecorder(maxSeconds: number = 30): VoiceRecorderController {
  let mediaRecorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: BlobPart[] = [];
  let startTime = 0;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let timeData: Uint8Array | null = null;

  const state = {
    isRecording: false,
    durationSec: 0,
    level: 0,
    blob: null as Blob | null,
    error: null as string | null,
  };

  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((fn) => fn());
  const subscribe = (fn: () => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  };

  /** Live input meter — RMS of the latest audio frame, normalised 0..1. */
  const readLevel = (): number => {
    if (!analyser || !timeData) return 0;
    analyser.getByteTimeDomainData(timeData);
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / timeData.length) * 2.5);
  };

  const teardownMeter = () => {
    try { audioCtx?.close().catch(() => { /* ignore */ }); } catch { /* ignore */ }
    audioCtx = null;
    analyser = null;
    timeData = null;
    state.level = 0;
  };

  const cleanup = () => {
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    teardownMeter();
    mediaRecorder = null;
  };

  const finalize = () => {
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    teardownMeter();
    if (chunks.length > 0) {
      state.blob = new Blob(chunks, { type: 'audio/webm' });
    }
    state.isRecording = false;
    mediaRecorder = null;
    notify();
  };

  const start = async () => {
    // Reset previous recording
    chunks = [];
    state.blob = null;
    state.error = null;
    state.durationSec = 0;
    cleanup();

    if (!navigator.mediaDevices?.getUserMedia) {
      state.error = 'Your browser does not support audio recording.';
      notify();
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      state.error = err.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow microphone access.'
        : 'Could not access microphone. Check device settings.';
      notify();
      return;
    }

    // Live input meter (analyser only — never connected to output, so no echo)
    try {
      audioCtx = new AudioContext();
      const src = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      timeData = new Uint8Array(analyser.frequencyBinCount);
      src.connect(analyser);
    } catch {
      /* metering is optional — recording continues without it */
    }

    // Determine supported mimeType
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/webm';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/mp4';
    }

    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType });
    } catch {
      // Fallback to default
      mediaRecorder = new MediaRecorder(stream);
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = finalize;

    mediaRecorder.start();
    state.isRecording = true;
    startTime = Date.now();

    // Update duration every 200ms
    timerId = setInterval(() => {
      state.durationSec = Math.floor((Date.now() - startTime) / 1000);
      state.level = readLevel();
      notify();
    }, 200);

    // Auto-stop at maxSeconds
    timeoutId = setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    }, maxSeconds * 1000);

    notify();
  };

  const stop = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    } else {
      finalize();
    }
  };

  const reset = () => {
    cleanup();
    chunks = [];
    state.isRecording = false;
    state.durationSec = 0;
    state.level = 0;
    state.blob = null;
    state.error = null;
    notify();
  };

  return {
    start,
    stop,
    get isRecording() { return state.isRecording; },
    get durationSec() { return state.durationSec; },
    get level() { return state.level; },
    get blob() { return state.blob; },
    get error() { return state.error; },
    reset,
    subscribe,
  } as VoiceRecorderController & { subscribe: (fn: () => void) => () => void };
}

/**
 * Legacy helper — records up to `maxSeconds` seconds using MediaRecorder.
 * Returns a Blob (webm/opus) and its duration.
 * @deprecated Use createVoiceRecorder() for the full stop/continue/save flow.
 */
export async function recordVoiceNote(
  maxSeconds: number = 30
): Promise<RecordedAudio | null> {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert('Your browser does not support audio recording.');
    return null;
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    alert('Microphone permission denied. Please allow microphone access.');
    return null;
  }

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm;codecs=opus',
  });

  const chunks: BlobPart[] = [];
  const start = Date.now();

  return new Promise((resolve) => {
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const durationMs = Date.now() - start;
      stream.getTracks().forEach((t) => t.stop());
      resolve({ blob, durationMs });
    };
    mediaRecorder.start();
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    }, maxSeconds * 1000);
  });
}
