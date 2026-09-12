/**
 * Signing transaction logic.
 * Extracted from the route handler to keep files small.
 */

import type { PrismaClient } from "@prisma/client";
import { appendAuditEvent } from "./audit";
import { generateSecureToken } from "./tokens";
import { generatePublicReference } from "./identity";

export async function executeSigningTx(
  prisma: PrismaClient,
  params: {
    identityId: string;
    keyHash: string;
    requestHash: string;
    displayMode: string;
    displayName: string | null;
    area: string | null;
    consentVersion: string;
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
          response: { success: false, error: "Idempotency key reused with different body" },
          statusCode: 409,
        };
      }

      const petition = await tx.petition.findFirst({
        where: { status: "active" },
        select: { id: true, consent_version: true },
      });

      if (!petition) {
        return { response: { success: false, error: "No active petition" }, statusCode: 404 };
      }

      if (params.consentVersion !== petition.consent_version) {
        return { response: { success: false, error: "Consent version mismatch" }, statusCode: 400 };
      }

      // One-sign enforcement
      const existing = await tx.signature.findUnique({
        where: {
          petition_id_identity_id: {
            petition_id: petition.id,
            identity_id: params.identityId,
          },
        },
        select: { id: true, public_reference: true },
      });

      if (existing) {
        return {
          response: { success: false, error: "Already signed", publicReference: existing.public_reference },
          statusCode: 409,
        };
      }

      const publicReference = generatePublicReference();

      const signature = await tx.signature.create({
        data: {
          petition_id: petition.id,
          identity_id: params.identityId,
          public_reference: publicReference,
          public_display_mode: params.displayMode,
          display_name: params.displayName,
          area: params.area,
          status: "SIGNED",
          consent_version: params.consentVersion,
        },
        select: { id: true, public_reference: true, status: true, signed_at: true },
      });

      // Create validation link
      const { rawToken, tokenHash } = generateSecureToken();
      await tx.validationLink.create({
        data: {
          signature_id: signature.id,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: "active",
        },
      });

      // Store idempotency key
      const responseBody = JSON.stringify({
        success: true,
        publicReference: signature.public_reference,
        status: signature.status,
        signedAt: signature.signed_at.toISOString(),
        validationToken: rawToken,
      });

      await tx.idempotencyKey.create({
        data: {
          identity_id: params.identityId,
          endpoint: "petition:sign",
          key_hash: params.keyHash,
          request_hash: params.requestHash,
          response_status: 200,
          response_body_redacted: responseBody.replace(rawToken, "[REDACTED_TOKEN]"),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await appendAuditEvent(tx, {
        eventType: "signature.created",
        actorType: "identity",
        actorId: params.identityId,
        objectType: "signature",
        objectId: signature.id,
        requestId: params.requestId,
        metadata: { publicReference },
      });

      return {
        response: {
          success: true,
          publicReference: signature.public_reference,
          status: signature.status,
          signedAt: signature.signed_at.toISOString(),
          validationToken: rawToken,
        },
        statusCode: 200,
      };
    });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { response: { success: false, error: "Already signed" }, statusCode: 409 };
    }
    throw error;
  }
}
