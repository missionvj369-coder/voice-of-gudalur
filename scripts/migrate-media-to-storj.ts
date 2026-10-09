/**
 * migrate-media-to-storj.ts
 * ---------------------------------------------------------------------------
 * One-time migration: moves existing media from base64-in-CockroachDB to Storj
 * object storage. Run AFTER configuring STORJ_* env vars.
 *
 * Safe to re-run: it only processes rows that still have a data_url, so already
 * migrated rows are skipped. For each row it:
 *   1. decodes the base64 data_url
 *   2. uploads the bytes to Storj
 *   3. stores the public URL in file_url
 *   4. clears data_url (frees the bulk of the DB space)
 *
 * Run:  npx tsx scripts/migrate-media-to-storj.ts
 * Dry:  npx tsx scripts/migrate-media-to-storj.ts --dry-run
 */
import { db } from '../server/db/client';
import storj from '../server/services/storj';
import { logger } from '../server/utils/logger';

const DRY = process.argv.includes('--dry-run');

interface Row {
  id: string;
  kind: string;
  mime: string | null;
  data_url: string | null;
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m) return null;
  const mime = m[1] || 'application/octet-stream';
  if (m[2]) return { mime, buffer: Buffer.from(m[3], 'base64') };
  return { mime, buffer: Buffer.from(m[3], 'utf8') };
}

async function main() {
  if (!storj.isStorjConfigured()) {
    console.error('[migrate] Storj is not configured. Set STORJ_ACCESS_KEY, STORJ_SECRET_ACCESS_KEY, STORJ_BUCKET.');
    process.exit(1);
  }

  console.log(`[migrate] mode: ${DRY ? 'DRY RUN (no changes)' : 'LIVE'}`);

  // Preflight: bucket reachable?
  const ok = await storj.checkBucket();
  if (!ok) {
    console.error('[migrate] Cannot reach Storj bucket. Check credentials/endpoint.');
    process.exit(1);
  }

  const rows = await db.query<Row>(
    `SELECT id, kind, mime, data_url
     FROM media_posts WHERE active = TRUE AND data_url IS NOT NULL AND file_url IS NULL
     ORDER BY created_at ASC`,
  );

  console.log(`[migrate] ${rows.rowCount ?? 0} media rows to migrate.`);

  let done = 0;
  let failed = 0;

  for (const r of rows.rows) {
    const parsed = r.data_url ? parseDataUrl(r.data_url) : null;
    if (!parsed) {
      logger.warn(`[migrate] ${r.id}: could not parse data_url, skipping`);
      failed++;
      continue;
    }
    try {
      if (!DRY) {
        const { url, size } = await storj.uploadMedia(r.id, parsed.buffer, r.mime || parsed.mime);
        await db.query(
          'UPDATE media_posts SET file_url = $1, data_url = NULL, size_bytes = $2 WHERE id = $3',
          [url, size, r.id],
        );
      }
      done++;
      const kb = Math.round(parsed.buffer.length / 1024);
      console.log(`  ${DRY ? '[dry] ' : ''}migrated ${r.id} (${r.kind}, ${kb} KB)`);
    } catch (e: any) {
      logger.error(`[migrate] ${r.id} failed: ${e?.message || e}`);
      failed++;
    }
  }

  console.log(`\n[migrate] complete. migrated: ${done}, failed: ${failed}${DRY ? ' (dry run)' : ''}`);
  if (!DRY && done > 0) {
    console.log('[migrate] Base64 data cleared from those rows — CockroachDB space reclaimed.');
  }
  await db.execute('SELECT 1').catch(() => {});
  process.exit(failed > 0 ? 2 : 0);
}

main().catch((e) => {
  console.error('[migrate] fatal:', e?.message || e);
  process.exit(1);
});
