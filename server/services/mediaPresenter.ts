/**
 * Voice of Gudalur — Public media presenter (pure functions, no I/O).
 *
 * Shapes the /api/media response: compact whitelisted fields only (NEVER
 * base64/data_url payloads — files live in Storj, the DB/API only carry
 * metadata), trimmed descriptions, and a hard guarantee that client-facing
 * URLs are raw file links (never the /s/ HTML viewer page).
 */

export interface PublicMediaItem {
  id: string;
  kind: 'poster' | 'video';
  title: string;
  description: string | null;
  mime: string | null;
  sizeBytes: number | null;
  url: string;
  createdAt: string;
}

/** Hard bounds for the public media window (protects the DB + payload size). */
export const MEDIA_WINDOW_DEFAULT_LIMIT = 24;
export const MEDIA_WINDOW_MAX_LIMIT = 50;
export const MEDIA_LIST_HARD_CAP = 50;
export const MEDIA_DESC_MAX_CHARS = 280;

function toInt(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** Clamp ?limit/?offset into a safe window. */
export function clampWindow(limitQ: unknown, offsetQ: unknown): { limit: number; offset: number } {
  const limit = toInt(limitQ) ?? MEDIA_WINDOW_DEFAULT_LIMIT;
  const offset = toInt(offsetQ) ?? 0;
  return {
    limit: Math.min(Math.max(limit, 1), MEDIA_WINDOW_MAX_LIMIT),
    offset: Math.max(offset, 0),
  };
}

export function truncateText(s: string | null | undefined, max: number): string | null {
  if (s == null) return null;
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

/**
 * Storj's /s/ path is the HTML share-viewer PAGE, not the file. An <img src>
 * pointing at it renders a broken image — this shipped to production once.
 * Rewrite it here as a last line of defense.
 */
export function ensureRawMediaUrl(url: string | null | undefined): string {
  const u = url || '';
  return u.includes('link.storjshare.io/s/')
    ? u.replace('link.storjshare.io/s/', 'link.storjshare.io/raw/')
    : u;
}

/**
 * Project a media_posts row to the compact public shape. ONLY the fields
 * listed here ever reach the browser — base64 payloads, emails, admin-only
 * columns are structurally impossible to leak through this function.
 */
export function toPublicMediaItem(
  row: {
    id: unknown; kind: unknown; title: unknown; description: unknown;
    mime: unknown; size_bytes: unknown; created_at: unknown;
  },
  url: string | null | undefined,
): PublicMediaItem {
  return {
    id: String(row.id),
    kind: row.kind === 'video' ? 'video' : 'poster',
    title: String(row.title ?? ''),
    description: truncateText(typeof row.description === 'string' ? row.description : null, MEDIA_DESC_MAX_CHARS),
    mime: (row.mime as string) ?? null,
    sizeBytes: row.size_bytes != null ? Number(row.size_bytes) : null,
    url: ensureRawMediaUrl(url),
    createdAt: String(row.created_at ?? ''),
  };
}
