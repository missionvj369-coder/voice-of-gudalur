/**
 * POST /api/auth/phone-request
 * Request an OTP to be sent to a phone number.
 * No authentication required (pre-auth step).
 */

import { NextResponse } from "next/server";
import { requestOtp } from "../../../../../lib/auth/providers/phone-otp";
import { generateRequestId } from "../../../../../lib/security/tokens";
import { checkRateLimit } from "../../../../../lib/security/rate-limit";
import { normalizePhoneE164 } from "../../../../../lib/security/identity";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = generateRequestId();

  try {
    // Rate limit by IP
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
      || request.headers.get("x-real-ip") || "unknown";
    const rateResult = await checkRateLimit(clientIp, "auth:verify");
    if (!rateResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429, headers: { "X-Request-ID": requestId, "Retry-After": String(rateResult.retryAfter || 60) } }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      phone?: string;
    } | null;

    if (!body?.phone) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    const normalized = normalizePhoneE164(body.phone);
    if (!normalized) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format" },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    const result = await requestOtp({ phoneE164: normalized });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    return NextResponse.json(
      { success: true, requestId: result.requestId },
      { status: 200, headers: { "X-Request-ID": requestId } }
    );
  } catch (error) {
    console.error(`[${requestId}] Phone request error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to send verification code" },
      { status: 500, headers: { "X-Request-ID": requestId } }
    );
  }
}
