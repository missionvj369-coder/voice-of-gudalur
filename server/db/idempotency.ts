/**
 * Parse the JSON payload stored in sync_idempotency.response.
 *
 * The column is declared STRING (JSON text). Older query code used the JSONB
 * `->>` operator directly on it, which CockroachDB rejects with
 * `unsupported binary operator: <string ->> string>` — breaking EVERY
 * idempotent write (petition signs, manifesto endorsements, wildlife sync).
 * Select `response` and parse here instead; this also keeps working if the
 * column is ever migrated to JSONB (pg then returns an object).
 */
export function parseIdemResponse<T = Record<string, unknown>>(response: unknown): T | null {
  if (response == null) return null;
  if (typeof response !== 'string') return response as T;
  try {
    return JSON.parse(response) as T;
  } catch {
    return null;
  }
}