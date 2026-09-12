/**
 * Main authentication service.
 * Orchestrates provider validation, identity creation/lookup, and session management.
 */

import type { PrismaClient } from "@prisma/client";
import type { CreateSessionInput, VerifiedIdentity } from "./types";
import { authenticateGoogle } from "./providers/google";
import { authenticateTelegram } from "./providers/telegram";
import { verifyOtp } from "./providers/phone-otp";
import { completeCamaraAuth } from "./providers/camara";
import { createSession, validateSession, destroySession } from "./session";
import {
  generatePhoneIdentityKey,
  generateProviderIdentityKey,
  hashProviderSubject,
  hashPhoneE164,
} from "../security/identity";
import { appendAuditEvent } from "../security/audit";

export async function createUserSession(
  prisma: PrismaClient,
  input: CreateSessionInput,
  requestId: string
): Promise<
  | { success: true; sessionToken: string; identityId: string; assuranceLevel: string; phoneVerified: boolean }
  | { success: false; error: string }
> {
  // Step 1: Validate with the provider
  let result: { success: true; identity: VerifiedIdentity } | { success: false; error: string };

  switch (input.provider) {
    case "google":
      result = await authenticateGoogle({ idToken: input.idToken, nonce: input.nonce });
      break;
    case "telegram":
      result = await authenticateTelegram({ payload: input.payload });
      break;
    case "phone_otp":
      result = await verifyOtp({
        phoneE164: input.phoneE164,
        otp: input.otp,
        requestId: input.requestId,
      });
      break;
    case "camara":
      result = await completeCamaraAuth({ accessToken: input.accessToken, nonce: input.nonce });
      break;
    case "manual":
      // Manual review fallback — requires admin token
      result = await handleManualAuth(input.adminToken, input.reason);
      break;
    default:
      return { success: false, error: "Unknown authentication provider" };
  }

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const identity = result.identity;

  // Step 2: Compute identity key and hashes
  const providerSubjectHash = hashProviderSubject(identity.providerSubject);
  let identityKey: string;
  let phoneE164Hash: string | null = null;

  if (identity.phoneVerified && identity.phoneE164) {
    identityKey = generatePhoneIdentityKey(identity.phoneE164);
    phoneE164Hash = hashPhoneE164(identity.phoneE164);
  } else {
    identityKey = generateProviderIdentityKey(identity.provider, providerSubjectHash);
  }

  // Step 3: Find or create the identity record
  let identityRecord = await prisma.identity.findUnique({
    where: { identity_key: identityKey },
  });

  if (!identityRecord) {
    // Also check by provider + subject hash (in case identity_key computation changed)
    identityRecord = await prisma.identity.findUnique({
      where: {
        provider_provider_subject_hash: {
          provider: identity.provider,
          provider_subject_hash: providerSubjectHash,
        },
      },
    });
  }

  if (!identityRecord) {
    // Create new identity
    identityRecord = await prisma.identity.create({
      data: {
        provider: identity.provider,
        provider_subject_hash: providerSubjectHash,
        identity_key: identityKey,
        phone_verified: identity.phoneVerified,
        phone_e164_hash: phoneE164Hash,
        assurance_level: identity.assuranceLevel,
        status: "active",
      },
    });

    await appendAuditEvent(prisma, {
      eventType: "identity.created",
      actorType: "identity",
      actorId: identityRecord.id,
      objectType: "identity",
      objectId: identityRecord.id,
      requestId,
    });
  }

  // Step 4: Check identity status
  if (identityRecord.status !== "active") {
    return { success: false, error: "Identity is not active" };
  }

  // Step 5: Create session
  const sessionToken = await createSession(
    prisma,
    identity,
    identityRecord.id,
    identityKey
  );

  await appendAuditEvent(prisma, {
    eventType: "identity.authenticated",
    actorType: "identity",
    actorId: identityRecord.id,
    objectType: "identity",
    objectId: identityRecord.id,
    requestId,
    metadata: { provider: identity.provider, assuranceLevel: identity.assuranceLevel },
  });

  return {
    success: true,
    sessionToken,
    identityId: identityRecord.id,
    assuranceLevel: identity.assuranceLevel,
    phoneVerified: identity.phoneVerified,
  };
}

export { validateSession, destroySession };

async function handleManualAuth(
  adminToken: string,
  _reason: string
): Promise<{ success: true; identity: VerifiedIdentity } | { success: false; error: string }> {
  // Manual auth requires a valid admin token
  const expectedToken = process.env.MANUAL_AUTH_ADMIN_TOKEN;
  if (!expectedToken || adminToken !== expectedToken) {
    return { success: false, error: "Invalid admin token for manual authentication" };
  }

  // Manual auth creates a low-assurance identity
  // In production, this would involve a human review step
  const identity: VerifiedIdentity = {
    provider: "manual",
    providerSubject: `manual-${Date.now()}`,
    phoneVerified: false,
    assuranceLevel: "low",
    verifiedAt: new Date().toISOString(),
  };

  return { success: true, identity };
}
