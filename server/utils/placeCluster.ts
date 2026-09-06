/**
 * Voice of Gudalur — National place clustering for the petition leaderboard.
 *
 * We never pre-set places. People across India sign with whatever address they
 * type ("Coimbatore", "Saravanathottam, Thudiyalur, Coimbatore 641034",
 * "New Bazar / Town Center, Gudalur", "Cochin, Kerala"). To surface "the most
 * supported places" we derive a canonical cluster key from each address and
 * aggregate counts:
 *
 *   - strip pincodes (6-digit) and generic tokens (tamil nadu, india,
 *     road, street, nagar, colony, bazar, …)
 *   - the most significant place name is chosen from the LAST comma segment,
 *     preferring the final meaningful token — people write the broad place last
 *   - examples:
 *       "coimbatore 641034"                       → coimbatore
 *       "Saravanathottam, Thudiyalur, Coimbatore" → coimbatore
 *       "6/6C Saravanathottam, Thudiyalur"        → thudiyalur
 *       "New Bazar / Town Center, Gudalur"        → gudalur
 *       "Kochi, Kerala"                           → kochi
 *
 * The most common original spelling is kept as the display name per cluster.
 */

/** State/province/country words that add no grouping value. */
const STOP_WORDS: ReadonlySet<string> = new Set([
  'tamil', 'nadu', 'tamilnadu', 'tn', 'ind', 'india', 'bharat', 'bhārat',
  'dist', 'distt', 'district', 'dt', 'state', 'province', 'country', 'union',
  'territory', 'taluk', 'taluq', 'tehsil', 'tehsildar', 'mandal', 'block',
  'suburban', 'suburb', 'zone',
  // Indian states / UTs — "Kochi, Kerala" must cluster under kochi, not kerala.
  'andhra', 'arunachal', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat',
  'haryana', 'himachal', 'pradesh', 'jharkhand', 'karnataka', 'kerala',
  'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha',
  'orissa', 'punjab', 'rajasthan', 'sikkim', 'telangana', 'tripura', 'uttar',
  'uttarakhand', 'bengal', 'delhi', 'jammu', 'kashmir', 'ladakh',
  'chandigarh', 'puducherry', 'pondicherry', 'andaman', 'nicobar',
  'lakshadweep', 'dadra', 'nagar', 'haveli', 'daman', 'diu',
]);

/** Street-style tokens that end an address rather than name a place. */
const SUFFIX_TAGS: ReadonlySet<string> = new Set([
  'road', 'rd', 'street', 'st', 'nagar', 'colony', 'layout', 'extension',
  'extn', 'gate', 'bazar', 'bazaar', 'market', 'village', 'gram', 'post',
  'po', 'p.o', 'h.o', 'estate', 'garden', 'gardens', 'cross', 'main', 'halli',
  'ur', 'palli', 'pet', 'pettai', 'chowk', 'chouk', 'mohalla', 'basti', 'gaon',
  'gali', 'lane', 'anicut', 'campus', 'camp', 'quarters', 'nivas', 'bhavan',
  'mansion', 'farm', 'farms', 'jct', 'junction', 'signal', 'bus', 'stop',
  'station', 'hotel', 'building', 'compound', 'colony', 'village', 'palayam',
  'palya', 'agraharam', 'street', 'valleyview', 'hill', 'hills', 'olivemount',
  'crct', 'nr', 'near', 'opp', 'behind', 'opposite', 'beside', 'door', 'house',
  'hno', 'no', 'flat', 'floor', 'first', 'second', 'third', 'appt', 'wing',
  'phase', 'sector', 'north', 'south', 'east', 'west', 'central', 'old', 'new',
  'upper', 'lower', 'san', 'sri', 'shri', 'ode', 'main', 'ville', 'residency',
  'apartments', 'apartment', 'scheme', 'enclave', 'tower', 'towers', 'heights',
  'springs', 'fountains', 'trade', 'center', 'centre', 'complex',
]);

/** Remove 6-digit pincodes and stray punctuation from an address.
 *  COMMAS ARE PRESERVED — clusterKeyForRaw picks the most significant place
 *  from the LAST comma segment (people write the broad place last), so they
 *  must survive noise-stripping. */
function stripNoise(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b\d{6}\b/g, ' ') // pincodes
    .replace(/[.;:"!@#$%^&*()_+=<>{}[\]|~`/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Derive a canonical cluster key from an address. */
export function clusterKeyForRaw(raw: string): string {
  if (!raw) return '';
  const s = stripNoise(raw);
  if (!s) return '';
  const segments = s.split(',').map((x) => x.trim()).filter(Boolean);
  if (segments.length === 0) return '';

  // Walk segments from last to first and pick the first that names a place.
  for (let i = segments.length - 1; i >= 0; i--) {
    const tokens = segments[i].split(/\s+/).filter((tk) => tk && !STOP_WORDS.has(tk) && !SUFFIX_TAGS.has(tk));
    if (tokens.length === 0) continue;
    // Free-form multi-word places typed together get a stronger key.
    if (tokens.length >= 2) {
      return tokens.join(' ');
    }
    return tokens[0];
  }
  return '';
}

function titleCase(s: string): string {
  return s
    .replace(/(^|[\s/-])([a-z])/g, (_m, p1: string, p2: string) => p1 + p2.toUpperCase())
    .trim();
}

export interface PlaceCount {
  place: string;
  count: number;
}

/**
 * Group raw registered addresses into places and return the leaderboard.
 * Deterministic ordering: count desc, then place name asc.
 */
export function clusterPlaces(rows: Array<{ place: string; count: number }>): PlaceCount[] {
  const map = new Map<string, { count: number; spellings: Map<string, number> }>();
  for (const r of rows) {
    const key = clusterKeyForRaw(r.place);
    const effective = key || '';
    const rec = map.get(effective) ?? { count: 0, spellings: new Map<string, number>() };
    rec.count += Number(r.count) || 0;
    const label = (r.place || '').trim() || 'Not specified';
    rec.spellings.set(label, (rec.spellings.get(label) ?? 0) + (Number(r.count) || 0));
    map.set(effective, rec);
  }

  const out: PlaceCount[] = [];
  for (const [_key, rec] of map) {
    const [display] = [...rec.spellings.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0];
    out.push({
      place: rec.spellings.size === 1 && display.toLowerCase() === display ? titleCase(display) : display,
      count: rec.count,
    });
  }

  return out.sort((a, b) => b.count - a.count || a.place.localeCompare(b.place));
}