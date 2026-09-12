/**
 * Risk event recording for abuse detection.
 * 
 * Risk signals are used to flag suspicious behavior, not as absolute identity.
 * Events are recorded with redacted metadata (no PII).
 */

import type { Prisma } from "@prisma/client";

type DbClient = Prisma.TransactionClient;

export type RiskEventType =
  | "rapid_signing"
  | "rapid_validation"
  | "multiple_identities_same_ip"
  | "failed_auth_repeated"
  | "token_guess_attempt"
  | "circular_validation_attempt"
  | "self_validation_attempt"
  | "rate_limit_exceeded"
  | "suspicious_user_agent"
  | "idempotency_key_reuse"
  | "validation_attempt_blocked";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RiskEventInput = {
  identityId?: string;
  eventType: RiskEventType;
  riskLevel: RiskLevel;
  metadata?: Record<string, unknown>;
};

/**
 * Record a risk event.
 */
export async function recordRiskEvent(
  prisma: DbClient,
  input: RiskEventInput
): Promise<void> {
  const redactedMetadata = redactRiskMetadata(input.metadata);

  await prisma.riskEvent.create({
    data: {
      identity_id: input.identityId || null,
      event_type: input.eventType,
      risk_level: input.riskLevel,
      redacted_metadata: JSON.stringify(redactedMetadata),
    },
  });
}

/**
 * Calculate a risk score for an identity based on recent events.
 * Returns a score from 0 (no risk) to 100 (maximum risk).
 */
export async function calculateRiskScore(
  prisma: DbClient,
  identityId: string
): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

  const events = await prisma.riskEvent.findMany({
    where: {
      identity_id: identityId,
      created_at: { gte: since },
    },
    select: { risk_level: true, created_at: true },
  });

  let score = 0;
  const now = Date.now();

  for (const event of events) {
    const ageHours = (now - event.created_at.getTime()) / (60 * 60 * 1000);
    const recencyWeight = Math.max(0, 1 - ageHours / 24); // Decay over 24h

    switch (event.risk_level) {
      case "low":
        score += 5 * recencyWeight;
        break;
      case "medium":
        score += 15 * recencyWeight;
        break;
      case "high":
        score += 30 * recencyWeight;
        break;
      case "critical":
        score += 50 * recencyWeight;
        break;
    }
  }

  return Math.min(100, Math.round(score));
}

/**
 * Check if an identity should be blocked based on risk score.
 */
export async function isBlockedByRisk(
  prisma: DbClient,
  identityId: string
): Promise<{ blocked: boolean; score: number }> {
  const score = await calculateRiskScore(prisma, identityId);
  return { blocked: score >= 80, score };
}

/**
 * Redact sensitive data from risk metadata.
 */
function redactRiskMetadata(
  metadata?: Record<string, unknown>
): Record<string, unknown> {
  if (!metadata) return {};

  const sensitiveKeys = [
    "phone", "email", "ip", "token", "password", "secret",
    "authorization", "cookie", "fingerprint",
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
