/**
 * photoExif.ts — AI-assisted sighting metadata extraction.
 *
 * When a resident photographs an elephant sighting, the camera already knows
 * WHERE and WHEN it happened (EXIF GPS + timestamp). Reading it means
 * low-literacy users don't have to type coordinates or remember times —
 * the photo fills the form, the human just confirms.
 *
 * Built on `exifr` (open source, tree-shakeable, GPS-capable EXIF parser).
 * This module is the integration point for the future on-device/server
 * detection pipeline: when YOLO-style detection is connected, its results
 * (species, count, confidence) merge into the same `PhotoInsights` shape.
 */
import exifr from 'exifr';

export interface PhotoInsights {
  /** WGS84 latitude from EXIF GPS, if the camera had a fix. */
  latitude: number | null;
  /** WGS84 longitude from EXIF GPS, if the camera had a fix. */
  longitude: number | null;
  /** When the photo was taken (EXIF DateTimeOriginal preferred), ISO 8601. */
  takenAt: string | null;
  /** Camera-reported orientation-independent capture time source. */
  takenAtSource: 'exif' | 'file' | null;
  /** True when the file actually carried GPS coordinates. */
  hasGps: boolean;
  /** Short human-readable summary for toasts / aria-live announcements. */
  summary: string;
}

const EMPTY: PhotoInsights = {
  latitude: null,
  longitude: null,
  takenAt: null,
  takenAtSource: null,
  hasGps: false,
  summary: '',
};

/** Format "11.4438, 76.1330" style coordinate pair, 4dp (≈11 m precision). */
export function formatCoords(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/** Friendly absolute time in the app's locale (en-IN), or null. */
export function formatTakenAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Extract GPS + timestamp insights from a user-selected photo.
 * Never throws — a photo without EXIF (e.g. WhatsApp-forwarded, screenshot)
 * resolves to an EMPTY insights object with a helpful summary.
 */
export async function extractPhotoInsights(file: File): Promise<PhotoInsights> {
  try {
    // `tiff: true` already reads the IFD0 block — exifr has no `ifd0: true`
    // switch (its IFD0 parsing "cannot be disabled"), so asking for it as a
    // boolean only produced a type error.
    const exif = await exifr.parse(file, { gps: true, tiff: true, exif: true }).catch(() => null);

    const lat = exif && typeof exif.latitude === 'number' ? exif.latitude : null;
    const lng = exif && typeof exif.longitude === 'number' ? exif.longitude : null;

    // DateTimeOriginal = shutter press; fall back through the standard chain,
    // then to the file's own lastModified (always available via the File API).
    const raw = exif ? (exif.DateTimeOriginal ?? exif.CreateDate ?? exif.ModifyDate ?? null) : null;
    let takenAt: string | null = null;
    let takenAtSource: PhotoInsights['takenAtSource'] = null;
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
      takenAt = raw.toISOString();
      takenAtSource = 'exif';
    } else if (file.lastModified) {
      takenAt = new Date(file.lastModified).toISOString();
      takenAtSource = 'file';
    }

    const hasGps = lat != null && lng != null;
    const bits: string[] = [];
    const coords = formatCoords(lat, lng);
    if (coords) bits.push(`Location from photo: ${coords}`);
    const when = formatTakenAt(takenAt);
    if (when) bits.push(`${takenAtSource === 'file' ? 'File time' : 'Taken'}: ${when}`);

    return {
      latitude: lat,
      longitude: lng,
      takenAt,
      takenAtSource,
      hasGps,
      summary: bits.length ? bits.join(' · ') : 'No location or time found — please enter them.',
    };
  } catch {
    // Corrupt EXIF / unsupported format — the form stays fully usable.
    return { ...EMPTY, summary: 'Could not read photo metadata — please enter location and time.' };
  }
}
