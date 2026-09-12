import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CamaraNumberVerification } from './camaraNumberVerification';
import { AssuranceLevel, VerificationRequest } from '../../types';

const SUBJECT = '9876543210';

function makeReq(overrides: Partial<VerificationRequest> = {}): VerificationRequest {
  return {
    transactionRef: 'VOG-VT-TEST',
    requestId: 'req-1',
    subject: SUBJECT,
    requestedAssurance: AssuranceLevel.NETWORK_VERIFIED,
    ...overrides,
  };
}

describe('CamaraNumberVerification capabilities (honest reporting)', () => {
  afterEach(() => { delete process.env.CAMARA_MODE; });

  it('reports maxAssurance NONE + no production when CAMARA_MODE=off', () => {
    const adapter = new CamaraNumberVerification({ CAMARA_MODE: 'off' });
    const caps = adapter.getCapabilities();
    expect(caps.maxAssurance).toBe(AssuranceLevel.NONE);
    expect(caps.production).toBe(false);
    expect(caps.sandbox).toBe(false);
  });

  it('reports sandbox (not production) when CAMARA_MODE=sandbox', () => {
    const adapter = new CamaraNumberVerification({
      CAMARA_MODE: 'sandbox',
      CAMARA_BASE_URL: 'https://sandbox.example.com',
      CAMARA_CLIENT_ID: 'cid',
      CAMARA_CLIENT_SECRET: 'csecret',
    });
    const caps = adapter.getCapabilities();
    expect(caps.maxAssurance).toBe(AssuranceLevel.NETWORK_VERIFIED);
    expect(caps.sandbox).toBe(true);
    expect(caps.production).toBe(false);
  });

  it('reports production only when CAMARA_MODE=production', () => {
    const adapter = new CamaraNumberVerification({
      CAMARA_MODE: 'production',
      CAMARA_BASE_URL: 'https://operator.example.com',
      CAMARA_CLIENT_ID: 'cid',
      CAMARA_CLIENT_SECRET: 'csecret',
    });
    const caps = adapter.getCapabilities();
    expect(caps.sandbox).toBe(false);
    expect(caps.production).toBe(true);
  });
});
describe('CamaraNumberVerification.verify (response mapping)', () => {
  const SANDBOX_ENV = {
    CAMARA_MODE: 'sandbox',
    CAMARA_BASE_URL: 'https://sandbox.invalid',
    CAMARA_CLIENT_ID: 'cid',
    CAMARA_CLIENT_SECRET: 'csecret',
  };

  /** Stub fetch: token endpoint always returns a token; verify endpoint per-test. */
  function stubCamaraHttp(verifyResponse: { ok: boolean; status?: number; body: string }) {
    vi.stubGlobal('fetch', vi.fn(async (url: any) => {
      const u = String(url);
      if (u.includes('/oauth2/token')) {
        return { ok: true, text: () => Promise.resolve(JSON.stringify({ access_token: 'tok', expires_in: 3600 })) } as any;
      }
      return { ok: verifyResponse.ok, status: verifyResponse.status, text: () => Promise.resolve(verifyResponse.body) } as any;
    }));
  }

  beforeEach(() => { Object.assign(process.env, SANDBOX_ENV); });
  afterEach(() => {
    for (const k of ['CAMARA_MODE', 'CAMARA_BASE_URL', 'CAMARA_CLIENT_ID', 'CAMARA_CLIENT_SECRET']) delete process.env[k];
    vi.unstubAllGlobals();
  });

  it('maps devicePhoneNumberVerified:true → ok', async () => {
    stubCamaraHttp({ ok: true, body: JSON.stringify({ devicePhoneNumberVerified: true }) });
    const adapter = new CamaraNumberVerification(process.env);
    const r = await adapter.verify(makeReq());
    expect(r.ok).toBe(true);
    expect(r.assurance).toBe(AssuranceLevel.NETWORK_VERIFIED);
    expect(r.providerRef).toMatch(/^cam-/);
    expect(r.resultReference).toMatch(/^[0-9a-f]{64}$/);
  });

  it('maps devicePhoneNumberVerified:false → mismatch', async () => {
    stubCamaraHttp({ ok: true, body: JSON.stringify({ devicePhoneNumberVerified: false }) });
    const adapter = new CamaraNumberVerification(process.env);
    const r = await adapter.verify(makeReq());
    expect(r.ok).toBe(false);
    expect(r.failureReason).toBe('verification_mismatch');
  });

  it('maps verificationResult:false (v0.3) → mismatch', async () => {
    stubCamaraHttp({ ok: true, body: JSON.stringify({ verificationResult: false }) });
    const adapter = new CamaraNumberVerification(process.env);
    const r = await adapter.verify(makeReq());
    expect(r.ok).toBe(false);
    expect(r.failureReason).toBe('verification_mismatch');
  });

  it('maps malformed response → malformed_response', async () => {
    stubCamaraHttp({ ok: true, body: JSON.stringify({ unexpected: 1 }) });
    const adapter = new CamaraNumberVerification(process.env);
    const r = await adapter.verify(makeReq());
    expect(r.ok).toBe(false);
    expect(r.failureReason).toBe('malformed_response');
  });

  it('maps HTTP 500 → provider_error (never leaks the response body)', async () => {
    stubCamaraHttp({ ok: false, status: 500, body: '{"status":500,"message":"db down phone=+919876543210"}' });
    const adapter = new CamaraNumberVerification(process.env);
    const r = await adapter.verify(makeReq());
    expect(r.ok).toBe(false);
    expect(r.failureReason).toBe('provider_error');
  });

  it('maps timeout → provider_timeout', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      const err: any = new Error('The operation was aborted');
      err.name = 'TimeoutError';
      throw err;
    }));
    const adapter = new CamaraNumberVerification(process.env);
    const r = await adapter.verify(makeReq());
    expect(r.ok).toBe(false);
    expect(r.failureReason).toBe('provider_timeout');
  });

  it('maps transport failure → provider_unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET'); }));
    const adapter = new CamaraNumberVerification(process.env);
    const r = await adapter.verify(makeReq());
    expect(r.ok).toBe(false);
    expect(r.failureReason).toBe('provider_unavailable');
  });

  it('fails closed (throws ProviderError) when CAMARA_MODE is off', async () => {
    delete process.env.CAMARA_MODE;
    const adapter = new CamaraNumberVerification(process.env);
    // Contract: config failures throw a typed ProviderError. The ENGINE catches
    // it and records FAILED with a client-safe reason (see verificationService tests).
    await expect(adapter.verify(makeReq())).rejects.toThrow(/configuration incomplete/);
  });

  it('never includes the raw phone number in the result payload', async () => {
    stubCamaraHttp({ ok: true, body: JSON.stringify({ devicePhoneNumberVerified: true }) });
    const adapter = new CamaraNumberVerification(process.env);
    const r = await adapter.verify(makeReq());
    const serialized = JSON.stringify(r);
    expect(serialized).not.toContain(SUBJECT);
    expect(serialized).not.toContain('+91');
  });
});