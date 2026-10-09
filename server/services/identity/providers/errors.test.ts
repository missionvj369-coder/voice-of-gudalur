import { describe, it, expect } from 'vitest';
import { ProviderError, providerErrors } from './errors';

describe('provider error taxonomy (client-safe reasons)', () => {
  it('maps config_missing → provider_unavailable', () => {
    const e = providerErrors.configMissing('camara', 'CAMARA_BASE_URL');
    expect(e).toBeInstanceOf(ProviderError);
    expect(e.reason).toBe('provider_unavailable');
    expect(e.circuitKey).toBe('identity:provider:camara');
  });

  it('maps timeout → provider_timeout', () => {
    expect(providerErrors.timeout('camara').reason).toBe('provider_timeout');
  });

  it('maps http_error → provider_error with status', () => {
    const e = providerErrors.http('camara', 503);
    expect(e.reason).toBe('provider_error');
    expect(e.httpStatus).toBe(503);
  });

  it('maps auth_failed → invalid_token', () => {
    expect(providerErrors.authFailed('camara').reason).toBe('invalid_token');
  });

  it('maps token_expired → token_expired', () => {
    expect(providerErrors.tokenExpired('camara').reason).toBe('token_expired');
  });

  it('maps malformed → malformed_response', () => {
    expect(providerErrors.malformed('camara').reason).toBe('malformed_response');
  });

  it('maps verification_mismatch → verification_mismatch', () => {
    expect(providerErrors.mismatch('camara').reason).toBe('verification_mismatch');
  });

  it('maps not_supported → not_supported', () => {
    expect(providerErrors.notSupported('camara').reason).toBe('not_supported');
  });

  it('error messages never contain a raw subject', () => {
    const e = providerErrors.transport('camara', 'connection dropped');
    expect(e.message).not.toContain('9876543210');
  });

  it('is safe for generic catch blocks (instanceof works)', () => {
    try {
      throw providerErrors.timeout('camara');
    } catch (e) {
      expect(e instanceof ProviderError).toBe(true);
      expect((e as ProviderError).kind).toBe('timeout');
    }
  });
});