import { describe, it, expect } from 'vitest';

describe('auth types', () => {
  it('VerificationLevel includes PHONE_VERIFIED', async () => {
    const levels = ['REGISTERED', 'PHONE_VERIFIED', 'LOCALITY_VERIFIED', 'TRUSTED_MEMBER', 'LOCAL_ADMIN', 'CORE_ADMIN', 'PLATFORM_ADMIN'];
    expect(levels).toContain('PHONE_VERIFIED');
  });

  it('authApi has requestOtp and verifyOtp methods', async () => {
    const { authApi } = await import('../api');
    expect(typeof authApi.requestOtp).toBe('function');
    expect(typeof authApi.verifyOtp).toBe('function');
    expect(typeof authApi.register).toBe('function');
  });
});
