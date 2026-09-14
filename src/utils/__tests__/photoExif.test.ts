import { describe, it, expect } from 'vitest';
import { formatCoords, formatTakenAt, extractPhotoInsights } from '../photoExif';

describe('photoExif — AI-assisted sighting metadata', () => {
  it('formats coordinates to 4 decimal places', () => {
    expect(formatCoords(11.4438123, 76.1330987)).toBe('11.4438, 76.1331');
  });

  it('returns null coordinates when GPS is missing', () => {
    expect(formatCoords(null, null)).toBeNull();
    expect(formatCoords(11.44, null)).toBeNull();
    expect(formatCoords(null, 76.13)).toBeNull();
  });

  it('formats ISO timestamps in en-IN locale', () => {
    const out = formatTakenAt('2026-09-14T06:30:00.000Z');
    expect(out).toBeTruthy();
    expect(out).not.toContain('T'); // human readable, not raw ISO
  });

  it('returns null for invalid timestamps', () => {
    expect(formatTakenAt(null)).toBeNull();
    expect(formatTakenAt('not-a-date')).toBeNull();
  });

  it('degrades gracefully for a photo with no EXIF (empty File)', async () => {
    // A 1x1 PNG with no EXIF — must not throw, must return empty insights.
    const bytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
    ]);
    const file = new File([bytes], 'no-exif.png', { type: 'image/png' });
    const insights = await extractPhotoInsights(file);
    expect(insights.hasGps).toBe(false);
    expect(insights.latitude).toBeNull();
    expect(insights.longitude).toBeNull();
    // File fallback: lastModified still gives a usable "taken" time.
    expect(insights.takenAt).toBeTruthy();
    expect(insights.takenAtSource).toBe('file');
    expect(insights.summary).toContain('File time');
    expect(insights.summary).not.toContain('Location from photo');
  });

  it('never rejects on garbage input', async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], 'junk.bin', { type: 'application/octet-stream' });
    await expect(extractPhotoInsights(file)).resolves.toBeTruthy();
  });
});
