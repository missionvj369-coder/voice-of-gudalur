/**
 * POST /api/admin/session/logout
 * Destroy the admin session.
 */

import { NextResponse } from "next/server";
import { generateRequestId } from "../../../../../../lib/security/tokens";
import {
  destroyAdminSession,
  extractAdminToken,
  ADMIN_COOKIE_NAME,
} from "../../../../../../lib/auth/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = generateRequestId();

  try {
    const token = extractAdminToken(request.headers.get("cookie"));
    if (token) {
      await destroyAdminSession(token);
    }

    const response = NextResponse.json(
      { success: true },
      { status: 200, headers: { "X-Request-ID": requestId } }
    );

    // Clear the admin cookie
    response.cookies.set(ADMIN_COOKIE_NAME, "", { maxAge: 0, path: "/" });

    return response;
  } catch (error) {
    console.error(`[${requestId}] Admin logout error:`, error);
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500, headers: { "X-Request-ID": requestId } }
    );
  }
}