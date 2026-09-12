/**
 * VOU Security Tokens - Adapted from D:\vou
 */
import { createHash, randomBytes } from "crypto";

export function generateSecureToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function generateSessionId(): string {
  return randomBytes(32).toString("base64url");
}

export function generateRequestId(): string {
  return randomBytes(16).toString("hex");
}

export function hashIdempotencyKey(key: string): string {
  return createHash("sha256").update(`idempotency:${key}`).digest("hex");
}

export function hashRequestBody(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

export function generatePublicReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "VOG-";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += alphabet[bytes[i] % alphabet.length];
  }
  return result;
}

export function normalizePhoneE164(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) return null;
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `+${digits}`;
}

export function generatePhoneIdentityKey(normalizedE164: string): string {
  const secret = process.env.IDENTITY_HMAC_SECRET || process.env.SESSION_SECRET || "";
  return createHash("sha256").update(`phone:${normalizedE164}:${secret}`).digest("hex");
}
