import { describe, it, expect } from 'vitest';

describe('auth types', () => {
  it('VerificationLevel includes PHONE_VERIFIED', async () => {
    const levels = ['REGISTERED', 'PHONE_VERIFIED', 'LOCALITY_VERIFIED', 'TRUSTED_MEMBER', 'LOCAL_ADMIN', 'CORE_ADMIN', 'PLATFORM_ADMIN'];
    expect(levels).toContain('PHONE_VERIFIED');
  });

  it('authApi has passwordless register + lookup methods (no OTP anywhere)', async () => {
    const { authApi } = await import('../api');
    expect(typeof authApi.register).toBe('function');
    expect(typeof authApi.lookup).toBe('function');
    // Resident flows are OTP-free by design — the dead OTP client was removed.
    expect((authApi as Record<string, unknown>).requestOtp).toBeUndefined();
    expect((authApi as Record<string, unknown>).verifyOtp).toBeUndefined();
  });
});
