/**
 * CAMARA Number Verification adapter configuration — env-driven, fail-closed.
 *
 * CAMARA is the open API specification for telecom network APIs. It is NOT
 * itself a service: it requires access through a participating operator or a
 * CAMARA-compliant aggregator (sandbox or production).
 *
 * CONFIGURATION MODEL (all environment-driven, never committed):
 *   CAMARA_MODE=off|sandbox|production      (default: off — adapter is inert)
 *   CAMARA_BASE_URL=...                      provider endpoint (sandbox or aggregator)
 *   CAMARA_CLIENT_ID=...                     OAuth2 client id
 *   CAMARA_CLIENT_SECRET=...                 OAuth2 client secret (server-only)
 *   CAMARA_SCOPE=...                         optional OAuth2 scope
 *   CAMARA_TOKEN_URL=...                     optional; defaults to CAMARA_BASE_URL + /oauth2/token
 *   CAMARA_TIMEOUT_MS=...                    default 5000
 *   CAMARA_NUMBER_VERIFICATION_PATH=...      default /number-verification/v0.2/verify
 *   CAMARA_SUBSCRIBER_MATCH_PATH=...         default /number-verification/v0.2/device-phone-number
 *
 * The adapter NEVER logs the subject. The secret is server-only.
 */
export interface CamaraConfig {
  mode: 'off' | 'sandbox' | 'production';
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  tokenUrl: string;
  numberVerificationPath: string;
  subscriberMatchPath: string;
  timeoutMs: number;
}

export const CAMARA_DEFAULT_PATHS = {
  numberVerification: '/number-verification/v0.2/verify',
  subscriberMatch: '/number-verification/v0.2/device-phone-number',
};

export function loadCamaraConfig(env: NodeJS.ProcessEnv = process.env): CamaraConfig {
  const mode = (env.CAMARA_MODE || 'off').toLowerCase();
  const baseUrl = (env.CAMARA_BASE_URL || '').replace(/\/+$/, '');

  if (mode === 'off') {
    return {
      mode: 'off',
      baseUrl: '',
      clientId: '',
      clientSecret: '',
      tokenUrl: '',
      numberVerificationPath: CAMARA_DEFAULT_PATHS.numberVerification,
      subscriberMatchPath: CAMARA_DEFAULT_PATHS.subscriberMatch,
      timeoutMs: Number(env.CAMARA_TIMEOUT_MS ?? 5000),
    };
  }

  if (mode === 'sandbox' || mode === 'production') {
    const missing: string[] = [];
    if (!baseUrl) missing.push('CAMARA_BASE_URL');
    if (!env.CAMARA_CLIENT_ID) missing.push('CAMARA_CLIENT_ID');
    if (!env.CAMARA_CLIENT_SECRET) missing.push('CAMARA_CLIENT_SECRET');
    if (missing.length) {
      throw new Error(`CAMARA configured as ${mode} but missing: ${missing.join(', ')}`);
    }
    return {
      mode,
      baseUrl,
      clientId: env.CAMARA_CLIENT_ID!,
      clientSecret: env.CAMARA_CLIENT_SECRET!,
      scope: env.CAMARA_SCOPE || 'dpv:FraudPreventionAndDetection#number-verification-verify-read',
      tokenUrl: (env.CAMARA_TOKEN_URL || baseUrl + '/oauth2/token').replace(/\/+$/, ''),
      numberVerificationPath: env.CAMARA_NUMBER_VERIFICATION_PATH || CAMARA_DEFAULT_PATHS.numberVerification,
      subscriberMatchPath: env.CAMARA_SUBSCRIBER_MATCH_PATH || CAMARA_DEFAULT_PATHS.subscriberMatch,
      timeoutMs: Number(env.CAMARA_TIMEOUT_MS ?? 5000),
    };
  }

  throw new Error(`CAMARA_MODE must be off|sandbox|production (got "${mode}")`);
}

/** Production-mode detection — drives capability reporting and UI claims. */
export function isCamaraProduction(mode: CamaraConfig['mode']): boolean {
  return mode === 'production';
}

export function isCamaraEnabled(config: CamaraConfig): boolean {
  return config.mode === 'sandbox' || config.mode === 'production';
}