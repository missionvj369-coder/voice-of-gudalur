/**
 * POST /api/report/abuse
 * Report suspicious activity.
 * No authentication required (open to public).
 */

import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { generateRequestId } from "../../../../../lib/security/tokens";
import { checkRateLimit } from "../../../../../lib/security/rate-limit";
import { appendAuditEvent } from "../../../../../lib/security/audit";

export const dynamic = "force-dynamic";

const MAX_BODY_SIZE = 2048;

export async function POST(request: Request) {
  const requestId = generateRequestId();

  try {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
      || request.headers.get("x-real-ip") || "unknown";

    const rateResult = await checkRateLimit(clientIp, "report:abuse");
    if (!rateResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429, headers: { "X-Request-ID": requestId, "Retry-After": String(rateResult.retryAfter || 300) } }
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
      type?: string;
      subjectType?: string;
      subjectId?: string;
      reason?: string;
    } | null;

    if (!body?.type || !body?.subjectType || !body?.reason) {
      return NextResponse.json(
        { success: false, error: "type, subjectType, and reason are required" },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    // Sanitize reason
    const reason = body.reason.trim().slice(0, 500);

    // Create admin review entry
    await prisma.adminReview.create({
      data: {
        object_type: body.subjectType.slice(0, 50),
        object_id: body.subjectId?.slice(0, 100) || "unknown",
        action: "flag",
        reason: reason,
        status: "pending",
      },
    });

    await appendAuditEvent(prisma, {
      eventType: "admin_review.created",
      actorType: "system",
      objectType: "admin_review",
      objectId: body.subjectId || "unknown",
      requestId,
      metadata: { type: body.type, subjectType: body.subjectType },
    });

    return NextResponse.json(
      { success: true, message: "Report submitted" },
      { status: 200, headers: { "X-Request-ID": requestId } }
    );
  } catch (error) {
    console.error(`[${requestId}] Abuse report error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to submit report" },
      { status: 500, headers: { "X-Request-ID": requestId } }
    );
  }
}
