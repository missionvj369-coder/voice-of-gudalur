/**
 * Open Civic Signature Protocol — server-side cryptographic signature hash.
 *
 * Batch 5/9. The signature hash is a server-generated AUDIT IDENTIFIER — it is
 * NOT the uniqueness mechanism (the DB enforces uniqueness on
 * (petition_id, mobile_identity_hash)).
 *
 * Construction (documented exactly — see CIVIC_SIGNATURE_PROTOCOL.md §8):
 *
 *   signature_hash = HMAC-SHA-256(
 *       VERIFICATION_IDENTITY_SECRET (or PETITION_IDENTITY_SECRET),
 *       "open-civic-signature:v1:signature\n" +
 *       petitionId + "\n" +
 *       identityKeyHash + "\n" +
 *       civicSignId   + "\n" +
 *       provider      + "\n" +
 *       assuranceLevel
 *   )
 *
 * - Canonical: one stable order, exact separators, UTF-8.
 * - The HMAC input contains NO name, no raw number, no PII — only the
 *   non-reversible identityKeyHash and the public civicSignId.
 * - Re-computation by an auditor with the secret reproduces the hash,
 *   proving the server created it for that exact signature lineage.
 * - The same canonical input always yields the same hash (deterministic);
 *   collisions require a collision in the secret-kept HMAC, not in the input.
 */
import crypto from 'crypto';

const SIGNATURE_HASH_DOMAIN = 'open-civic-signature:v1:signature';

function signatureSecret(): string | null {
  const secret = process.env.VERIFICATION_IDENTITY_SECRET || process.env.PETITION_IDENTITY_SECRET || null;
  return secret && secret.length >= 32 ? secret : null;
}

export interface SignatureHashInput {
  petitionId: string;
  identityKeyHash: string;
  civicSignId: string;
  provider: string;
  assuranceLevel: number;
}

export function isSignatureHashConfigured(): boolean {
  return signatureSecret() !== null;
}

export function computeSignatureHash(input: SignatureHashInput): string {
  const secret = signatureSecret();
  if (!secret) {
    throw new Error('VERIFICATION_IDENTITY_SECRET (or PETITION_IDENTITY_SECRET) not configured (need 32+ chars)');
  }
  const canonical = [
    SIGNATURE_HASH_DOMAIN,
    input.petitionId,
    input.identityKeyHash,
    input.civicSignId,
    input.provider,
    String(input.assuranceLevel),
  ].join('\n');
  return crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
}

/**
 * Public anonymized signature identifier — the ONLY signature-identifying
 * value returned to public endpoints after a sign.
 * Format: VOG-A1B2C3 (tag + 6 hex chars). Short, unique (DB-unique), and
 * reversible to nothing: it is a random token, not a hash of private data.
 */
export function generateCivicSignId(petitionTag = 'VOG'): string {
  return `${petitionTag}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}