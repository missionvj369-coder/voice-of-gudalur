// Voice of Gudalur — unit tests for the SMS emergency bridge.
// This module is the zero-connectivity fallback for wildlife-human conflict alerts,
// so the message format and danger classification are tested as a safety feature.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendSMSViaNativeApp,
  sendEmergencyAlert,
  isDangerousAnimal,
  isHighDangerAnimal,
  getEmergencyContacts,
  type SMSPayload,
} from '../smsBridge';

const payload: SMSPayload = {
  animalType: 'elephant',
  lat: 11.5093,
  lng: 76.5353,
  locationName: 'Gudalur Town',
  timestamp: new Date('2026-01-01T10:30:00').getTime(),
  danger: true,
  reporterName: 'Arun',
};

describe('isDangerousAnimal / isHighDangerAnimal', () => {
  it('flags known conflict species as dangerous', () => {
    expect(isDangerousAnimal('elephant')).toBe(true);
    expect(isDangerousAnimal('tiger')).toBe(true);
    expect(isDangerousAnimal('crocodile')).toBe(true);
  });

  it('flags apex predators as HIGH danger', () => {
    expect(isHighDangerAnimal('tiger')).toBe(true);
    expect(isHighDangerAnimal('leopard')).toBe(true);
    expect(isHighDangerAnimal('bear')).toBe(true);
  });

  it('does not flag harmless species', () => {
    expect(isDangerousAnimal('peacock')).toBe(false);
    expect(isHighDangerAnimal('elephant')).toBe(false);
    expect(isDangerousAnimal('')).toBe(false);
  });
});

describe('sendSMSViaNativeApp', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { href: '' } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds a correct sms: URI with GPS coordinates', async () => {
    const r = await sendSMSViaNativeApp(payload, [
      { name: 'Forest Range', role: 'forest_dept', phone: '+914232222222' },
    ]);
    expect(r.success).toBe(true);
    expect(r.smsUri).toContain('sms:+914232222222');
    expect(r.smsUri).toContain('body=');
    expect(decodeURIComponent(r.smsUri)).toContain('11.5093');
    expect(decodeURIComponent(r.smsUri)).toContain('VOG');
  });

  it('falls back gracefully when the SMS app cannot be opened', async () => {
    vi.stubGlobal('window', undefined as unknown as Window);
    const r = await sendSMSViaNativeApp(payload);
    expect(r.success).toBe(false);
    expect(r.smsUri).toMatch(/^sms:/);
  });
});

describe('sendEmergencyAlert', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { href: '' } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('always returns a method + details (never throws)', async () => {
    const r = await sendEmergencyAlert(payload);
    expect(['native', 'gateway', 'manual']).toContain(r.method);
    expect(r.details.length).toBeGreaterThan(0);
  });
});

describe('getEmergencyContacts', () => {
  it('returns Gudalur-specific response channels by default', () => {
    const contacts = getEmergencyContacts();
    expect(contacts.length).toBeGreaterThanOrEqual(3);
    const roles = contacts.map((c) => c.role);
    expect(roles).toContain('forest_dept');
    expect(roles).toContain('police');
    expect(roles).toContain('panchayat');
  });
});