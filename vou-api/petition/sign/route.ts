/**
 * POST /api/petition/sign
 * Sign the petition. One verified identity = one signature.
 * Idempotent, transactional.
 */

import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import {
  generateRequestId,
  hashIdempotencyKey,
  hashRequestBody,
} from "../../../../../lib/security/tokens";
import { checkRateLimit } from "../../../../../lib/security/rate-limit";
import { validateSession } from "../../../../../lib/auth/session";
import { recordRiskEvent } from "../../../../../lib/security/risk";
import { executeSigningTx } from "../../../../../lib/security/signing";
import { checkCsrf } from "../../../../../lib/security/csrf-helper";

export const dynamic = "force-dynamic";

const MAX_BODY_SIZE = 4096;
const VALID_DISPLAY_MODES = ["anonymous", "name_and_area"];

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

    const rateResult = await checkRateLimit(session.identityId, "petition:sign");
    if (!rateResult.allowed) {
      await recordRiskEvent(prisma, {
        identityId: session.identityId,
        eventType: "rate_limit_exceeded",
        riskLevel: "medium",
        metadata: { endpoint: "petition:sign" },
      });
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429, headers: { "X-Request-ID": requestId, "Retry-After": String(rateResult.retryAfter || 30) } }
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
      idempotencyKey?: string;
      displayMode?: string;
      displayName?: string;
      area?: string;
      consentVersion?: string;
    } | null;

    if (!body || !body.idempotencyKey) {
      return NextResponse.json(
        { success: false, error: "idempotencyKey is required" },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    if (!VALID_DISPLAY_MODES.includes(body.displayMode || "anonymous")) {
      return NextResponse.json(
        { success: false, error: "Invalid display mode" },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    const displayName = body.displayName ? body.displayName.trim().slice(0, 100) : null;
    const area = body.area ? body.area.trim().slice(0, 100) : null;

    // Note: Idempotency is now checked INSIDE the transaction (in executeSigningTx)
    // to eliminate the race condition between check and insert.
    const keyHash = hashIdempotencyKey(body.idempotencyKey);
    const requestHash = hashRequestBody(JSON.stringify(body));

    const result = await executeSigningTx(prisma, {
      identityId: session.identityId,
      keyHash,
      requestHash,
      displayMode: body.displayMode || "anonymous",
      displayName,
      area,
      consentVersion: body.consentVersion || "1.0",
      requestId,
    });

    const headers: Record<string, string> = { "X-Request-ID": requestId };
    if (result.replay) headers["X-Idempotent-Replay"] = "true";

    return NextResponse.json(result.response, {
      status: result.statusCode,
      headers,
    });
  } catch (error) {
    console.error(`[${requestId}] Sign error:`, error);
    return NextResponse.json(
      { success: false, error: "Signing failed" },
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
