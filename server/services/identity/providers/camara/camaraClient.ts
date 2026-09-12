/**
 * CAMARA HTTP client — OAuth2 client-credentials token lifecycle + circuit
 * breaker + timeout. Token cache is in-memory per instance (serverless-safe:
 * each instance acquires a token with an expiry window; token reuse is NOT
 * cross-instance). The subject is never part of any URL or log.
 */
import { CamaraConfig } from './camaraConfig';
import { CamaraTokenResponse } from './camaraTypes';
import { providerErrors, ProviderError } from '../errors';
import { circuitBreaker } from '../../../../middleware/circuitBreaker';

export interface CamaraClientOptions {
  timeoutMs?: number;
  tokenCacheTtlBufSec?: number;
}

interface TokenCacheEntry {
  accessToken: string;
  expiresAtMs: number;
}

export class CamaraClient {
  readonly config: CamaraConfig;
  private tokenCache: TokenCacheEntry | null = null;
  private tokenPromise: Promise<string> | null = null;
  private readonly timeoutMs: number;
  private readonly ttlBufSec: number;

  constructor(config: CamaraConfig, opts: CamaraClientOptions = {}) {
    this.config = config;
    this.timeoutMs = opts.timeoutMs ?? config.timeoutMs;
    this.ttlBufSec = opts.tokenCacheTtlBufSec ?? 60; // refresh 60s before real expiry
  }

  get circuitKey(): string {
    return 'identity:provider:camara';
  }

  /** Acquire an OAuth2 access token via client_credentials (cached, single-flight). */
  async getAccessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAtMs > Date.now() + this.ttlBufSec * 1000) {
      return this.tokenCache.accessToken;
    }
    if (this.tokenPromise) return this.tokenPromise;

    this.tokenPromise = this.fetchToken().finally(() => {
      this.tokenPromise = null;
    });
    return this.tokenPromise;
  }

  private async fetchToken(): Promise<string> {
    return circuitBreaker(
      this.circuitKey + ':token',
      async () => {
        let body: string;
        try {
          const url = new URL(this.config.tokenUrl);
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json',
              Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
            },
            body: new URLSearchParams({
              grant_type: 'client_credentials',
              scope: this.config.scope ?? '',
            }).toString(),
            signal: AbortSignal.timeout(this.timeoutMs),
          });
          body = await res.text();
          if (!res.ok) {
            throw providerErrors.http('camara', res.status);
          }
        } catch (e: any) {
          if (e instanceof ProviderError) throw e;
          if (e?.name === 'TimeoutError' || e?.name === 'AbortError') throw providerErrors.timeout('camara');
          throw providerErrors.transport('camara');
        }

        let parsed: CamaraTokenResponse;
        try {
          parsed = JSON.parse(body) as CamaraTokenResponse;
        } catch {
          throw providerErrors.malformed('camara', 'token response is not JSON');
        }
        if (!parsed.access_token) throw providerErrors.authFailed('camara', 'no access_token in response');
        const expiresIn = Number(parsed.expires_in ?? 3600);
        this.tokenCache = {
          accessToken: parsed.access_token,
          expiresAtMs: Date.now() + expiresIn * 1000,
        };
        return this.tokenCache.accessToken;
      },
      { timeoutMs: this.timeoutMs },
    );
  }

  /** Generic POST returning parsed JSON (throws typed ProviderError). */
  async postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
    const token = await this.getAccessToken();
    return circuitBreaker(
      this.circuitKey + ':verify',
      async () => {
        let body: string;
        try {
          const url = new URL(this.config.baseUrl + path);
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(this.timeoutMs),
          });
          body = await res.text();
          if (!res.ok) {
            // 429 or 5xx: providers may return problem+json — we do NOT surface body.
            throw providerErrors.http('camara', res.status);
          }
        } catch (e: any) {
          if (e instanceof ProviderError) throw e;
          if (e?.name === 'TimeoutError' || e?.name === 'AbortError') throw providerErrors.timeout('camara');
          throw providerErrors.transport('camara');
        }
        try {
          return JSON.parse(body) as T;
        } catch {
          throw providerErrors.malformed('camara', 'response is not JSON');
        }
      },
      { timeoutMs: this.timeoutMs },
    );
  }
}