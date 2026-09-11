/**
 * Voice of Gudalur — shared media HTML attribute helpers.
 *
 * Centralizes the loading/priority rules so regression tests can pin them:
 *  - videos NEVER preload the full file (metadata at most, user-initiated play)
 *  - only the single most important above-the-fold image is eager + high
 *    priority; everything else is lazy + async so a slow Storj can never
 *    block the page
 */

/** Videos must never auto-download their full payload in cards. */
export const VIDEO_PRELOAD = 'metadata' as const;

export interface ImgAttrs {
  loading: 'eager' | 'lazy';
  decoding: 'async';
  fetchPriority: 'high' | 'low' | 'auto';
}

/**
 * `index` = position of the card in the initial rendered window.
 * Index 0 is the single most important image (eager + high priority);
 * every other card is lazy so it never competes for bandwidth.
 */
export function cardImgAttrs(index: number): ImgAttrs {
  if (index === 0) return { loading: 'eager', decoding: 'async', fetchPriority: 'high' };
  return { loading: 'lazy', decoding: 'async', fetchPriority: 'auto' };
}

/** Cache-busting retry URL for a failed media element (per-card retry only). */
export function retryUrl(url: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}retry=${Date.now()}`;
}
