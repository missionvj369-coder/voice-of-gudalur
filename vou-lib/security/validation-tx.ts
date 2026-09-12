/**
 * Validation transaction logic.
 * Handles witness validation with all security checks.
 */

import type { PrismaClient } from "@prisma/client";
import { appendAuditEvent } from "./audit";
import { recordRiskEvent } from "./risk";
import { checkValidationEligibility } from "./validation-graph";

export async function executeValidationTx(
  prisma: PrismaClient,
  params: {
    witnessIdentityId: string;
    signatureId: string;
    petitionId: string;
    linkId: string;
    signerIdentityId: string;
    keyHash: string;
    requestHash: string;
    requestId: string;
  }
): Promise<{ response: Record<string, unknown>; statusCode: number; replay?: boolean }> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Idempotency check INSIDE the transaction (atomic with insert)
      const existingKey = await tx.idempotencyKey.findUnique({
        where: { key_hash: params.keyHash },
      });

      if (existingKey) {
        if (existingKey.request_hash === params.requestHash) {
          return {
            response: JSON.parse(existingKey.response_body_redacted),
            statusCode: existingKey.response_status,
            replay: true,
          };
        }
        return {
          response: { success: false, error: "Idempotency key reused" },
          statusCode: 409,
        };
      }

      // Check eligibility
      const eligibilityError = await checkValidationEligibility(
        tx,
        params.petitionId,
        params.signatureId,
        params.witnessIdentityId
      );

      if (eligibilityError) {
        await recordRiskEvent(tx, {
          identityId: params.witnessIdentityId,
          eventType: eligibilityError.includes("self") ? "self_validation_attempt"
            : eligibilityError.includes("Circular") ? "circular_validation_attempt"
            : "validation_attempt_blocked",
          riskLevel: "medium",
          metadata: { reason: eligibilityError },
        });
        return { response: { success: false, error: eligibilityError }, statusCode: 400 };
      }

      // Mark link as used — only if still active (prevents concurrent replay)
      const marked = await tx.validationLink.updateMany({
        where: { id: params.linkId, status: "active" },
        data: { status: "used", used_at: new Date() },
      });

      if (marked.count === 0) {
        return { response: { success: false, error: "Invalid or expired validation link" }, statusCode: 400 };
      }

      // Create validation
      await tx.validation.create({
        data: {
          petition_id: params.petitionId,
          signature_id: params.signatureId,
          witness_identity_id: params.witnessIdentityId,
          status: "accepted",
        },
      });

      // Update signature status
      await tx.signature.update({
        where: { id: params.signatureId },
        data: { status: "COMMUNITY_VALIDATED" },
      });

      // Store idempotency key
      const responseBody = JSON.stringify({ success: true, status: "COMMUNITY_VALIDATED" });
      await tx.idempotencyKey.create({
        data: {
          identity_id: params.witnessIdentityId,
          endpoint: "validation:accept",
          key_hash: params.keyHash,
          request_hash: params.requestHash,
          response_status: 200,
          response_body_redacted: responseBody,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await appendAuditEvent(tx, {
        eventType: "validation.accepted",
        actorType: "identity",
        actorId: params.witnessIdentityId,
        objectType: "validation",
        objectId: params.signatureId,
        requestId: params.requestId,
        metadata: { petitionId: params.petitionId },
      });

      return { response: { success: true, status: "COMMUNITY_VALIDATED" }, statusCode: 200 };
    });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { response: { success: false, error: "Already validated" }, statusCode: 409 };
    }
    throw error;
  }
}
