/**
 * GET /api/petition/count
 * Returns cached signature count for public display.
 * No authentication required.
 * Cached for 60 seconds to reduce database load.
 */

import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { generateRequestId } from "../../../../../lib/security/tokens";

export const dynamic = "force-dynamic";

// Simple in-memory cache (replace with CDN cache in production)
let cachedCount: { count: number; communityValidated: number; timestamp: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds

export async function GET(request: Request) {
  const requestId = generateRequestId();

  try {
    // Check cache
    const now = Date.now();
    if (cachedCount && now - cachedCount.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(
        {
          totalSignatures: cachedCount.count,
          communityValidated: cachedCount.communityValidated,
          cachedAt: new Date(cachedCount.timestamp).toISOString(),
        },
        {
          headers: {
            "X-Request-ID": requestId,
            "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
          },
        }
      );
    }

    // Query database
    const [totalCount, validatedCount] = await Promise.all([
      prisma.signature.count(),
      prisma.signature.count({ where: { status: "COMMUNITY_VALIDATED" } }),
    ]);

    cachedCount = {
      count: totalCount,
      communityValidated: validatedCount,
      timestamp: now,
    };

    return NextResponse.json(
      {
        totalSignatures: totalCount,
        communityValidated: validatedCount,
        cachedAt: new Date(now).toISOString(),
      },
      {
        headers: {
          "X-Request-ID": requestId,
          "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Failed to fetch count:`, error);
    // Return stale cache if available, otherwise error
    if (cachedCount) {
      return NextResponse.json(
        {
          totalSignatures: cachedCount.count,
          communityValidated: cachedCount.communityValidated,
          cachedAt: new Date(cachedCount.timestamp).toISOString(),
          stale: true,
        },
        {
          headers: {
            "X-Request-ID": requestId,
            "Cache-Control": "public, max-age=10",
          },
        }
      );
    }
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      {
        status: 503,
        headers: { "X-Request-ID": requestId },
      }
    );
  }
}
