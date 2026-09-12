/**
 * POST /api/validation/reject
 * Reject a validation link (witness declines to validate).
 * Requires authentication.
 */

import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { generateRequestId, hashToken } from "../../../../../lib/security/tokens";
import { checkRateLimit } from "../../../../../lib/security/rate-limit";
import { validateSession } from "../../../../../lib/auth/session";
import { appendAuditEvent } from "../../../../../lib/security/audit";
import { checkCsrf } from "../../../../../lib/security/csrf-helper";

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

    const rateResult = await checkRateLimit(session.identityId, "validation:accept");
    if (!rateResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429, headers: { "X-Request-ID": requestId, "Retry-After": String(rateResult.retryAfter || 60) } }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      validationToken?: string;
    } | null;

    if (!body?.validationToken) {
      return NextResponse.json(
        { success: false, error: "validationToken is required" },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    const tokenHash = hashToken(body.validationToken);
    const validationLink = await prisma.validationLink.findUnique({
      where: { token_hash: tokenHash },
      select: { id: true, status: true, signature_id: true },
    });

    if (!validationLink || validationLink.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Invalid or expired validation link" },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    // Revoke the link and update signature — atomic transaction
    await prisma.$transaction(async (tx) => {
      await tx.validationLink.update({
        where: { id: validationLink.id },
        data: { status: "revoked", revoked_at: new Date() },
      });

      await tx.signature.update({
        where: { id: validationLink.signature_id },
        data: { status: "REVIEW_REQUIRED" },
      });

      await appendAuditEvent(tx, {
        eventType: "validation.rejected",
        actorType: "identity",
        actorId: session.identityId,
        objectType: "validation_link",
        objectId: validationLink.id,
        requestId,
      });
    });

    return NextResponse.json(
      { success: true, message: "Validation declined" },
      { status: 200, headers: { "X-Request-ID": requestId } }
    );
  } catch (error) {
    console.error(`[${requestId}] Validation reject error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to reject validation" },
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
