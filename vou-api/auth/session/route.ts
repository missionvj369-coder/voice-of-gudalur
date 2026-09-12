/**
 * POST /api/auth/session
 * Create a new authenticated session from a provider credential.
 * 
 * Body: CreateSessionInput
 * Returns: { success, sessionId, assuranceLevel, phoneVerified }
 * 
 * Sets httpOnly session cookie.
 */

import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { createUserSession } from "../../../../../lib/auth";
import { generateRequestId } from "../../../../../lib/security/tokens";
import { checkRateLimit } from "../../../../../lib/security/rate-limit";
import { recordRiskEvent } from "../../../../../lib/security/risk";
import { getSessionCookieName, getSessionCookieOptions } from "../../../../../lib/auth/session";
import { CSRF_COOKIE_NAME, getCsrfCookieOptions, generateCsrfToken } from "../../../../../lib/security/csrf";
import type { CreateSessionInput } from "../../../../../lib/auth/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = generateRequestId();

  try {
    // Rate limiting by IP
    const clientIp = getClientIp(request);
    const rateResult = await checkRateLimit(clientIp, "auth:session");
    if (!rateResult.allowed) {
      await recordRiskEvent(prisma, {
        eventType: "rate_limit_exceeded",
        riskLevel: "medium",
        metadata: { endpoint: "auth:session", ip: clientIp },
      });
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "X-Request-ID": requestId,
            "Retry-After": String(rateResult.retryAfter || 60),
          },
        }
      );
    }

    // Parse and validate body
    const body = (await request.json().catch(() => null)) as CreateSessionInput | null;

    if (!body || !body.provider) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    // Validate provider
    const validProviders = ["google", "telegram", "phone_otp", "camara", "manual"];
    if (!validProviders.includes(body.provider)) {
      return NextResponse.json(
        { success: false, error: "Invalid authentication provider" },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    // Create session
    const result = await createUserSession(prisma, body, requestId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401, headers: { "X-Request-ID": requestId } }
      );
    }

    // Build response with session cookie
    const response = NextResponse.json(
      {
        success: true,
        assuranceLevel: result.assuranceLevel,
        phoneVerified: result.phoneVerified,
      },
      { status: 200, headers: { "X-Request-ID": requestId } }
    );

    // Set session cookie
    response.cookies.set(
      getSessionCookieName(),
      result.sessionToken,
      getSessionCookieOptions()
    );

    // Set CSRF cookie (double-submit pattern) — derived from session ID
    const sessionIdForCsrf = Buffer.from(result.sessionToken.split(".")[0], "base64url").toString();
    response.cookies.set(
      CSRF_COOKIE_NAME,
      generateCsrfToken(sessionIdForCsrf),
      getCsrfCookieOptions()
    );

    return response;
  } catch (error) {
    console.error(`[${requestId}] Auth session error:`, error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500, headers: { "X-Request-ID": requestId } }
    );
  }
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}
