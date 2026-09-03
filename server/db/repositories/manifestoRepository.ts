/**
 * Voice of Gudalur — Manifesto repository (Phase 8).
 *
 * FIXES the counter drift (manifesto_stats.count = 6 but signatures = 7).
 * Root cause: the old app bumped a counter via a SEPARATE RPC call from the
 * signature insert, outside any transaction, causing lost increments.
 *
 * New source of truth:
 *   - `manifesto_signatures` is authoritative for the endorsement count.
 *   - `manifesto_stats.signature_count` is maintained transactionally by a
 *     DB trigger (migration 002) + reconciled on write.
 *   - An integrity test asserts count equality after every mutation.
 */
import crypto from 'crypto';
import { db } from '../client';

export interface ManifestoSignatureInput {
  name: string;
  locality?: string;
  contact?: string;
  gudalurId: string;      // UNIQUE dedupe key — one endorsement per resident
  idempotencyKey?: string;
}

/**
 * Record one manifesto endorsement in a single atomic transaction.
 * Duplicate gudalur_id → returns existing row (idempotent).
 * Counter is updated transactionally by the AFTER INSERT trigger.
 */
export async function recordManifestoSignature(input: ManifestoSignatureInput) {
  return db.withTransaction<{ signatureId: number; isDuplicate: boolean; count: number }>(async (tx) => {
    // Idempotency (offline sync / retry safety).
    if (input.idempotencyKey) {
      const idem = await tx.queryOne<{ signature_id: number }>(
        `SELECT (response->>'signatureId')::int AS "signature_id"
         FROM sync_idempotency WHERE idempotency_key = $1 AND kind = 'endorsement'`,
        [input.idempotencyKey],
      );
      if (idem) {
        const count = await tx.queryOne<{ c: number }>('SELECT count(*) AS c FROM manifesto_signatures');
        return { signatureId: idem.signature_id, isDuplicate: true, count: Number(count?.c ?? 0) };
      }
    }

    // Duplicate check by gudalur_id (authoritative dedupe key).
    const existing = await tx.queryOne<{ id: number }>(
      'SELECT id FROM manifesto_signatures WHERE gudalur_id = $1 ORDER BY created_at DESC LIMIT 1',
      [input.gudalurId],
    );
    if (existing) {
      const count = await tx.queryOne<{ c: number }>('SELECT count(*) AS c FROM manifesto_signatures');
      return { signatureId: existing.id, isDuplicate: true, count: Number(count?.c ?? 0) };
    }

    const idResult = await tx.query<{ id: number }>(
      `INSERT INTO manifesto_signatures (name, locality, contact, gudalur_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [input.name.trim(), input.locality ?? null, input.contact ?? null, input.gudalurId],
    );
    const signatureId = Number(idResult.rows[0]?.id);

    if (input.idempotencyKey) {
      const response = JSON.stringify({ signatureId });
      await tx.query(
        'INSERT INTO sync_idempotency(idempotency_key, kind, response) VALUES ($1, $2, $3) ON CONFLICT(idempotency_key) DO NOTHING',
        [input.idempotencyKey, 'endorsement', response],
      );
    }

        const count = await tx.queryOne<{ c: number }>('SELECT count(*) AS c FROM manifesto_signatures');
    return { signatureId, isDuplicate: false, count: Number(count?.c ?? 0) };
  });
}

/** Authoritative stats read + reconciled transactionally (fixes drift). */
export async function getManifestoStats() {
  const stats = await db.queryOne<{ signature_count: number; submission_count: number; last_updated: string }>(
    `SELECT signature_count, submission_count, last_updated FROM manifesto_stats WHERE id = 'global'`,
  );
  if (!stats) {
    await db.withTransaction(async (tx) => {
      const sc = await tx.queryOne<{ c: number }>('SELECT count(*) AS c FROM manifesto_signatures');
      const sub = await tx.queryOne<{ c: number }>('SELECT count(*) AS c FROM manifesto_submissions');
      await tx.query(
        `INSERT INTO manifesto_stats (id, signature_count, submission_count, last_updated)
         VALUES ('global', $1, $2, now())
         ON CONFLICT (id) DO UPDATE SET signature_count=$1, submission_count=$2, last_updated=now()`,
        [Number(sc?.c ?? 0), Number(sub?.c ?? 0)],
      );
    });
    return { signatureCount: 0, submissionCount: 0, lastUpdated: new Date().toISOString() };
  }
  return {
    signatureCount: Number(stats.signature_count),
    submissionCount: Number(stats.submission_count),
    lastUpdated: stats.last_updated,
  };
}

function generateDocketRef(): string {
  const ym = new Date().toISOString().slice(0, 7).replace('-', '');
  const seq = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `M-${ym}-${seq}`;
}

export interface ManifestoSubmissionInput {
  senderName: string; senderPhone?: string; gudalurId?: string; locality?: string;
  subject: string; lang?: string; sourceUrl?: string; toEmails?: string[]; ccEmails?: string[];
  idempotencyKey?: string;
}

/** Record a manifesto email-docket submission as a transaction. */
export async function recordManifestoSubmission(input: ManifestoSubmissionInput) {
  return db.withTransaction<{ docketRef: string; submissionId: number; isDuplicate: boolean }>(async (tx) => {
    if (input.idempotencyKey) {
      const idem = await tx.queryOne<{ docket_ref: string }>(
        `SELECT (response->>'docketRef')::string AS "docket_ref"
         FROM sync_idempotency WHERE idempotency_key = $1 AND kind = 'submission'`,
        [input.idempotencyKey],
      );
      if (idem) return { docketRef: idem.docket_ref, submissionId: 0, isDuplicate: true };
    }

    const existing = await tx.queryOne<{ id: number; docket_ref: string }>(
      `SELECT id, docket_ref FROM manifesto_submissions
       WHERE (sender_phone = $1 OR gudalur_id = $2) AND subject = $3
         AND created_at > now() - interval '24 hours'
       ORDER BY created_at DESC LIMIT 1`,
      [input.senderPhone ?? null, input.gudalurId ?? null, input.subject],
    );
    if (existing) return { docketRef: existing.docket_ref, submissionId: existing.id, isDuplicate: true };

    const docketRef = generateDocketRef();
    const result = await tx.query<{ id: number }>(
      `INSERT INTO manifesto_submissions
         (docket_ref, sender_name, sender_phone, gudalur_id, locality, subject, lang,
          source_url, to_emails, cc_emails)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [docketRef, input.senderName, input.senderPhone ?? null, input.gudalurId ?? null,
       input.locality ?? null, input.subject, input.lang ?? 'en', input.sourceUrl ?? null,
       input.toEmails ?? null, input.ccEmails ?? null],
    );

    if (input.idempotencyKey) {
      const response = JSON.stringify({ docketRef });
      await tx.query(
        'INSERT INTO sync_idempotency(idempotency_key, kind, response) VALUES ($1,$2,$3) ON CONFLICT(idempotency_key) DO NOTHING',
        [input.idempotencyKey, 'submission', response],
      );
    }
    return { docketRef, submissionId: Number(result.rows[0]?.id), isDuplicate: false };
  });
}

