/**
 * GET /api/petition/signatures
 * Returns paginated, masked public signatures.
 * No authentication required.
 * 
 * Query params:
 * - cursor: string (for cursor pagination)
 * - limit: number (max 50, default 20)
 * 
 * Returns only approved public fields. Never exposes:
 * - Internal IDs
 * - Phone numbers
 * - Email addresses
 * - Provider subject IDs
 * - IP addresses
 * - Device fingerprints
 */

import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { generateRequestId } from "../../../../../lib/security/tokens";

export const dynamic = "force-dynamic";

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

export async function GET(request: Request) {
  const requestId = generateRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limitParam = parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10);
    const limit = Math.min(Math.max(1, limitParam), MAX_PAGE_SIZE);

    // Build query
    const where = {
      status: { in: ["SIGNED", "COMMUNITY_VALIDATED", "WITNESS_PENDING"] },
    };

    const signatures = await prisma.signature.findMany({
      where,
      take: limit + 1, // Fetch one extra to determine if there's a next page
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { signed_at: "desc" },
      select: {
        id: true, // Used as cursor, not exposed in response
        public_reference: true,
        public_display_mode: true,
        display_name: true,
        area: true,
        status: true,
        signed_at: true,
      },
    });

    const hasMore = signatures.length > limit;
    const results = hasMore ? signatures.slice(0, limit) : signatures;
    const nextCursor = hasMore ? results[results.length - 1]?.id : null;

    // Serialize with strict allowlist
    const serialized = results.map((sig) => serializePublicSignature(sig));

    return NextResponse.json(
      {
        signatures: serialized,
        nextCursor,
        hasMore,
      },
      {
        headers: {
          "X-Request-ID": requestId,
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Failed to fetch signatures:`, error);
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      {
        status: 503,
        headers: { "X-Request-ID": requestId },
      }
    );
  }
}

/**
 * Strict allowlist serializer for public signature data.
 * Only returns fields safe for public exposure.
 */
function serializePublicSignature(sig: {
  id: string;
  public_reference: string;
  public_display_mode: string;
  display_name: string | null;
  area: string | null;
  status: string;
  signed_at: Date;
}) {
  return {
    publicReference: sig.public_reference,
    displayName: sig.public_display_mode === "anonymous"
      ? "Anonymous Supporter"
      : maskDisplayName(sig.display_name),
    area: sig.public_display_mode === "anonymous" ? undefined : (sig.area || undefined),
    status: sig.status,
    signedAt: sig.signed_at.toISOString(),
  };
}

/**
 * Mask a display name for public display.
 * "Vijay B." or "Anonymous Supporter"
 */
function maskDisplayName(name: string | null): string {
  if (!name) return "Anonymous Supporter";

  const trimmed = name.trim();
  if (trimmed.length === 0) return "Anonymous Supporter";

  // If single word, return as-is
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];

  // If multiple words, show first name + last initial
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0].toUpperCase();
  return `${firstName} ${lastInitial}.`;
}
