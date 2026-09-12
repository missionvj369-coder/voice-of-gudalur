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
  // Use the maintained petition_stats aggregate (falls back to COUNT(*) if not migrated).
  let totalNum = 0;
  try {
    const totalRow = await db.queryOne<{ count: number }>('SELECT signature_count::int AS count FROM petition_stats WHERE id = $1', ['global']);
    totalNum = Number(totalRow?.count ?? 0);
  } catch {
    const totalRow = await db.queryOne<{ count: number }>('SELECT COUNT(*)::int AS count FROM petition_signs');
    totalNum = Number(totalRow?.count ?? 0);
  }

  // External (non-resident) supporters — table may not be migrated yet.
  // NOTE: petition_signs has NO petition_id column — never filter by it here.
  let external = 0;
  try {
    const ext = await db.queryOne<{ count: number }>('SELECT COUNT(*)::int AS count FROM external_supports');
    external = Number(ext?.count ?? 0);
  } catch { /* table absent — treat as 0 */ }

  // Gudalur vs Outside split via pincode prefix (64* = The Nilgiris).
  // RESILIENT: the mobile-signs table may not be migrated yet — it is counted
  // in its own try/catch so one missing table can never blank the whole split
  // (a failing UNION here reported gudalur=0/outside=0 with total=14).
  let gudalur = 0;
  let outsideGudalur = 0;
  try {
    const row = await db.queryOne<{ g: number; o: number }>(
      `SELECT
         SUM(CASE WHEN pincode ~ '^64' THEN 1 ELSE 0 END)::int AS g,
         SUM(CASE WHEN pincode IS NULL OR pincode NOT LIKE '64%' THEN 1 ELSE 0 END)::int AS o
       FROM petition_signs`,
    );
    gudalur = Number(row?.g ?? 0);
    outsideGudalur = Number(row?.o ?? 0);
  } catch { /* signs table absent — split stays 0 */ }
  try {
    const m = await db.queryOne<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM petition_mobile_signs',
    );
    outsideGudalur += Number(m?.count ?? 0);
  } catch { /* mobile table not migrated yet — resident split only */ }

  const places = await db.query<{ place: string; count: number }>(
    `SELECT village AS place, COUNT(*)::int AS count
     FROM petition_signs WHERE village IS NOT NULL AND village <> '' GROUP BY village`,
  );
  const clustered = clusterPlaces(places.rows.map((r) => ({ place: String(r.place), count: Number(r.count) }))).slice(0, 10);

  return {
    total: totalNum,
    validations: totalNum,
    communityReach: totalNum + external,
    external,
    gudalur,
    outsideGudalur,
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
  // Public Name+Mobile signatures (petition-only launch) share the snapshot —
  // same masked privacy posture; village is empty for public signs.
  // Graceful: before migration 016 is applied the table doesn't exist (42P01)
  // — fall back to resident signatures only without failing the build.
  let mobileRows = { rows: [] as Array<{
    sign_hash: string; full_name: string; phone_last4: string | null; created_at: string;
  }> };
  try {
    const res = await db.query<{
      sign_hash: string; full_name: string; phone_last4: string | null; created_at: string;
    }>(
      `SELECT sign_hash, full_name, phone_last4, created_at
       FROM petition_mobile_signs ORDER BY created_at DESC LIMIT 500`,
    );
    mobileRows = res;
  } catch (e: any) {
    if (e?.code !== '42P01') throw e; // real errors still fail the build
    console.log('  (petition_mobile_signs not migrated yet — resident signs only)');
  }
  const combined = [
    ...rows.rows,
    ...mobileRows.rows.map((r) => ({ ...r, village: '' as string | null })),
  ].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 500);
  return {
    signs: combined.map((r) => ({
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