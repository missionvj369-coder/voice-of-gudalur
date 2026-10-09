/**
 * Open Civic Signature Protocol — provider error taxonomy.
 *
 * All transport/config/validation failures from a provider adapter throw one
 * of these typed errors. The engine maps them to client-safe failure reasons
 * and circuit-breaker events. Never attach the raw subject or raw response
 * payload to an error message.
 */

export type ProviderErrorKind =
  | 'config_missing'
  | 'config_invalid'
  | 'timeout'
  | 'transport'
  | 'http_error'
  | 'auth_failed'
  | 'token_expired'
  | 'malformed_response'
  | 'verification_mismatch'
  | 'not_supported'
  | 'rate_limited';

export type ProviderFailureReason =
  | 'provider_unavailable'
  | 'provider_error'
  | 'provider_timeout'
  | 'malformed_response'
  | 'invalid_token'
  | 'token_expired'
  | 'verification_mismatch'
  | 'not_verified'
  | 'not_supported';

const KIND_TO_REASON: Record<ProviderErrorKind, ProviderFailureReason> = {
  config_missing: 'provider_unavailable',
  config_invalid: 'provider_unavailable',
  timeout: 'provider_timeout',
  transport: 'provider_unavailable',
  http_error: 'provider_error',
  auth_failed: 'invalid_token',
  token_expired: 'token_expired',
  malformed_response: 'malformed_response',
  verification_mismatch: 'verification_mismatch',
  not_supported: 'not_supported',
  rate_limited: 'provider_unavailable',
};

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly reason: ProviderFailureReason;
  readonly provider: string;
  /** HTTP status when available (never the response body). */
  readonly httpStatus?: number;
  /** Circuit-breaker key to use for this provider. */
  readonly circuitKey: string;

  constructor(provider: string, kind: ProviderErrorKind, message: string, httpStatus?: number) {
    super(`${provider} provider error (${kind}): ${message}`);
    this.name = 'ProviderError';
    this.provider = provider;
    this.kind = kind;
    this.reason = KIND_TO_REASON[kind];
    this.httpStatus = httpStatus;
    this.circuitKey = `identity:provider:${provider}`;
  }
}

/** Convenience constructors used by adapters. */
export const providerErrors = {
  configMissing: (provider: string, detail: string) =>
    new ProviderError(provider, 'config_missing', `configuration incomplete: ${detail}`),
  configInvalid: (provider: string, detail: string) =>
    new ProviderError(provider, 'config_invalid', detail),
  timeout: (provider: string) => new ProviderError(provider, 'timeout', 'provider did not respond in time'),
  transport: (provider: string, detail?: string) =>
    new ProviderError(provider, 'transport', detail ?? 'transport failure'),
  http: (provider: string, status: number) =>
    new ProviderError(provider, 'http_error', `HTTP ${status}`, status),
  authFailed: (provider: string, detail = 'authentication rejected') =>
    new ProviderError(provider, 'auth_failed', detail),
  tokenExpired: (provider: string) => new ProviderError(provider, 'token_expired', 'provider token expired'),
  malformed: (provider: string, detail = 'malformed provider response') =>
    new ProviderError(provider, 'malformed_response', detail),
  mismatch: (provider: string) => new ProviderError(provider, 'verification_mismatch', 'subject did not match'),
  notSupported: (provider: string, detail = 'operation not supported') =>
    new ProviderError(provider, 'not_supported', detail),
};

