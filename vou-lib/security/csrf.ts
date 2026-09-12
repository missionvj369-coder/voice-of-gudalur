/**
 * CSRF (Cross-Site Request Forgery) protection.
 * 
 * Uses the double-submit cookie + custom header pattern:
 * 1. Server issues a CSRF token in a cookie (not httpOnly — JS must read it)
 * 2. Client must send the token in the X-CSRF-Token header
 * 3. Server verifies the header token matches the cookie token
 * 
 * This protects cookie-authenticated write endpoints even if
 * an attacker triggers the browser to send the session cookie.
 */

import { createHmac, randomBytes } from "crypto";

function getCsrfSecret(): string {
  const secret = (process.env.CSRF_SECRET || process.env.SESSION_SECRET) as string | undefined;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET or CSRF_SECRET environment variable is required for CSRF protection"
    );
  }
  return secret;
}

export const CSRF_COOKIE_NAME = "vog_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate a new CSRF token for a session.
 * Token = HMAC(session_id, csrf_secret)
 */
export function generateCsrfToken(sessionId: string): string {
  return createHmac("sha256", getCsrfSecret())
    .update(sessionId)
    .digest("hex");
}

/**
 * Verify a CSRF token against a session ID.
 */
export function verifyCsrfToken(token: string, sessionId: string): boolean {
  const expected = generateCsrfToken(sessionId);
  return timingSafeEqual(token, expected);
}

/**
 * Verify the CSRF header against the CSRF cookie.
 * For the double-submit pattern: both must match.
 */
export function verifyCsrfHeader(headerToken: string | null, cookieToken: string | null): boolean {
  if (!headerToken || !cookieToken) return false;
  return timingSafeEqual(headerToken, cookieToken);
}

/**
 * Set the CSRF cookie on a response.
 * Not httpOnly so JavaScript can read it.
 */
export function getCsrfCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict";
  maxAge: number;
  path: string;
} {
  return {
    httpOnly: false, // JS must be able to read it
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 3600,
    path: "/",
  };
}

/**
 * Get the session ID from a session token (hex 64-char part).
 */
export function extractSessionIdForCsrf(sessionToken: string): string {
  // Session tokens are base64(sessionId).signature
  const parts = sessionToken.split(".");
  if (parts.length !== 2) return "";
  return Buffer.from(parts[0], "base64url").toString();
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}