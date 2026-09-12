/**
 * GET /api/petition/public
 * Returns public petition information.
 * No authentication required.
 */

import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { generateRequestId } from "../../../../../lib/security/tokens";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = generateRequestId();

  try {
    // Get the active petition (there should be only one for this campaign)
    const petition = await prisma.petition.findFirst({
      where: { status: "active" },
      select: {
        id: false, // Never expose internal ID
        title: true,
        description: true,
        consent_version: true,
        created_at: true,
      },
    });

    if (!petition) {
      return NextResponse.json(
        { error: "No active petition found" },
        {
          status: 404,
          headers: { "X-Request-ID": requestId },
        }
      );
    }

    return NextResponse.json(
      {
        title: petition.title,
        description: petition.description,
        consentVersion: petition.consent_version,
        createdAt: petition.created_at.toISOString(),
      },
      {
        headers: {
          "X-Request-ID": requestId,
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    // Never expose database errors
    console.error(`[${requestId}] Failed to fetch petition:`, error);
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      {
        status: 503,
        headers: { "X-Request-ID": requestId },
      }
    );
  }
}