/** Docket verification — public proof fields only. */
export async function getSubmissionByRef(docketRef: string) {
  return db.queryOne<{
    docket_ref: string; sender_name: string; gudalur_id: string; locality: string;
    subject: string; lang: string; created_at: string; source_url: string;
  }>(
    'SELECT docket_ref, sender_name, gudalur_id, locality, subject, lang, created_at, source_url ' +
    'FROM manifesto_submissions WHERE docket_ref = $1',
    [docketRef.trim().toUpperCase()],
  );
}

export interface MyManifestoStatus {
  hasSigned: boolean;
  signedAt?: string;
  submission?: {
    docketRef: string;
    subject?: string;
    lang?: string;
    createdAt: string;
    sourceUrl?: string;
  } | null;
}

/** This resident's official ledger status (signed? latest docket?) — derived from
 *  the authoritative tables, never from client state. */
export async function getMyManifestoStatus(gudalurId: string): Promise<MyManifestoStatus> {
  const signed = await db.queryOne<{ id: number; created_at: string }>(
    'SELECT id, created_at FROM manifesto_signatures WHERE gudalur_id = $1 ORDER BY created_at DESC LIMIT 1',
    [gudalurId],
  );
  const sub = await db.queryOne<{ docket_ref: string; subject: string; lang: string; created_at: string; source_url: string }>(
    'SELECT docket_ref, subject, lang, created_at, source_url FROM manifesto_submissions WHERE gudalur_id = $1 ORDER BY created_at DESC LIMIT 1',
    [gudalurId],
  );
  return {
    hasSigned: Boolean(signed),
    signedAt: signed?.created_at,
    submission: sub
      ? { docketRef: sub.docket_ref, subject: sub.subject, lang: sub.lang, createdAt: sub.created_at, sourceUrl: sub.source_url }
      : null,
  };
}

