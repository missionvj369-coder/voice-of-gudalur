/**
 * POST /api/validation/create
 * Create a new validation link for a signature.
 * Requires authentication. Only the signature owner can create a link.
 */

import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { generateRequestId, generateSecureToken } from "../../../../../lib/security/tokens";
import { checkRateLimit } from "../../../../../lib/security/rate-limit";
import { validateSession } from "../../../../../lib/auth/session";
import { checkCsrf } from "../../../../../lib/security/csrf-helper";
import { appendAuditEvent } from "../../../../../lib/security/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = generateRequestId();

  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401, headers: { "X-Request-ID": requestId } }
      );
    }

    // CSRF protection
    const csrfResult = checkCsrf(request);
    if (!csrfResult.passed) {
      return NextResponse.json(
        { success: false, error: "Invalid CSRF token" },
        { status: 403, headers: { "X-Request-ID": requestId } }
      );
    }

    const rateResult = await checkRateLimit(session.identityId, "validation:create");
    if (!rateResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429, headers: { "X-Request-ID": requestId, "Retry-After": String(rateResult.retryAfter || 60) } }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      signatureId?: string;
    } | null;

    if (!body?.signatureId) {
      return NextResponse.json(
        { success: false, error: "signatureId is required" },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    // Verify the signature belongs to this identity
    const signature = await prisma.signature.findFirst({
      where: {
        id: body.signatureId,
        identity_id: session.identityId,
      },
      select: { id: true, status: true },
    });

    if (!signature) {
      return NextResponse.json(
        { success: false, error: "Signature not found" },
        { status: 404, headers: { "X-Request-ID": requestId } }
      );
    }

    // Revoke any existing active links for this signature
    await prisma.validationLink.updateMany({
      where: {
        signature_id: signature.id,
        status: "active",
      },
      data: {
        status: "revoked",
        revoked_at: new Date(),
      },
    });

    // Create new validation link
    const { rawToken, tokenHash } = generateSecureToken();
    await prisma.validationLink.create({
      data: {
        signature_id: signature.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "active",
      },
    });

    await appendAuditEvent(prisma, {
      eventType: "validation_link.created",
      actorType: "identity",
      actorId: session.identityId,
      objectType: "validation_link",
      objectId: signature.id,
      requestId,
    });

    return NextResponse.json(
      {
        success: true,
        validationToken: rawToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { status: 200, headers: { "X-Request-ID": requestId } }
    );
  } catch (error) {
    console.error(`[${requestId}] Validation create error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to create validation link" },
      { status: 500, headers: { "X-Request-ID": requestId } }
    );
  }
}

async function authenticateRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").reduce<Record<string, string>>((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    if (key && value) acc[key] = value;
    return acc;
  }, {});
  const sessionToken = cookies["vog_session"];
  if (!sessionToken) return null;
  return validateSession(sessionToken);
}
