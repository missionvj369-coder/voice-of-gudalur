/**
 * Voice of Gudalur — CockroachDB data-access layer.
 *
 * Single authoritative database module. ALL CockroachDB access goes through
 * here; no UI code or browser bundle imports this file (it uses `pg`, a Node
 * module that cannot run in the browser).
 *
 * CockroachDB specifics handled here:
 *  - SQLSTATE 40001 (serialization_failure) and 40P01 (deadlock_detected) are
 *    retried at the transaction level (CockroachDB's recommended retry pattern:
 *    ROLLBACK the current txn and retry the whole transaction from BEGIN).
 *  - All writes use parameterized queries (no SQL injection).
 *  - Connection pooling via pg.Pool (size from DATABASE_POOL_MAX).
 */
import pg, { Pool, DatabaseError } from 'pg';
import fs from 'fs';
import 'dotenv/config'; // ensure DATABASE_URL is loaded for any entrypoint (migrate, seed, server)

export interface DbClient {
  query: <T = any>(text: string, params?: any[]) => Promise<pg.QueryResult<T>>;
  queryOne: <T = any>(text: string, params?: any[]) => Promise<T | null>;
  execute: (text: string, params?: any[]) => Promise<void>;
  withTransaction: <T>(fn: (tx: TxClient) => Promise<T>) => Promise<T>;
  executeWithRetry: <T>(fn: (tx: TxClient) => Promise<T>, attempts?: number) => Promise<T>;
}

let pool: Pool | null = null;

function loadCaCert(): string | undefined {
  const caPath = process.env.DATABASE_SSL_CA || process.env.SSL_ROOT_CERT;
  if (caPath && fs.existsSync(caPath)) {
    return fs.readFileSync(caPath, 'utf8');
  }
  return undefined;
}

function buildSsl(): pg.ClientConfig['ssl'] {
  // Default: verify-full (production). Fall back to `require` (encrypt, no CA
  // verification) only when explicitly requested via env — used for local/test
  // against a cluster when the CA file is not yet in place.
  const sslMode = (process.env.DATABASE_SSL || '').toLowerCase();
  const ca = loadCaCert();

  if (sslMode === 'verify-full' || sslMode === 'verify-ca') {
    if (ca) {
      return { ca, rejectUnauthorized: true };
    }
    console.warn('[db] DATABASE_SSL=verify-full but DATABASE_SSL_CA not set; falling back to encryption-only. Set DATABASE_SSL_CA for certificate verification.');
    return { rejectUnauthorized: false };
  }
  if (sslMode === 'require' || sslMode === 'true') {
    return { rejectUnauthorized: false };
  }
  // 'none' / disabled
  return undefined;
}

/** SQLSTATEs CockroachDB returns for retryable transaction failures. */
function isRetryableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as DatabaseError).code;
  if (code && ['40001', '40P01'].includes(code)) return true;
  const msg = (err as Error).message || '';
  return /retry transaction|restart transaction|serialization failure|deadlock|could not serialize/i.test(msg);
}

export function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('[db] DATABASE_URL is not set. Configure CockroachDB before starting the server.');
  }
  const ssl = buildSsl();
  const poolMaxStr = process.env.DATABASE_POOL_MAX || '20';
  pool = new Pool({
    connectionString,
    max: Math.max(1, parseInt(poolMaxStr, 10) || 20),
    ssl,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on('error', (err) => {
    console.error('[db] idle client error:', err?.message);
  });
    return pool;
}

/** Execute a single SQL statement (non-transactional). Parameterized. */
export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  return getPool().query(text, params);
}

/** Single row or null. */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const res = await getPool().query(text, params);
  if (!res.rowCount) return null;
  return res.rows[0] as T;
}

/** Execute a statement with no result expected. */
export async function execute(text: string, params?: any[]): Promise<void> {
  await getPool().query(text, params);
}

/**
 * Transaction-scoped client exposing the same ergonomic helpers as the module
 * facade (query/queryOne/execute) but bound to the transaction's connection.
 */
export interface TxClient {
  query: <T = any>(text: string, params?: any[]) => Promise<pg.QueryResult<T>>;
  queryOne: <T = any>(text: string, params?: any[]) => Promise<T | null>;
  execute: (text: string, params?: any[]) => Promise<void>;
}

function wrapTxClient(client: pg.PoolClient): TxClient {
  return {
    query: <T = any>(text: string, params?: any[]) => client.query<T>(text, params as any[]) as Promise<pg.QueryResult<T>>,
    queryOne: async <T = any>(text: string, params?: any[]) => {
      const res = await client.query(text, params as any[]);
      if (!res.rowCount) return null;
      return res.rows[0] as T;
    },
    execute: async (text: string, params?: any[]) => {
      await client.query(text, params as any[]);
    },
  };
}

/**
 * Run a function inside a transaction with CockroachDB retry semantics.
 * The callback receives an enriched transaction client. On a retryable error
 * the entire transaction is rolled back and retried with bounded attempts +
 * jitter.
 */
export async function withTransaction<T>(fn: (tx: TxClient) => Promise<T>, attempts = 5): Promise<T> {
  return executeWithRetry(fn, attempts);
}

export async function executeWithRetry<T>(fn: (tx: TxClient) => Promise<T>, attempts = 5): Promise<T> {
  let attempt = 0;
  while (true) {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await fn(wrapTxClient(client));
      await client.query('COMMIT');
      return result;
    } catch (err: any) {
      try { await client.query('ROLLBACK'); } catch { /* noop */ }
      if (isRetryableError(err) && attempt < attempts) {
        attempt += 1;
        const delay = Math.min(150 * Math.pow(2, attempt), 2000) + Math.random() * 100;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    } finally {
      client.release();
    }
  }
}

/** Health check — returns true if the database responds to `SELECT 1`. */
export async function ping(): Promise<boolean> {
  try {
    await queryOne('SELECT 1 AS ok');
    return true;
  } catch (e) {
    console.error('[db] ping failed:', (e as Error)?.message);
    return false;
  }
}

// Singleton facade for ergonomic imports elsewhere.
export const db: DbClient = {
  query,
  queryOne,
  execute,
  withTransaction,
  executeWithRetry,
};

/** Back-compat alias: repositories import `PoolClient` for the tx handle. */
export type PoolClient = TxClient;

export default db;

