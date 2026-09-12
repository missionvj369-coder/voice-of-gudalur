/**
 * Proxy (formerly middleware) — Next.js 16.
 * 
 * Applies security headers and CORS to all requests.
 * Runs before routes are rendered.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SECURITY_HEADERS, CONTENT_SECURITY_POLICY, getCorsHeaders } from "../lib/security/headers";

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") || "";
  const response = NextResponse.next();

  // Apply security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Apply CSP
  response.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);

  // Apply CORS headers
  const corsHeaders = getCorsHeaders(origin);
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }

  // Handle preflight OPTIONS requests
  if (request.method === "OPTIONS") {
    const preflightResponse = new NextResponse(null, { status: 204 });
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      preflightResponse.headers.set(key, value);
    }
    preflightResponse.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    for (const [key, value] of Object.entries(corsHeaders)) {
      preflightResponse.headers.set(key, value);
    }
    return preflightResponse;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
