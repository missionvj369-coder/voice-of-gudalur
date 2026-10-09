/**
 * fix-storj-urls.mjs — One-time fix: updates all media_posts file_url values
 * from /s/ (HTML viewer) to /raw/ (raw file content) so images actually load.
 */
import { readFileSync } from 'fs';

// Load DATABASE_URL from .env
const envContent = readFileSync('.env', 'utf8');
const dbMatch = envContent.match(/DATABASE_URL=(.+)/);
if (!dbMatch) { console.error('DATABASE_URL not found in .env'); process.exit(1); }

import pg from 'pg';
const client = new pg.Client({
  connectionString: dbMatch[1].trim(),
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  
  // Count affected rows
  const count = await client.query(
    `SELECT COUNT(*) as total FROM media_posts WHERE file_url LIKE '%/s/%'`
  );
  console.log(`Rows with /s/ URL: ${count.rows[0].total}`);

  // Fix: replace /s/ with /raw/ in file_url
  const result = await client.query(
    `UPDATE media_posts 
     SET file_url = REPLACE(file_url, '/s/', '/raw/') 
     WHERE file_url LIKE '%/s/%'
     RETURNING id, file_url`
  );

  console.log(`Updated ${result.rowCount} rows`);
  result.rows.forEach(r => console.log(`  ${r.id}: ${r.file_url.substring(0, 80)}...`));

  // Verify
  const verify = await client.query(
    `SELECT COUNT(*) as remaining FROM media_posts WHERE file_url LIKE '%/s/%'`
  );
  console.log(`Remaining /s/ URLs: ${verify.rows[0].remaining}`);

  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
