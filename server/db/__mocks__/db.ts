/**
 * In-memory mock of the CockroachDB client for hermetic backend unit tests.
 */
import type { DbClient, TxClient } from '../client';
import type { QueryResult } from 'pg';

type Row = Record<string, unknown>;
type Table = Map<string, Row>;
const tables = new Map<string, Table>();

function table(name: string): Table {
  if (!tables.has(name)) tables.set(name, new Map());
  return tables.get(name)!;
}

export function __resetMockDb(): void { tables.clear(); }
export function __seedTable(name: string, rows: Row[], pk = 'id'): void {
  const t = table(name);
  for (const r of rows) t.set(String(r[pk]), r);
}
export function __readTable(name: string): Row[] { return Array.from(table(name).values()); }

function matchesWhere(row: Row, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([k, v]) => row[k] === v);
}

function toResult<T>(rows: T[]): QueryResult<T> {
  return { rows, rowCount: rows.length, command: 'SELECT', oid: 0, fields: [] } as unknown as QueryResult<T>;
}

export const mockDb: DbClient = {
  async query<T = any>(text: string, _params?: any[]): Promise<QueryResult<T>> {
    const m = /FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+LIMIT\s+\d+)?$/i.exec(text);
    if (!m) return toResult<T>([]);
    const tbl = m[1];
    const all = __readTable(tbl) as T[];
    if (!m[2]) return toResult<T>(all);
    const where: Record<string, unknown> = {};
    for (const clause of m[2].split(/\s+AND\s+/i)) {
      const cm = /(\w+)\s*=\s*\$(\d+)/i.exec(clause.trim());
      if (cm && _params) where[cm[1]] = _params[Number(cm[2]) - 1];
    }
    return toResult<T>(all.filter((r) => matchesWhere(r as Row, where)));
  },
  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const res = await mockDb.query<T>(text, params);
    return res.rows[0] ?? null;
  },
  async execute(): Promise<void> { /* noop */ },
  async withTransaction<T>(fn: (tx: TxClient) => Promise<T>): Promise<T> {
    return fn(this as unknown as TxClient);
  },
  async executeWithRetry<T>(fn: (tx: TxClient) => Promise<T>): Promise<T> {
    return fn(this as unknown as TxClient);
  },
};

export default mockDb;
