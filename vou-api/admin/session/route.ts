/**
 * POST /api/admin/session
 * Create an admin session from a token.
 * Validates the token server-side against ADMIN_TOKEN env var.
 * Sets a httpOnly session cookie for admin access.
 */

import { NextResponse } from "next/server";
import { generateRequestId } from "../../../../../lib/security/tokens";
import { checkRateLimit } from "../../../../../lib/security/rate-limit";
import { appendAuditEvent } from "../../../../../lib/security/audit";
import { prisma } from "../../../../../lib/db";
import {
  createAdminSession,
  getAdminCookieOptions,
  ADMIN_COOKIE_NAME,
} from "../../../../../lib/auth/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = generateRequestId();

  try {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
      || request.headers.get("x-real-ip") || "unknown";

    const rateResult = await checkRateLimit(clientIp, "admin:session");
    if (!rateResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many attempts" },
        { status: 429, headers: { "X-Request-ID": requestId, "Retry-After": String(rateResult.retryAfter || 60) } }
      );
    }

    const body = (await request.json().catch(() => null)) as { token?: string; totpCode?: string } | null;
    if (!body?.token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    const result = await createAdminSession({ token: body.token, totpCode: body.totpCode });

    if (!result.success) {
      await appendAuditEvent(prisma, {
        eventType: "security.alert",
        actorType: "system",
        objectType: "admin_session",
        requestId,
        metadata: { event: "admin_login_failed", ip: clientIp },
      });
      return NextResponse.json(
        { success: false, error: "Invalid admin credentials" },
        { status: 401, headers: { "X-Request-ID": requestId } }
      );
    }

    const response = NextResponse.json(
      { success: true, role: result.role, username: result.username },
      { status: 200, headers: { "X-Request-ID": requestId } }
    );

    response.cookies.set(
      ADMIN_COOKIE_NAME,
      result.sessionToken,
      getAdminCookieOptions()
    );

    await appendAuditEvent(prisma, {
      eventType: "identity.authenticated",
      actorType: "admin",
      objectType: "admin_session",
      requestId,
      metadata: { event: "admin_login", username: result.username },
    });

    return response;
  } catch (error) {
    console.error(`[${requestId}] Admin session error:`, error);
    return NextResponse.json(
      { success: false, error: "Admin authentication failed" },
      { status: 500, headers: { "X-Request-ID": requestId } }
    );
  }
}