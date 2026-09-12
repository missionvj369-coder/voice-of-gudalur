/**
 * POST /api/validation/accept
 * Accept a witness validation via a validation token.
 * Requires authentication. Idempotent, transactional.
 */

import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import {
  generateRequestId,
  hashIdempotencyKey,
  hashRequestBody,
  hashToken,
} from "../../../../../lib/security/tokens";
import { checkRateLimit } from "../../../../../lib/security/rate-limit";
import { validateSession } from "../../../../../lib/auth/session";
import { recordRiskEvent } from "../../../../../lib/security/risk";
import { checkCsrf } from "../../../../../lib/security/csrf-helper";

export const dynamic = "force-dynamic";

const MAX_BODY_SIZE = 2048;

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
      await recordRiskEvent(prisma, {
        identityId: session.identityId,
        eventType: "rate_limit_exceeded",
        riskLevel: "medium",
        metadata: { endpoint: "validation:accept" },
      });
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429, headers: { "X-Request-ID": requestId, "Retry-After": String(rateResult.retryAfter || 60) } }
      );
    }

    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json(
        { success: false, error: "Request body too large" },
        { status: 413, headers: { "X-Request-ID": requestId } }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      validationToken?: string;
      idempotencyKey?: string;
    } | null;

    if (!body?.validationToken || !body?.idempotencyKey) {
      return NextResponse.json(
        { success: false, error: "validationToken and idempotencyKey are required" },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    // Idempotency is checked INSIDE the transaction (in executeValidationTx)
    const keyHash = hashIdempotencyKey(body.idempotencyKey);
    const requestHash = hashRequestBody(JSON.stringify(body));

    // Find and validate token
    const tokenHash = hashToken(body.validationToken);
    const validationLink = await prisma.validationLink.findUnique({
      where: { token_hash: tokenHash },
      include: {
        signature: {
          select: { id: true, petition_id: true, identity_id: true, status: true },
        },
      },
    });

    if (!validationLink || validationLink.status !== "active" || new Date() > validationLink.expires_at) {
      await recordRiskEvent(prisma, {
        identityId: session.identityId,
        eventType: "token_guess_attempt",
        riskLevel: "medium",
        metadata: { endpoint: "validation:accept" },
      });
      return NextResponse.json(
        { success: false, error: "Invalid or expired validation link" },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    // Execute validation transaction
    const { executeValidationTx } = await import("../../../../../lib/security/validation-tx");
    const result = await executeValidationTx(prisma, {
      witnessIdentityId: session.identityId,
      signatureId: validationLink.signature_id,
      petitionId: validationLink.signature.petition_id,
      linkId: validationLink.id,
      signerIdentityId: validationLink.signature.identity_id,
      keyHash,
      requestHash,
      requestId,
    });

    const headers: Record<string, string> = { "X-Request-ID": requestId };
    if (result.replay) headers["X-Idempotent-Replay"] = "true";

    return NextResponse.json(result.response, {
      status: result.statusCode,
      headers,
    });
  } catch (error) {
    console.error(`[${requestId}] Validation accept error:`, error);
    return NextResponse.json(
      { success: false, error: "Validation failed" },
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
