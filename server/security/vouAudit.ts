/**
 * Hash-chained audit logging.
 * 
 * Each audit event includes the hash of the previous event's hash,
 * creating a tamper-evident chain. If any event is altered or removed,
 * the chain breaks.
 */

import { createHash, randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";

// Transaction client type — compatible with both PrismaClient and $transaction callback
type DbClient = Prisma.TransactionClient;

export type AuditEventType =
  | "identity.created"
  | "identity.authenticated"
  | "identity.suspended"
  | "signature.created"
  | "signature.status_changed"
  | "signature.revoked"
  | "validation_link.created"
  | "validation_link.used"
  | "validation_link.expired"
  | "validation.accepted"
  | "validation.rejected"
  | "admin_review.created"
  | "admin_review.resolved"
  | "risk_event.recorded"
  | "rate_limit.exceeded"
  | "security.alert";

export type AuditInput = {
  eventType: AuditEventType;
  actorType: "identity" | "admin" | "system";
  actorId?: string;
  objectType: string;
  objectId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>; // Will be redacted before storage
};

/**
 * Append an audit event to the hash chain.
 * Returns the event hash for verification.
 */
export async function appendAuditEvent(
  prisma: DbClient,
  input: AuditInput
): Promise<string> {
  // Get the previous event's hash
  const previousEvent = await prisma.auditEvent.findFirst({
    orderBy: { created_at: "desc" },
    select: { event_hash: true },
  });

  const previousHash = previousEvent?.event_hash || null;

  // Build the event data string for hashing
  const eventId = randomUUID();
  const eventData = JSON.stringify({
    eventId,
    eventType: input.eventType,
    actorType: input.actorType,
    actorId: input.actorId || null,
    objectType: input.objectType,
    objectId: input.objectId || null,
    requestId: input.requestId || null,
    timestamp: new Date().toISOString(),
    metadata: redactMetadata(input.metadata),
  });

  // Compute event hash: SHA-256(eventData + previousHash)
  const eventHash = createHash("sha256")
    .update(eventData + (previousHash || "genesis"))
    .digest("hex");

  await prisma.auditEvent.create({
    data: {
      event_id: eventId,
      event_type: input.eventType,
      actor_type: input.actorType,
      actor_id: input.actorId || null,
      object_type: input.objectType,
      object_id: input.objectId || null,
      request_id: input.requestId || null,
      previous_hash: previousHash,
      event_hash: eventHash,
      metadata: JSON.stringify(redactMetadata(input.metadata)),
    },
  });

  return eventHash;
}

/**
 * Verify the integrity of the audit chain.
 * Returns true if the chain is intact.
 */
export async function verifyAuditChain(
  prisma: DbClient
): Promise<{ valid: false; brokenAt?: string } | { valid: true }> {
  const events = await prisma.auditEvent.findMany({
    orderBy: { created_at: "asc" },
    select: {
      event_id: true,
      event_type: true,
      actor_type: true,
      actor_id: true,
      object_type: true,
      object_id: true,
      request_id: true,
      metadata: true,
      previous_hash: true,
      event_hash: true,
      created_at: true,
    },
  });

  let previousHash: string | null = null;

  for (const event of events) {
    if (event.previous_hash !== previousHash) {
      return { valid: false, brokenAt: event.event_id };
    }

    let storedMetadata: Record<string, unknown> = {};
    if (event.metadata) {
      try {
        storedMetadata = JSON.parse(event.metadata);
      } catch {
        return { valid: false, brokenAt: event.event_id };
      }
    }

    const eventData = JSON.stringify({
      eventId: event.event_id,
      eventType: event.event_type,
      actorType: event.actor_type,
      actorId: event.actor_id,
      objectType: event.object_type,
      objectId: event.object_id,
      requestId: event.request_id,
      timestamp: event.created_at.toISOString(),
      metadata: storedMetadata,
    });

    const expectedHash: string = createHash("sha256")
      .update(eventData + (previousHash || "genesis"))
      .digest("hex");

    if (expectedHash !== event.event_hash) {
      return { valid: false, brokenAt: event.event_id };
    }

    previousHash = event.event_hash;
  }

  return { valid: true };
}

/**
 * Redact sensitive fields from audit metadata.
 */
function redactMetadata(
  metadata?: Record<string, unknown>
): Record<string, unknown> {
  if (!metadata) return {};

  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "otp",
    "phone",
    "email",
    "ip",
    "authorization",
    "cookie",
  ];

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      redacted[key] = "[REDACTED]";
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}
