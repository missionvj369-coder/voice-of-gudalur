/**
 * CAMARA Number Verification API types (v0.2 / v0.3 subset actually used).
 * These mirror the public CAMARA "NumberVerification" and "Subscriber Match"
 * specifications. No operator-specific fields are required by the adapter.
 */

/** POST /number-verification/v0.2/verify  (Number Verification API v0.2). */
export interface CamaraNumberVerifyRequestV0_2 {
  phoneNumber: string; // E.164, e.g. +919876543210
}

export interface CamaraNumberVerifyResponseV0_2 {
  devicePhoneNumberVerified: boolean;
  phoneNumber?: string; // may be echoed by some implementations
}

/** POST /number-verification/v0.3/verify  (Number Verification API v0.3). */
export interface CamaraNumberVerifyRequestV0_3 {
  phoneNumber: string;
}

export interface CamaraNumberVerifyResponseV0_3 {
  verificationResult: boolean;
  verificationStatus?: string;
}

/** POST /number-verification/v0.2/device-phone-number  (Subscriber Match). */
export interface CamaraDevicePhoneNumberRequest {
  phoneNumber: string;
}

export interface CamaraDevicePhoneNumberResponse {
  devicePhoneNumber: string | null; // null / "null" when the phone is NOT on the device's SIM
  matched?: boolean;
}

/** OAuth2 token response (RFC 6749 client credentials flow). */
export interface CamaraTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

/** Standard CAMARA error response (problem+json). */
export interface CamaraErrorResponse {
  status?: number;
  code?: string;
  message?: string;
}

/** Union of response shapes we accept from verification endpoints. */
export type CamaraVerifyResponse = CamaraNumberVerifyResponseV0_2 | CamaraNumberVerifyResponseV0_3;

/** v0.3 device-phone-number response — signal the frontend receives and we
 *  relay to the adapter through the redirect/callback flow. */
export interface CamaraSubscriberMatchRequest {
  /** Opaque correlation token the orchestrator issued at start(). */
  transactionId: string;
}