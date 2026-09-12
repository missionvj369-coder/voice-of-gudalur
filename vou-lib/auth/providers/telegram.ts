/**
 * Telegram authentication provider.
 * 
 * Uses official Telegram Login Widget authentication.
 * Validates server-side: signature/hash, auth timestamp, bot identity.
 * 
 * NOTE: Telegram login alone does NOT prove SIM ownership.
 * It provides low-to-medium assurance (Telegram account ownership).
 */

import { createHash, createHmac } from "crypto";
import type { TelegramAuthPayload, VerifiedIdentity } from "../types";

const TELEGRAM_REPLAY_WINDOW_SECONDS = 86400; // 24 hours

export async function authenticateTelegram(params: {
  payload: TelegramAuthPayload;
}): Promise<{ success: true; identity: VerifiedIdentity } | { success: false; error: string }> {
  try {
    const { payload } = params;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return { success: false, error: "Telegram authentication not configured" };
    }

    // Validate the hash
    const isValid = verifyTelegramHash(payload, botToken);
    if (!isValid) {
      return { success: false, error: "Invalid Telegram authentication" };
    }

    // Check auth timestamp (prevent replay attacks)
    const now = Math.floor(Date.now() / 1000);
    const authAge = now - payload.auth_date;

    if (authAge < 0 || authAge > TELEGRAM_REPLAY_WINDOW_SECONDS) {
      return { success: false, error: "Telegram authentication expired" };
    }

    // Build normalized identity
    const identity: VerifiedIdentity = {
      provider: "telegram",
      providerSubject: String(payload.id),
      phoneVerified: false,
      assuranceLevel: "low",
      verifiedAt: new Date().toISOString(),
    };

    return { success: true, identity };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Telegram authentication failed",
    };
  }
}

/**
 * Verify Telegram authentication hash.
 * The hash is HMAC-SHA256 of the data-check-string using the bot token as key.
 */
function verifyTelegramHash(
  payload: TelegramAuthPayload,
  botToken: string
): boolean {
  // Build data-check-string (sorted key=value pairs separated by newlines)
  const dataCheckString = buildDataCheckString(payload);

  // Compute expected hash: SHA-256 of bot token as key, HMAC-SHA256
  const secretKey = createHash("sha256").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // Constant-time comparison
  const actualHash = payload.hash;
  if (expectedHash.length !== actualHash.length) return false;

  let result = 0;
  for (let i = 0; i < expectedHash.length; i++) {
    result |= expectedHash.charCodeAt(i) ^ actualHash.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Build the data-check-string from Telegram payload.
 * Excludes the 'hash' field, sorts alphabetically.
 */
function buildDataCheckString(payload: TelegramAuthPayload): string {
  const fields: Array<[string, string]> = [
    ["auth_date", String(payload.auth_date)],
    ["first_name", payload.first_name],
    ["id", String(payload.id)],
  ];

  if (payload.last_name) {
    fields.push(["last_name", payload.last_name]);
  }
  if (payload.photo_url) {
    fields.push(["photo_url", payload.photo_url]);
  }
  if (payload.username) {
    fields.push(["username", payload.username]);
  }

  // Sort alphabetically by key
  fields.sort((a, b) => a[0].localeCompare(b[0]));

  return fields.map(([key, value]) => `${key}=${value}`).join("\n");
}
