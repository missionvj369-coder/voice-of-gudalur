/**
 * Voice of Gudalur - Session & authentication service.
 *
 * Replaces Supabase Auth. Residents authenticate passwordless via Aadhaar
 * QR-scan (on-device, privacy-first): the scan IS the proof, so registration
 * and login establish a server session immediately - no OTP step.
 *
 * Officials authenticate via email + password. A govt official requests
 * access by email; the master admin approves from the backend. Once approved
 * the official sets a password and signs in - no OTP step.
 */
import crypto from 'crypto';
import { db } from '../db/client';
import { logger } from '../utils/logger';

export async function createSession(user, userAgent?, ip?) {
  const mod = await import('../middleware/auth');
  return mod.createSession(user, userAgent, ip);
}

function generateGudalurId() {
  const year = new Date().getFullYear();
  const seq = crypto.randomInt(0, 1000000).toString(16).padStart(6, '0').toUpperCase();
  return `GD-${year}-${seq}`;
}

async function allocateGudalurId() {
  for (let i = 0; i < 5; i++) {
    const id = generateGudalurId();
    const taken = await db.queryOne('SELECT uid FROM users WHERE gudalur_id = $1', [id]);
    if (!taken) return id;
  }
  throw new Error('Failed to allocate a unique Gudalur ID');
}

function rowToResident(row) {
  return {
    uid: row.uid, phone: row.phone, gudalurId: row.gudalur_id, name: row.name,
    email: row.email ?? undefined, localityId: row.locality_id ?? undefined,
    localityName: row.locality_name ?? undefined,
    customPlaceName: row.custom_place_name ?? undefined,
    pincode: row.pincode ?? undefined, role: row.role,
    verificationLevel: row.verification_level,
    isBloodDonor: row.is_blood_donor ?? false, bloodGroup: row.blood_group ?? undefined,
    avatarUrl: row.avatar_url ?? undefined, bio: row.bio ?? undefined,
    lat: row.lat ?? undefined, lng: row.lng ?? undefined,
    aadhaarVerified: row.aadhaar_verified ?? false,
    aadhaarLast4: row.aadhaar_last4 ?? undefined,
    aadhaarRef: row.aadhaar_ref ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

async function findUserByPhone(phone) {
  return db.queryOne(
    `SELECT uid, phone, gudalur_id, name, email, locality_id, locality_name,
            custom_place_name, pincode, role, verification_level, aadhaar_verified,
            aadhaar_last4, aadhaar_ref, lat, lng, created_at, updated_at,
            is_blood_donor, blood_group, avatar_url, bio
       FROM users WHERE phone = $1`,
    [phone],
  );
}

async function findUserByGudalurId(gudalurId) {
  return db.queryOne(
    `SELECT uid, phone, gudalur_id, name, email, locality_id, locality_name,
            custom_place_name, pincode, role, verification_level, aadhaar_verified,
            aadhaar_last4, aadhaar_ref, lat, lng, created_at, updated_at,
            is_blood_donor, blood_group, avatar_url, bio
       FROM users WHERE gudalur_id = $1`,
    [gudalurId],
  );
}

export interface ResidentProfile {
  uid: string; phone: string; gudalurId: string; name: string; email?: string;
  localityId?: string; localityName?: string; customPlaceName?: string;
  pincode?: string; role: string; verificationLevel: string;
  isBloodDonor?: boolean; bloodGroup?: string;
  avatarUrl?: string; bio?: string; lat?: number; lng?: number;
  aadhaarVerified?: boolean; aadhaarLast4?: string; aadhaarRef?: string;
  createdAt: number; updatedAt: number;
}

export interface RegisterInput {
  name: string; phone: string; localityId: string; customPlaceName?: string;
  pincode: string; email?: string; aadhaarVerified?: boolean;
  aadhaarLast4?: string; aadhaarRef?: string; lat?: number; lng?: number;
}

export async function registerResident(input) {
  const phone = normalizePhone(input.phone);
  if (phone.length !== 10) throw new Error('A valid 10-digit mobile number is required');

  const uid = crypto.randomUUID();
  const gudalurId = await allocateGudalurId();
  const localityName = (await db.queryOne('SELECT name FROM locality WHERE id = $1', [input.localityId]))?.name ?? 'Gudalur Taluk';

  await db.withTransaction(async (tx) => {
    await tx.query(
      `INSERT INTO users (uid, phone, gudalur_id, name, email, locality_id, locality_name,
         custom_place_name, pincode, role, verification_level, is_blood_donor,
         blood_group, lat, lng, aadhaar_verified, aadhaar_last4, aadhaar_ref)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'LOCAL_MEMBER',
               CASE WHEN $14 THEN 'AADHAAR_VERIFIED' ELSE 'UNVERIFIED' END,
               $10,$11,$12,$13,$14,$15)`,
      [uid, phone, gudalurId, input.name.trim(), input.email?.trim(),
       input.localityId, localityName, input.customPlaceName?.trim() || undefined,
       input.pincode, false, undefined, input.lat, input.lng,
       input.aadhaarVerified || false, input.aadhaarLast4, input.aadhaarRef],
    );
  });

  const sessionUser = { uid, phone, gudalurId, name: input.name.trim(), role: 'LOCAL_MEMBER', kind: 'user', localityName };
  const session = await createSession(sessionUser);

  return {
    resident: {
      uid, phone, gudalurId, name: input.name.trim(), email: input.email, localityId: input.localityId,
      localityName, customPlaceName: input.customPlaceName, pincode: input.pincode, role: 'LOCAL_MEMBER',
      verificationLevel: input.aadhaarVerified ? 'AADHAAR_VERIFIED' : 'UNVERIFIED',
      aadhaarVerified: input.aadhaarVerified, aadhaarLast4: input.aadhaarLast4, aadhaarRef: input.aadhaarRef,
      lat: input.lat, lng: input.lng, createdAt: Date.now(), updatedAt: Date.now(),
    },
    session,
  };
}

export async function loginResident(phone, gudalurId) {
  let row;
  if (phone && phone.trim()) row = await findUserByPhone(normalizePhone(phone));
  if (!row && gudalurId && gudalurId.trim()) row = await findUserByGudalurId(gudalurId.trim().toUpperCase());
  if (!row) return null;

  const sessionUser = { uid: row.uid, phone: row.phone, gudalurId: row.gudalur_id, name: row.name, role: row.role, kind: 'user', localityName: row.locality_name ?? undefined };
  const session = await createSession(sessionUser);
  return { resident: rowToResident(row), session };
}

export function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
}
