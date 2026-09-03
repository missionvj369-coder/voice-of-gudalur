/**
 * Voice of Gudalur — CockroachDB migration runner.
 *
 * Runs migrations from `server/db/migrations/*.sql` in filename order against
 * the configured CockroachDB database. Replays only unapplied migrations
 * using a `schema_migrations` tracking table (idempotent / resumable).
 *
 * Usage:
 *   npx tsx server/db/migrate.ts up       # apply pending
 *   npx tsx server/db/migrate.ts status   # list applied + pending
 *   npx tsx server/db/migrate.ts seed     # load seed data
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, queryOne, executeWithRetry, getPool } from './client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

interface Migration {
  version: number;
  name: string;
  filename: string;
}

async function ensureTrackingTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     INT PRIMARY KEY,
      description STRING NOT NULL,
      applied_at  TIMESTAMPTZ DEFAULT now()
    )
  `);
}

async function getApplied(): Promise<Set<number>> {
  const res = await query<{ version: number }>('SELECT version FROM schema_migrations ORDER BY version');
  return new Set(res.rows.map((r) => Number(r.version)));
}

function listMigrations(): Migration[] {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  return files
    .map((f) => {
      const match = /^(\d+)_(.+)\.sql$/.exec(f);
      if (!match) return null;
      return { version: Number(match[1]), name: match[2], filename: f };
    })
    .filter(Boolean)!
    .sort((a, b) => a.version - b.version);
}

export async function status(): Promise<void> {
  await ensureTrackingTable();
  const applied = await getApplied();
  const all = listMigrations();
  if (all.length === 0) {
    console.log('No migration files found in', MIGRATIONS_DIR);
    return;
  }
  const latestApplied = Math.max(0, ...all.map((m) => (applied.has(m.version) ? m.version : 0)));
  console.log(`\nDatabase: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'unknown'}\n`);
  console.log('Migrations:');
  for (const m of all) {
    const status = applied.has(m.version) ? 'Applied' : 'Pending';
    const marker = applied.has(m.version) ? 'x' : ' ';
    console.log(`  [${marker}] ${m.version.toString().padStart(3, '0')}  ${m.filename}`);
  }
  console.log(`\n${applied.size} applied · ${all.length - applied.size} pending · current = ${latestApplied}`);
  await getPool().end();
  process.exit(0);
}

export async function up(): Promise<void> {
  await ensureTrackingTable();
  const applied = await getApplied();
  const all = listMigrations();
  const pending = all.filter((m) => !applied.has(m.version));
  if (pending.length === 0) {
    console.log('No pending migrations. Schema is up to date.');
    await getPool().end();
    return;
  }
  console.log(`Applying ${pending.length} migration(s)...`);
  for (const m of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, m.filename), 'utf8');
    await executeWithRetry(async (tx) => {
      // Run migration inside its own transaction; on CockroachDB retry the
      // whole file is re-applied but CREATE/IF NOT EXISTS guards keep it safe.
      await tx.query(sql);
      await tx.query('INSERT INTO schema_migrations (version, description) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING', [m.version, m.filename]);
    });
    console.log(`  ${m.version.toString().padStart(3, '0')}  ${m.filename}  OK`);
  }
  console.log(`\nApplied ${pending.length} migration(s).`);
  await getPool().end();
  process.exit(0);
}

const SEED_SQL = [
  // Localities used by the locality picker / resident profiles.
  `INSERT INTO locality (id, name, pincode, lat, lng) VALUES
   ('gudalur-town', 'Gudalur Town', '643212', 11.4438, 76.1330),
   ('kundah', 'Kundah', '643213', 11.5000, 76.2000),
   ('kodanadu', 'Kodanadu', '643211', 11.3000, 76.0000)
   ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
  // Ensure the authoritative global stats row is seeded (002 also does this,
  // but seeding must work on an empty DB without migration files either).
  `INSERT INTO manifesto_stats (id, signature_count, submission_count, last_updated)
   VALUES ('global', 0, 0, now()) ON CONFLICT (id) DO NOTHING`,
  // Uidai public-key placeholder (the app fetches this; dev uses a no-op).
  `INSERT INTO app_config (key, value, description)
   VALUES ('uidai_spki_keys', '[]', 'Placeholder; populated in production')
   ON CONFLICT (key) DO NOTHING`,
];

export async function seed(): Promise<void> {
  await ensureTrackingTable();
  console.log('Seeding development database...');
  for (const sql of SEED_SQL) {
    await executeWithRetry(async (tx) => { await tx.query(sql); });
  }
  console.log('Seed complete.');
  await getPool().end();
  process.exit(0);
}

const cmd = process.argv[2];
if (!cmd || !['up', 'status', 'seed'].includes(cmd)) {
  console.error('Usage: npx tsx server/db/migrate.ts <up|status|seed>');
  process.exit(2);
}
if (cmd === 'up') void up();
else if (cmd === 'status') void status();
else void seed();
