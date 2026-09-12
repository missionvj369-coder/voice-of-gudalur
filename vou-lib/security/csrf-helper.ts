/**
 * CSRF verification helper for API routes.
 * 
 * Double-submit pattern:
 * 1. Auth session sets a CSRF cookie (readable by JS)
 * 2. All write requests must send the token in the X-CSRF-Token header
 * 3. Server verifies header token == cookie token
 * 
 * Returns true if CSRF check passes, false otherwise.
 */

import { verifyCsrfHeader, CSRF_HEADER_NAME, CSRF_COOKIE_NAME, extractSessionIdForCsrf, generateCsrfToken, verifyCsrfToken } from "./csrf";

/**
 * Verify CSRF for a write request.
 * 
 * @param request - The incoming request
 * @returns { passed: boolean; reason?: string }
 */
export function checkCsrf(request: Request): { passed: boolean; reason?: string } {
  // GET/HEAD/OPTIONS are safe — CSRF only applies to state-changing requests
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { passed: true };
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").reduce<Record<string, string>>((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    if (key && value) acc[key] = value;
    return acc;
  }, {});

  const csrfToken = cookies[CSRF_COOKIE_NAME];
  const csrfHeader = request.headers.get(CSRF_HEADER_NAME);

  // Also try HMAC-based verification: token derived from session ID
  const sessionToken = cookies["vog_session"];
  if (sessionToken) {
    const sessionId = extractSessionIdForCsrf(sessionToken);
    if (sessionId && csrfHeader && verifyCsrfToken(csrfHeader, sessionId)) {
      return { passed: true };
    }
  }

  if (verifyCsrfHeader(csrfHeader, csrfToken)) {
    return { passed: true };
  }

  return { passed: false, reason: "CSRF token mismatch" };
}