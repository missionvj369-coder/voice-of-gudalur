/**
 * CAMARA adapter — implements MobileIdentityVerifier for the CAMARA
 * "Number Verification" / "Subscriber Match" APIs.
 *
 * Honest capability reporting is critical:
 *  - CAMARA_MODE=off           → adapter reports maxAssurance 0 and inert.
 *  - CAMARA_MODE=sandbox      → reports NETWORK_VERIFIED for a SANDBOX (never
 *                               claim production network verification).
 *  - CAMARA_MODE=production   → reports NETWORK_VERIFIED only when a production
 *                               operator/aggregator endpoint is configured;
 *                               production access still requires onboarding.
 *
 * The adapter NEVER stores or logs the raw phone number. Every provider call
 * includes an E.164 subject, but the result only ever produces a boolean,
 * an opaque providerRef, and a results hash.
 */
import {
  AssuranceLevel,
  MobileIdentityVerifier,
  VerificationCapabilities,
  VerificationRequest,
  VerificationResult,
  VerificationFailureReason,
} from '../../types';
import { loadCamaraConfig, CamaraConfig, isCamaraEnabled, isCamaraProduction } from './camaraConfig';
import { CamaraVerifyResponse, CamaraNumberVerifyResponseV0_2, CamaraNumberVerifyResponseV0_3 } from './camaraTypes';
import { CamaraClient } from './camaraClient';
import { providerErrors } from '../errors';
import crypto from 'crypto';

function toE164(canonicalNational: string): string {
  return '+91' + canonicalNational;
}

export class CamaraNumberVerification implements MobileIdentityVerifier {
  private readonly config: CamaraConfig;
  private readonly client: CamaraClient | null;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.config = loadCamaraConfig(env);
    this.client = isCamaraEnabled(this.config) ? new CamaraClient(this.config) : null;
  }

  getCapabilities(): VerificationCapabilities {
    if (!isCamaraEnabled(this.config)) {
      return {
        provider: 'camara',
        maxAssurance: AssuranceLevel.NONE,
        production: false,
        sandbox: false,
        description: 'CAMARA Number Verification is not configured. The engine falls back to self-asserted verification.',
      };
    }
    return {
      provider: 'camara',
      maxAssurance: AssuranceLevel.NETWORK_VERIFIED,
      production: isCamaraProduction(this.config.mode),
      sandbox: this.config.mode === 'sandbox',
      description:
        this.config.mode === 'production'
          ? 'Network-verified mobile identity (production operator access).'
          : 'Network-verified mobile identity (sandbox). Does not prove a live operator check in production.',
    };
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    if (!this.client) {
      throw providerErrors.configMissing('camara', 'CAMARA_MODE is off or unset');
    }

    const e164 = toE164(request.subject);
    const payload = { phoneNumber: e164 };

    try {
      const raw = await this.client.postJson<CamaraVerifyResponse>(
        this.config.numberVerificationPath,
        payload,
      );
      return this.mapResponse(raw);
    } catch (e: any) {
      if (e instanceof Error && (e as any).kind) {
        const pe = e as any;
        const reason: VerificationFailureReason =
          pe.reason === 'provider_timeout' ? 'provider_timeout'
            : pe.reason === 'malformed_response' ? 'malformed_response'
            : pe.reason === 'invalid_token' || pe.reason === 'token_expired' ? 'invalid_token'
            : pe.reason === 'verification_mismatch' ? 'verification_mismatch'
            : pe.reason === 'provider_unavailable' ? 'provider_unavailable'
            : 'provider_error';
        return { ok: false, assurance: this.getCapabilities().maxAssurance, failureReason: reason };
      }
      // Unexpected — never leak details; map to provider_error.
      return { ok: false, assurance: this.getCapabilities().maxAssurance, failureReason: 'provider_error' };
    }
  }

  private mapResponse(raw: CamaraVerifyResponse): VerificationResult {
    const normalized: { verified: boolean; rawPayload: string } =
      this.normalizeVerifyResponse(raw);

    // Deterministic integrity reference from the raw payload — proves the
    // VERIFIED result recorded matches a specific provider response while
    // never persisting the payload itself.
    const resultReference = crypto
      .createHmac('sha256', process.env.VERIFICATION_IDENTITY_SECRET || process.env.PETITION_IDENTITY_SECRET || 'fallback-only-for-sanitization')
      .update('open-civic-signature:v1:camara-result:' + normalized.rawPayload, 'utf8')
      .digest('hex');

    if (!normalized.verified) {
      return {
        ok: false,
        assurance: AssuranceLevel.NETWORK_VERIFIED,
        failureReason: 'verification_mismatch',
        resultReference,
      };
    }
    return {
      ok: true,
      providerRef: 'cam-' + crypto.randomBytes(8).toString('hex'),
      resultReference,
      assurance: AssuranceLevel.NETWORK_VERIFIED,
    };
  }

  private normalizeVerifyResponse(raw: CamaraVerifyResponse): { verified: boolean; rawPayload: string } {
    if (raw == null || typeof raw !== 'object') {
      throw providerErrors.malformed('camara', 'empty verification response');
    }
    const rawPayload = JSON.stringify(raw);
    const { verified } = this.extractVerified(raw);
    return { verified, rawPayload };
  }

  private extractVerified(raw: CamaraVerifyResponse): { verified: boolean } {
    const v02 = raw as CamaraNumberVerifyResponseV0_2;
    if (typeof v02.devicePhoneNumberVerified === 'boolean') {
      return { verified: v02.devicePhoneNumberVerified };
    }
    const v03 = raw as CamaraNumberVerifyResponseV0_3;
    if (typeof v03.verificationResult === 'boolean') {
      return { verified: v03.verificationResult };
    }
    throw providerErrors.malformed('camara', 'no verificationResult/devicePhoneNumberVerified field');
  }
}