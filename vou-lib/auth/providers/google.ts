/**
 * Google authentication provider.
 * 
 * Validates server-side: issuer, audience, signature, expiration, nonce.
 * NOTE: Google login alone does NOT prove one physical mobile number per person.
 */

import type { VerifiedIdentity } from "../types";

const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";

let certsCache: { keys: Record<string, { n: string; e: string }>; expires: number } | null = null;

type GoogleIdTokenPayload = {
  iss: string;
  aud: string;
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  iat: number;
  exp: number;
  nonce?: string;
};

export async function authenticateGoogle(params: {
  idToken: string;
  nonce: string;
}): Promise<{ success: true; identity: VerifiedIdentity } | { success: false; error: string }> {
  try {
    const payload = await verifyGoogleIdToken(params.idToken, params.nonce);
    if (!payload) {
      return { success: false, error: "Invalid or expired ID token" };
    }

    const identity: VerifiedIdentity = {
      provider: "google",
      providerSubject: payload.sub,
      phoneVerified: false,
      assuranceLevel: payload.email_verified ? "medium" : "low",
      verifiedAt: new Date().toISOString(),
    };

    return { success: true, identity };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Google authentication failed",
    };
  }
}

async function verifyGoogleIdToken(
  idToken: string,
  expectedNonce: string
): Promise<GoogleIdTokenPayload | null> {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(Buffer.from(headerB64, "base64url").toString());
  const kid = header.kid;
  if (!kid) return null;

  const payload = JSON.parse(
    Buffer.from(payloadB64, "base64url").toString()
  ) as GoogleIdTokenPayload;

  if (!GOOGLE_ISSUERS.includes(payload.iss)) return null;
  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) return null;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return null;
  if (payload.iat > now + 60) return null;
  if (payload.nonce !== expectedNonce) return null;

  const isValid = await verifySignature(headerB64, payloadB64, signatureB64, kid);
  if (!isValid) return null;

  return payload;
}

async function verifySignature(
  headerB64: string,
  payloadB64: string,
  signatureB64: string,
  kid: string
): Promise<boolean> {
  try {
    const keys = await getGooglePublicKeys();
    const key = keys[kid];
    if (!key) return false;

    const crypto = await import("crypto");
    // Use Node's built-in JWK support — avoids fragile manual DER encoding.
    const publicKey = crypto.createPublicKey({ key, format: "jwk" });
    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(`${headerB64}.${payloadB64}`);
    const signature = Buffer.from(signatureB64, "base64url");
    return verify.verify(publicKey, signature);
  } catch {
    return false;
  }
}

async function getGooglePublicKeys(): Promise<Record<string, { n: string; e: string }>> {
  const now = Date.now();
  if (certsCache && certsCache.expires > now) return certsCache.keys;

  const response = await fetch(GOOGLE_CERTS_URL);
  if (!response.ok) throw new Error("Failed to fetch Google public keys");

  const data = (await response.json()) as { keys: Array<{ kid: string; n: string; e: string }> };
  const keys: Record<string, { n: string; e: string }> = {};
  for (const key of data.keys) {
    keys[key.kid] = { n: key.n, e: key.e };
  }

  certsCache = { keys, expires: now + 3600000 };
  return keys;
}
