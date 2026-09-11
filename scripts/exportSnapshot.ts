/**
 * Voice of Gudalur — build-time PUBLIC DATA SNAPSHOT exporter (Phase 1).
 *
 * Generates CDN-served static JSON snapshots of everything a crowd reads, so
 * the overwhelming majority of traffic NEVER touches a serverless function or
 * CockroachDB:
 *   dist/data/stats.json   — petition totals + per-place leaderboard
 *   dist/data/ledger.json  — public hash ledger (masked)
 *   dist/data/media.json   — media list (compact, /raw/, no base64)
 *
 * Regeneration: run on every deploy AND via a scheduled Netlify function
 * (cron) + a "refresh on write" hook. The runtime API remains the source of
 * truth; these snapshots are the crowd-read fast path.
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/exportSnapshot.ts
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/db/client';
import { cacheWrap, cacheDel } from '../server/utils/ttlCache';
import { clusterPlaces } from '../server/utils/placeCluster';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../dist/data');

const TTL = 10 * 1000; // short; refreshed by the route write-hook + cron

async function writeJson(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
  console.log(`  ✓ ${path.relative(process.cwd(), file)}`);
}

async function buildStats() {
  const totalRow = await db.queryOne<{ count: number }>('SELECT COUNT(*)::int AS count FROM petition_signs');
  const totalNum = Number(totalRow?.count ?? 0);
  const places = await db.query<{ place: string; count: number }>(
    `SELECT village AS place, COUNT(*)::int AS count
     FROM petition_signs WHERE village IS NOT NULL AND village <> '' GROUP BY village`,
  );
  const clustered = clusterPlaces(places.rows.map((r) => ({ place: String(r.place), count: Number(r.count) }))).slice(0, 10);
  const external = await db.queryOne<{ count: number }>('SELECT COUNT(*)::int AS count FROM external_supports');
  return {
    total: totalNum,
    external: Number(external?.count ?? 0),
    places: clustered,
    updatedAt: new Date().toISOString(),
  };
}

async function buildLedger() {
  const rows = await db.query<{
    sign_hash: string; full_name: string; village: string | null; phone_last4: string | null; created_at: string;
  }>(
    `SELECT sign_hash, full_name, village, phone_last4, created_at
     FROM petition_signs ORDER BY created_at DESC LIMIT 500`,
  );
  return {
    signs: rows.rows.map((r) => ({
      hash: r.sign_hash,
      name: r.full_name,
      village: r.village,
      phoneLast4: r.phone_last4,
      signedAt: r.created_at,
    })),
    updatedAt: new Date().toISOString(),
  };
}

async function buildMedia() {
  // Re-import inside the fn so the presenter's pure helpers stay in sync.
  const { query, queryOne } = await import('../server/db/client');
  const { toPublicMediaItem, ensureRawMediaUrl, MEDIA_LIST_HARD_CAP } = await import('../server/services/mediaPresenter');
  const { default: storj } = await import('../server/services/storj');
  const rows = await query<{
    id: string; kind: string; title: string; description: string | null;
    mime: string | null; size_bytes: number | null; file_url: string | null; created_at: string;
  }>(
    `SELECT id, kind, title, description, mime, size_bytes, file_url, created_at
     FROM media_posts WHERE active = TRUE ORDER BY created_at DESC LIMIT ${MEDIA_LIST_HARD_CAP}`,
  );
  const media = [];
  for (const r of rows.rows) {
    let url: string;
    if (r.file_url && storj.isStorjConfigured()) {
      try { url = await storj.getMediaUrl(storj.urlToKey(r.file_url)); }
      catch { url = ensureRawMediaUrl(r.file_url); }
    } else {
      url = ensureRawMediaUrl(r.file_url) || `/api/media/${encodeURIComponent(r.id)}/file`;
    }
    media.push(toPublicMediaItem(r, url));
  }
  return { media, total: media.length, updatedAt: new Date().toISOString() };
}

// "Refresh on write" — the same cacheDel keys the routes use, so any write
// invalidates both the in-process TTL cache AND (via this post-build cron)
// the static snapshots on the next run.
function invalidateWriteKeys() {
  cacheDel('petition:sign-stats');
  cacheDel('petition:ledger');
  cacheDel('media:list');
}

async function main() {
  console.log('Exporting public snapshots → dist/data/');
  await fs.mkdir(OUT, { recursive: true });
  invalidateWriteKeys();
  const [stats, ledger, media] = await Promise.all([buildStats(), buildLedger(), buildMedia()]);
  await Promise.all([
    writeJson(path.join(OUT, 'stats.json'), stats),
    writeJson(path.join(OUT, 'ledger.json'), ledger),
    writeJson(path.join(OUT, 'media.json'), media),
  ]);
  console.log(`Done — stats.total=${stats.total}, ledger.signs=${ledger.signs.length}, media=${media.media.length}`);
}

main().catch((e) => { console.error('Snapshot export failed:', e); process.exit(1); });