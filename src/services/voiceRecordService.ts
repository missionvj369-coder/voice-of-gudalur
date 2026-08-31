export interface RecordedAudio {
  blob: Blob;
  durationMs: number;
}

/**
 * Records up to `maxSeconds` seconds using MediaRecorder.
 * Returns a Blob (webm/opus) and its duration.
 */
export async function recordVoiceNote(
  maxSeconds: number = 60
): Promise<RecordedAudio | null> {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert('Your browser does not support audio recording.');
    return null;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      resolve({ blob, durationMs });
    };
    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), maxSeconds * 1000);
  });
}
