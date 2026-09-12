/**
 * Admin authentication.
 * Server-side admin token validation with session management.
 * Admin sessions use Redis (shared across instances) with in-memory fallback.
 * Multi-login supported via ADMIN_TOKENS_CSV="tokenA:role:username,...".
 * TOTP MFA required before an admin session is issued.
 */

import { createHmac } from "crypto";
import { generateSessionId } from "../security/tokens";
import { redisSet, redisGet, redisDel } from "../security/redis";
import { verifyTotp, isTotpConfigured } from "../security/totp";

function getAdminSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_SESSION_SECRET environment variable is required. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    );
  }
  return secret;
}

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const ADMIN_TOKENS_CSV = process.env.ADMIN_TOKENS_CSV;

const ADMIN_SESSION_MAX_AGE_SECONDS = 1800; // 30 minutes
export const ADMIN_COOKIE_NAME = "vog_admin_session";

export type AdminRole = "VIEWER" | "REVIEWER" | "MODERATOR" | "SECURITY_ADMIN" | "SUPER_ADMIN";

// Role hierarchy for authorization checks
export const ROLE_HIERARCHY: Record<AdminRole, number> = {
  VIEWER: 0,
  REVIEWER: 1,
  MODERATOR: 2,
  SECURITY_ADMIN: 3,
  SUPER_ADMIN: 4,
};

export type AdminSession = {
  sessionId: string;
  username: string;
  role: AdminRole;
  createdAt: number;
  expiresAt: number;
};

/**
 * Validate an admin token and create an admin session.
 * Requires TOTP (MFA) when ADMIN_TOTP_* env vars are configured.
 */

export async function createAdminSession(params: {
  token: string;
  totpCode?: string;
}): Promise<{ success: true; sessionToken: string; role: AdminRole; username: string } | { success: false; error: string }> {
  const account = resolveAdminAccount(params.token);

  if (!account) {
    return { success: false, error: "Invalid admin credentials" };
  }

  if (isTotpConfigured()) {
    if (!params.totpCode) {
      return { success: false, error: "MFA code is required" };
    }
    const totp = await verifyTotp(params.totpCode);
    if (!totp.valid) {
      return { success: false, error: totp.error || "Invalid MFA code" };
    }
  }

  const sessionId = generateSessionId();
  const now = Date.now();

    const sessionData: AdminSession = {
    sessionId,
    username: account.username,
    role: account.role,
    createdAt: now,
    expiresAt: now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
  };

  // Store session server-side
  await redisSet(`admin_session:${sessionId}`, JSON.stringify(sessionData), ADMIN_SESSION_MAX_AGE_SECONDS);

  const sessionToken = signAdminToken(sessionId);

  return {
    success: true,
    sessionToken,
    role: sessionData.role,
    username: sessionData.username,
  };
}

/**
 * Validate an admin session token.
 */
export async function validateAdminSession(token: string): Promise<AdminSession | null> {
  const sessionId = verifyAdminToken(token);
  if (!sessionId) return null;

  const raw = await redisGet(`admin_session:${sessionId}`);
  if (!raw) return null;

  const session = JSON.parse(raw) as AdminSession;

  if (Date.now() > session.expiresAt) {
    await redisDel(`admin_session:${sessionId}`);
    return null;
  }

  return session;
}

/**
 * Invalidate an admin session.
 */
export async function destroyAdminSession(token: string): Promise<void> {
  const sessionId = verifyAdminToken(token);
  if (sessionId) {
    await redisDel(`admin_session:${sessionId}`);
  }
}

export function getAdminCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict";
  maxAge: number;
  path: string;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/",
  };
}

/**
 * Check if a session has at least the required role.
 */
export function hasAdminRole(session: AdminSession, required: AdminRole): boolean {
  return ROLE_HIERARCHY[session.role] >= ROLE_HIERARCHY[required];
}

/**
 * Extract the admin session token from a request cookie header.
 */
export function extractAdminToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").reduce<Record<string, string>>((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    if (key && value) acc[key] = value;
    return acc;
  }, {});
  return cookies[ADMIN_COOKIE_NAME] || null;
}

/**
 * Resolve an admin token to an account (role + username).
 * Token comparisons are constant-time to prevent timing attacks.
 *
 * Formats supported:
 * - ADMIN_TOKENS_CSV="tokenA:SUPER_ADMIN:alice,tokenB:REVIEWER:bob"
 * - ADMIN_TOKEN="tokenX" (implies SUPER_ADMIN, username "admin")
 */
function resolveAdminAccount(token: string): { role: AdminRole; username: string } | null {
  const csv = process.env.ADMIN_TOKENS_CSV;
  if (csv) {
    for (const entry of csv.split(",")) {
      const parts = entry.split(":").map((p) => p.trim());
      if (parts.length < 1) continue;
      const entryToken = parts[0];
      if (!entryToken) continue;

      // Constant-time token comparison
      if (!timingSafeEqual(token, entryToken)) continue;

      const roleRaw = (parts[1] || "SUPER_ADMIN").toUpperCase();
      const role = (Object.keys(ROLE_HIERARCHY) as AdminRole[]).includes(roleRaw as AdminRole)
        ? (roleRaw as AdminRole)
        : "VIEWER";
      return { role, username: parts[2] || `admin-${role.toLowerCase()}` };
    }
    // If CSV is configured, single ADMIN_TOKEN is not accepted (least privilege)
    return null;
  }

  if (ADMIN_TOKEN && timingSafeEqual(token, ADMIN_TOKEN)) {
    return { role: "SUPER_ADMIN", username: "admin" };
  }

  return null;
}

function signAdminToken(sessionId: string): string {
  const signature = createHmac("sha256", getAdminSecret())
    .update(sessionId)
    .digest("base64url");
  return `${Buffer.from(sessionId).toString("base64url")}.${signature}`;
}

function verifyAdminToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [sessionIdB64, signature] = parts;
  const sessionId = Buffer.from(sessionIdB64, "base64url").toString();

  const expectedSignature = createHmac("sha256", getAdminSecret())
    .update(sessionId)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedBuf.length) return null;

  let result = 0;
  for (let i = 0; i < sigBuf.length; i++) {
    result |= sigBuf[i] ^ expectedBuf[i];
  }

  return result === 0 ? sessionId : null;
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