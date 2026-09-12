/**
 * VOU Unified Auth Session - Adapted from D:\vou for Express
 * Uses Redis with in-memory fallback
 */
import { createHmac } from "crypto";
import { redisSet, redisGet, redisDel } from "./vouRedis";
import { generateSessionId } from "./vouTokens";

const SESSION_MAX_AGE_SECONDS = 3600; // 1 hour
const SESSION_COOKIE_NAME = "vog_session";

export type SessionData = {
  sessionId: string;
  identityId: string;
  identityKey: string;
  provider: string;
  assuranceLevel: string;
  phoneVerified: boolean;
  createdAt: number;
  expiresAt: number;
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  return secret;
}

export async function createSession(
  identityId: string,
  identityKey: string,
  provider: string,
  assuranceLevel: string,
  phoneVerified: boolean
): Promise<string> {
  const sessionId = generateSessionId();
  const now = Date.now();

  const sessionData: SessionData = {
    sessionId,
    identityId,
    identityKey,
    provider,
    assuranceLevel,
    phoneVerified,
    createdAt: now,
    expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000,
  };

  await redisSet(`session:${sessionId}`, JSON.stringify(sessionData), SESSION_MAX_AGE_SECONDS);
  return signSessionToken(sessionId);
}

export async function validateSession(token: string): Promise<SessionData | null> {
  const sessionId = verifySessionToken(token);
  if (!sessionId) return null;

  const raw = await redisGet(`session:${sessionId}`);
  if (!raw) return null;

  const session = JSON.parse(raw) as SessionData;
  if (Date.now() > session.expiresAt) {
    await redisDel(`session:${sessionId}`);
    return null;
  }

  return session;
}

export async function destroySession(token: string): Promise<void> {
  const sessionId = verifySessionToken(token);
  if (sessionId) {
    await redisDel(`session:${sessionId}`);
  }
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  };
}

function signSessionToken(sessionId: string): string {
  const signature = createHmac("sha256", getSessionSecret())
    .update(sessionId)
    .digest("base64url");
  return `${Buffer.from(sessionId).toString("base64url")}.${signature}`;
}

function verifySessionToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [sessionIdB64, signature] = parts;
  const sessionId = Buffer.from(sessionIdB64, "base64url").toString();

  const expectedSignature = createHmac("sha256", getSessionSecret())
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
