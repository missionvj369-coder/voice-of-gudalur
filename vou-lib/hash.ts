import { randomBytes } from "crypto";

/**
 * Generates a cryptographically secure random hash to use as a sender_id.
 * Format: 8-4-4-4-4 hexadecimal groups (UUID v4-like)
 */
export function generateSenderId(): string {
  return randomBytes(16).toString("hex").replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
}

/**
 * Extracts the sender_id from a URL query string.
 */
export function parseSenderId(searchParams: URLSearchParams): string | null {
  const senderId = searchParams.get("sender_id");
  if (!senderId || senderId.trim() === "") return null;
  return senderId.trim();
}

/**
 * Gets the sender display name from the sender_id (shortened hash).
 */
export function getSenderNameFromHash(senderId: string): string {
  return `User ${senderId.substring(0, 8)}`;
}