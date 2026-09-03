/**
 * Voice of Gudalur — offline intent ledger (localStorage).
 *
 * Preserves the citizen's action when the API is unreachable: signatures and
 * docket submissions are queued locally and can be retried when connectivity
 * returns. This replaces the pending-queue helpers that lived in the deleted
 * Supabase facade; the queue now feeds the CockroachDB-backed API.
 */

const PENDING_KEY = 'og_pending_ledger';
const PENDING_EMAILS_KEY = 'og_pending_emails';

export type PendingKind = 'signature' | 'submission';

export interface PendingLedgerItem {
  kind: PendingKind;
  payload: Record<string, unknown>;
  /** Local docket ref for submissions (kept for the PDF proof flow). */
  ref?: string;
  ts: number;
}

function readAll(): PendingLedgerItem[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: PendingLedgerItem[]): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(items.slice(-500)));
  } catch {
    /* storage full/unavailable — non-fatal */
  }
}

/** Queue a pending endorsement or docket submission. */
export function savePendingSignature(item: {
  kind: PendingKind;
  payload: Record<string, unknown>;
  ref?: string;
}): void {
  const items = readAll();
  items.push({ ...item, ts: Date.now() });
  writeAll(items);
}

/** Number of locally-pending ledger intents (shown so counters never read zero-by-failure). */
export function getPendingLedgerCount(): number {
  return readAll().length;
}

export function getPendingLedgerItems(): PendingLedgerItem[] {
  return readAll();
}

export function clearPendingLedger(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch { /* noop */ }
}

/** Local fallback docket ref for submissions recorded while offline. */
export function generateEmailRef(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `VG-${ymd}-${rand}`;
}

/** Pending email-submission receipts (kept so a submission is never lost). */
export function savePendingEmailReceipt(record: Record<string, unknown>): void {
  try {
    const existing = JSON.parse(localStorage.getItem(PENDING_EMAILS_KEY) || '[]');
    existing.push({ ...record, ts: Date.now() });
    localStorage.setItem(PENDING_EMAILS_KEY, JSON.stringify(existing.slice(-200)));
  } catch { /* noop */ }
}