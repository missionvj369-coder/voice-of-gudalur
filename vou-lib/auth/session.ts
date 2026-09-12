/**
 * Server-side session management.
 * 
 * Sessions are stored as signed JWTs in httpOnly, secure, sameSite cookies.
 * The session contains only a session ID — all identity data stays server-side.
 * 
 * Session store is in-memory (replace with Redis for multi-instance).
 */

import { createHmac } from "crypto";
import type { PrismaClient } from "@prisma/client";
import type { VerifiedIdentity } from "./types";
import { generateSessionId } from "../security/tokens";
import { redisSet, redisGet, redisDel } from "../security/redis";

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET environment variable is required. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    );
  }
  return secret;
}

const SESSION_MAX_AGE_SECONDS = 3600; // 1 hour
const SESSION_COOKIE_NAME = "vog_session";

type SessionData = {
  sessionId: string;
  identityId: string;
  identityKey: string;
  provider: string;
  assuranceLevel: string;
  phoneVerified: boolean;
  createdAt: number;
  expiresAt: number;
};

/**
 * Create a new session for an authenticated identity.
 * Returns the session token to be set as a cookie.
 */
export async function createSession(
  prisma: PrismaClient,
  identity: VerifiedIdentity,
  identityId: string,
  identityKey: string
): Promise<string> {
  const sessionId = generateSessionId();
  const now = Date.now();

  const sessionData: SessionData = {
    sessionId,
    identityId,
    identityKey,
    provider: identity.provider,
    assuranceLevel: identity.assuranceLevel,
    phoneVerified: identity.phoneVerified,
    createdAt: now,
    expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000,
  };

  await redisSet(`session:${sessionId}`, JSON.stringify(sessionData), SESSION_MAX_AGE_SECONDS);

  // Sign the session ID for the cookie
  const token = signSessionToken(sessionId);

  // Update last verified timestamp
  await prisma.identity.update({
    where: { id: identityId },
    data: { last_verified_at: new Date() },
  });

  return token;
}

/**
 * Validate a session token and return session data.
 */
export async function validateSession(token: string): Promise<SessionData | null> {
  const sessionId = verifySessionToken(token);
  if (!sessionId) return null;

  const raw = await redisGet(`session:${sessionId}`);
  if (!raw) return null;

  const session = JSON.parse(raw) as SessionData;

  // Check expiry
  if (Date.now() > session.expiresAt) {
    await redisDel(`session:${sessionId}`);
    return null;
  }

  return session;
}

/**
 * Invalidate a session (logout).
 */
export async function destroySession(token: string): Promise<void> {
  const sessionId = verifySessionToken(token);
  if (sessionId) {
    await redisDel(`session:${sessionId}`);
  }
}

/**
 * Get the session cookie name.
 */
export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

/**
 * Get session cookie options.
 */
export function getSessionCookieOptions(): {
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
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  };
}

/**
 * Sign a session ID for use as a cookie value.
 * Format: base64(sessionId).signature
 */
function signSessionToken(sessionId: string): string {
  const signature = createHmac("sha256", getSessionSecret())
    .update(sessionId)
    .digest("base64url");
  return `${Buffer.from(sessionId).toString("base64url")}.${signature}`;
}

/**
 * Verify and extract session ID from a signed token.
 */
function verifySessionToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [sessionIdB64, signature] = parts;
  const sessionId = Buffer.from(sessionIdB64, "base64url").toString();

  const expectedSignature = createHmac("sha256", getSessionSecret())
    .update(sessionId)
    .digest("base64url");

  // Constant-time comparison
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedBuf.length) return null;

  let result = 0;
  for (let i = 0; i < sigBuf.length; i++) {
    result |= sigBuf[i] ^ expectedBuf[i];
  }

  return result === 0 ? sessionId : null;
}
