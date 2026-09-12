/**
 * Provider-independent authentication types.
 * The backend creates VerifiedIdentity only after independently validating provider responses.
 * Never accept this object directly from the browser.
 */

export type AuthProvider = "camara" | "phone_otp" | "google" | "telegram" | "manual";

export type AssuranceLevel = "low" | "medium" | "high";

export type VerifiedIdentity = {
  provider: AuthProvider;
  providerSubject: string;
  phoneVerified: boolean;
  phoneE164?: string;
  assuranceLevel: AssuranceLevel;
  verifiedAt: string; // ISO 8601
};

/**
 * Result returned to the client after successful authentication.
 * Contains only a session token reference — never the raw identity.
 */
export type AuthResult = {
  success: true;
  sessionId: string;
  assuranceLevel: AssuranceLevel;
  phoneVerified: boolean;
};

export type AuthError = {
  success: false;
  error: string;
  retryable: boolean;
};

/**
 * Input for creating a session from a provider credential.
 * Each provider validates this differently.
 */
export type CreateSessionInput =
  | { provider: "google"; idToken: string; nonce: string }
  | { provider: "telegram"; payload: TelegramAuthPayload }
  | { provider: "phone_otp"; phoneE164: string; otp: string; requestId: string }
  | { provider: "camara"; accessToken: string; nonce: string }
  | { provider: "manual"; reason: string; adminToken: string };

export type TelegramAuthPayload = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};
