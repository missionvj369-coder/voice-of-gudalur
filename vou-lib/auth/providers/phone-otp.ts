/**
 * Phone OTP authentication provider.
 * 
 * Sends OTP via SMS using a configurable provider.
 * 
 * Provider options (priority order):
 * 1. Twilio — TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 * 2. Generic HTTP webhook — SMS_WEBHOOK_URL (POST {phone, message})
 * 
 * In development without a provider, OTPs are logged to console.
 * NEVER acceptable in production — app refuses to send OTPs
 * if no provider is configured and NODE_ENV=production.
 */

import type { VerifiedIdentity } from "../types";
import { createHash, randomBytes } from "crypto";
import { redisSet, redisGet, redisDel } from "../../security/redis";

// OTP records stored in Redis (shared across instances) with in-memory fallback.
// Key: otp:<requestId> → JSON { otpHash, phoneE164, attempts }
// TTL: OTP_EXPIRY_SECONDS (record auto-expires; failed attempts are deleted).

const OTP_EXPIRY_SECONDS = 300; // 5 minutes
const MAX_OTP_ATTEMPTS = 3;
const OTP_LENGTH = 6;

type OtpRecord = { otpHash: string; phoneE164: string; attempts: number };

function otpKey(requestId: string): string {
  return `otp:${requestId}`;
}

async function getOtpRecord(requestId: string): Promise<OtpRecord | null> {
  const raw = await redisGet(otpKey(requestId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OtpRecord;
  } catch {
    return null;
  }
}

async function saveOtpRecord(requestId: string, record: OtpRecord): Promise<void> {
  await redisSet(otpKey(requestId), JSON.stringify(record), OTP_EXPIRY_SECONDS);
}

async function deleteOtpRecord(requestId: string): Promise<void> {
  await redisDel(otpKey(requestId));
}

/**
 * Request an OTP to be sent to a phone number.
 * Returns a request ID that must be presented with the OTP for verification.
 */
export async function requestOtp(params: {
  phoneE164: string;
}): Promise<{ success: true; requestId: string } | { success: false; error: string }> {
  // Validate phone format
  if (!params.phoneE164.match(/^\+[1-9]\d{6,14}$/)) {
    return { success: false, error: "Invalid phone number format" };
  }

  // Generate OTP
  const otp = generateOtp();
  const requestId = randomBytes(16).toString("hex");

  // Store hashed OTP (never store raw OTP). Redis TTL enforces expiry.
  const otpHash = createHash("sha256").update(otp).digest("hex");

  await saveOtpRecord(requestId, {
    otpHash,
    phoneE164: params.phoneE164,
    attempts: 0,
  });

  // Send the OTP via the configured provider
  const sendResult = await sendOtpSms(params.phoneE164, otp);

  if (!sendResult.success) {
    await deleteOtpRecord(requestId); // Don't leave dangling OTP if SMS failed
    return { success: false, error: "Failed to send verification code" };
  }

  return { success: true, requestId };
}

/**
 * Verify an OTP code.
 * Returns a normalized VerifiedIdentity on success.
 */
export async function verifyOtp(params: {
  requestId: string;
  otp: string;
  phoneE164: string;
}): Promise<{ success: true; identity: VerifiedIdentity } | { success: false; error: string }> {
  const record = await getOtpRecord(params.requestId);

  if (!record) {
    return { success: false, error: "Invalid or expired verification session" };
  }

  // Check attempt limit
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    await deleteOtpRecord(params.requestId);
    return { success: false, error: "Too many attempts" };
  }

  record.attempts++;
  await saveOtpRecord(params.requestId, record);

  // Verify phone matches
  if (record.phoneE164 !== params.phoneE164) {
    return { success: false, error: "Phone number mismatch" };
  }

  // Verify OTP (constant-time)
  const otpHash = createHash("sha256").update(params.otp).digest("hex");

  if (!timingSafeEqualHex(otpHash, record.otpHash)) {
    record.attempts += 1;
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await deleteOtpRecord(params.requestId);
    } else {
      await saveOtpRecord(params.requestId, record);
    }
    return { success: false, error: "Invalid verification code" };
  }

  // Success — clean up
  await deleteOtpRecord(params.requestId);

  const identity: VerifiedIdentity = {
    provider: "phone_otp",
    providerSubject: params.phoneE164,
    phoneVerified: true,
    phoneE164: params.phoneE164,
    assuranceLevel: "high",
    verifiedAt: new Date().toISOString(),
  };

  return { success: true, identity };
}

/**
 * Send an OTP via the configured SMS provider.
 */
async function sendOtpSms(phoneE164: string, otp: string): Promise<{ success: boolean }> {
  // 1. Twilio
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const auth = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString("base64");

      const res = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${auth}`,
        },
        body: new URLSearchParams({
          To: phoneE164,
          From: process.env.TWILIO_FROM_NUMBER,
          Body: `Your Voice of Gudalur verification code is: ${otp}`,
        }).toString(),
      });

      if (!res.ok) {
        console.error(`[sms:twilio] Failed (${res.status})`);
        return { success: false };
      }
      return { success: true };
    } catch (err) {
      console.error(`[sms:twilio] ${err instanceof Error ? err.message : "unknown error"}`);
      return { success: false };
    }
  }

  // 2. Generic HTTP webhook
  if (process.env.SMS_WEBHOOK_URL) {
    try {
      const res = await fetch(process.env.SMS_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneE164,
          message: `Your Voice of Gudalur verification code is: ${otp}`,
        }),
      });
      if (!res.ok) {
        console.error(`[sms:webhook] Failed (${res.status})`);
        return { success: false };
      }
      return { success: true };
    } catch (err) {
      console.error(`[sms:webhook] ${err instanceof Error ? err.message : "unknown error"}`);
      return { success: false };
    }
  }

  // 3. Development fallback — log OTP. NEVER in production.
  if (process.env.NODE_ENV === "production") {
    console.error("[sms] No SMS provider configured in production — refusing to send OTP");
    return { success: false };
  }

  console.log(`[DEV] OTP for ${phoneE164}: ${otp}`);
  return { success: true };
}

function generateOtp(): string {
  const bytes = randomBytes(4);
  const num = bytes.readUInt32BE(0) % 1000000;
  return num.toString().padStart(OTP_LENGTH, "0");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}
