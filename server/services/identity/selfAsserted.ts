/**
 * Open Civic Signature Protocol — SelfAssertedVerifier provider.
 *
 * This is NOT a mock and can never become one. It is the legitimate production
 * fallback provider for campaigns where network verification is not yet
 * available. It verifies exactly ONE claim:
 *
 *    "the person submitting confirmed (consented) that they control this number"
 *
 * which maps to AssuranceLevel.SELF_ASSERTED_MOBILE. It NEVER claims network
 * verification, never performs an operator lookup, and stores nothing about
 * the subject (the engine derives the identity_key_hash before calling verify).
 *
 * Consent is passed through callbackData.consent === 'acknowledged' — set by
 * the route layer ONLY when the user explicitly confirmed (UI checkbox/text),
 * never by the client-supplied body directly.
 */
import {
  AssuranceLevel,
  MobileIdentityVerifier,
  VerificationCapabilities,
  VerificationRequest,
  VerificationResult,
  VerificationFailureReason,
} from './types';
import { normalizeMobile } from '../../utils/petitionIdentity';
import { providerErrors } from './providers/errors';

const CONSENT_MARKER = 'acknowledged';

export class SelfAssertedVerifier implements MobileIdentityVerifier {
  getCapabilities(): VerificationCapabilities {
    return {
      provider: 'self-asserted',
      maxAssurance: AssuranceLevel.SELF_ASSERTED_MOBILE,
      production: true, // this provider's claim is available in production (it makes no network claim)
      sandbox: false,
      description: 'Self-asserted mobile identity — confirms the submitter entered and accepted responsibility for the mobile number.',
    };
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    // The engine must have normalized the subject already; we re-validate that
    // it LOOKS like a canonical mobile so a malformed subject never reaches
    // a "verified" state.
    const parsed = normalizeMobile(request.subject);
    if (!parsed.ok) {
      throw providerErrors.configInvalid('self-asserted', 'subject is not a canonical mobile');
    }

    const consent = request.callbackData?.consent;
    if (consent !== CONSENT_MARKER) {
      return {
        ok: false,
        assurance: this.getCapabilities().maxAssurance,
        failureReason: 'not_verified' as VerificationFailureReason,
      };
    }

    // Deterministic reference derived from the identity hash so the resulting
    // transaction is stable across engine retries without retaining the subject.
    return {
      ok: true,
      providerRef: 'sa-' + request.transactionRef.toLowerCase(),
      resultReference: 'self-asserted',
      assurance: AssuranceLevel.SELF_ASSERTED_MOBILE,
    };
  }
}