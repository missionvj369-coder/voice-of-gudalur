import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, Role, VerificationLevel } from '../types';
import { GUDALUR_LOCALITIES } from '../data/gudalurMasterData';
import { authApi } from '../services/api';
import type { AuthUser } from '../services/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  userCoords: { lat: number; lng: number } | null;
  acquireLiveLocation: () => Promise<{ lat: number; lng: number } | null>;
    registerResident: (data: {
    name: string;
    phone: string;
    localityId: string;
    customPlaceName?: string;
    email?: string;
    pincode: string;
    lat?: number;
    lng?: number;
  }) => Promise<UserProfile>;
  loginResident: (phone?: string, gudalurId?: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocality: (localityId: string, customPlaceName?: string, pincode?: string) => Promise<void>;
  /** Update an existing resident's details IN PLACE - same Gudalur ID, same ledger row, never a new creation. */
  updateResident: (fields: {
    name?: string; phone?: string; email?: string;
    localityId?: string; customPlaceName?: string; pincode?: string;
    lat?: number; lng?: number;
  }) => Promise<UserProfile>;
}

export const DUPLICATE_PHONE_ERROR = 'DUPLICATE_PHONE';

const PROFILE_KEY = 'VoiceOfGudalur_resident_profile';
const PLATFORM_ADMIN_EMAIL = 'vijaybalakrishnanshanmugam@gmail.com';

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  userCoords: null,
  acquireLiveLocation: async () => null,
    registerResident: async () => {
    throw new Error('Not implemented');
  },
  loginResident: async () => {
    throw new Error('Not implemented');
  },
  logout: async () => {},
  refreshProfile: async () => {},
  updateLocality: async () => {},
  updateResident: async () => {
    throw new Error('Not implemented');
  },
});

/** Normalize a phone number to 10 digits (drops an optional leading +91). */
function normalizePhone(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
}

/**
 * A Gudalur ID is REAL only when the official server issued it
 * (GD-YYYY-XXXXXX) and saved it in the residents (users) ledger. Anything else
 * (e.g. a locally invented "OFFLINE-*" card) is NOT a registered resident.
 */
export function isRealGudalurId(id?: string | null): boolean {
  return typeof id === 'string' && /^GD-\d{4}-[0-9A-F]{6}$/.test(id);
}

/** The locally-cached petition signature state (mirrors SignPetitionPage result). */
export interface LocalSignatureResult {
  hash: string;
  verifyUrl: string;
  batchNo: number;
  signedAt: string;
  name: string;
  gudalurId: string;
  locality: string;
}

/**
 * Read the locally-cached petition signature. A sign is REAL only when the
 * backend returned a server-side hash (VG-*). Stale synthetic entries
 * (LOCAL-* / local-only placeholders) are purged so nobody ever appears
 * "signed" without a verifiable ledger row.
 */
export function readLocalSignature(): { signed: boolean; result: LocalSignatureResult | null } {
  try {
    if (localStorage.getItem('vog_petition_signed') !== '1') return { signed: false, result: null };
    const raw = localStorage.getItem('vog_petition_result');
    if (!raw) return { signed: false, result: null };
    const result = JSON.parse(raw) as LocalSignatureResult;
    const hash = result?.hash;
    if (typeof hash !== 'string' || !hash.startsWith('VG-')) {
      // Stale synthetic sign — no real ledger entry behind it.
      localStorage.removeItem('vog_petition_signed');
      localStorage.removeItem('vog_petition_result');
      return { signed: false, result: null };
    }
    return { signed: true, result };
  } catch {
    return { signed: false, result: null };
  }
}

/** Purge locally-cached "signed" state that is not backed by a real server hash. */
function clearSyntheticLocalData(): void {
  try {
    const raw = localStorage.getItem('vog_petition_result');
    const hash = raw ? (JSON.parse(raw) as Record<string, unknown>)?.hash : null;
    if (typeof hash !== 'string' || !hash.startsWith('VG-')) {
      localStorage.removeItem('vog_petition_signed');
      localStorage.removeItem('vog_petition_result');
    }
  } catch {
    /* best-effort */
  }
}

/** Map a server resident/session payload (camelCase) to the app's UserProfile. */
function toUserProfile(r: any): UserProfile {
  return {
    uid: r.uid,
    name: r.name,
    phone: r.phone,
    email: r.email || undefined,
    localityId: r.localityId,
    localityName: r.localityName,
    customPlaceName: r.customPlaceName || undefined,
    pincode: r.pincode,
    gudalurId: r.gudalurId,
    role: (r.role as Role) || 'LOCAL_MEMBER',
    verificationLevel: (r.verificationLevel as VerificationLevel) || 'REGISTERED',
    isBloodDonor: r.isBloodDonor || false,
    bloodGroup: r.bloodGroup || undefined,
    avatarUrl: r.avatarUrl || undefined,
    bio: r.bio || undefined,
    lat: r.lat || undefined,
    lng: r.lng || undefined,
    createdAt: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(),
    updatedAt: r.updatedAt ? new Date(r.updatedAt).getTime() : Date.now(),
    issuesReported: r.issuesReported || 0,
    issuesSupported: r.issuesSupported || 0,
    representationsCreated: r.representationsCreated || 0,
    alertsAcknowledged: r.alertsAcknowledged || 0,
  };
}

/** Derive the AuthUser shape (set in state/cookies) from a full UserProfile. */
function toAuthUser(p: UserProfile): AuthUser {
  return {
    uid: p.uid,
    id: p.uid,
    phone: p.phone,
    gudalurId: p.gudalurId,
    name: p.name,
    role: p.role,
    kind: 'user',
    localityName: p.localityName,
    localityId: p.localityId,
    customPlaceName: p.customPlaceName,
    pincode: p.pincode,
    email: p.email,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved) as UserProfile;
      // A profile is shown only when the official server issued its Gudalur ID.
      return parsed && isRealGudalurId(parsed.gudalurId) ? parsed : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const readCachedProfile = (): UserProfile | null => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const persistProfile = (p: UserProfile | null) => {
    setProfile(p);
    if (p) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } else {
      localStorage.removeItem(PROFILE_KEY);
    }
  };

  const applyPlatformAdminOverride = (p: UserProfile): UserProfile =>
    p.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL
      ? { ...p, role: 'PLATFORM_ADMIN' as Role, verificationLevel: 'PLATFORM_ADMIN' as VerificationLevel }
      : p;

  const acquireLiveLocation = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(coords);
          resolve(coords);
        },
        (err) => {
          console.warn('Geolocation acquisition notice:', err.message);
          const fallback = { lat: 11.5034, lng: 76.4912 };
          setUserCoords(fallback);
          resolve(fallback);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });

    /** Restore a server session on boot (httpOnly cookies only). */
  useEffect(() => {
    void acquireLiveLocation();
    (async () => {
      try {
        const { user: u } = await authApi.me();
        if (u && u.kind === 'user') {
          setUser(u);
          const cached = readCachedProfile();
          if (cached && (cached.gudalurId === u.gudalurId || cached.phone === u.phone)) {
            persistProfile(applyPlatformAdminOverride(cached));
          }
        }
      } catch {
        // Server unreachable: only a card issued by the official server can be
        // shown. Synthetic local registrations (OFFLINE-* / res_*) are NOT real
        // residents — they are dropped so nobody signs under a fake identity.
        const cached = readCachedProfile();
        if (cached && isRealGudalurId(cached.gudalurId)) {
          setProfile(cached); // genuine resident card cached on this device
        } else {
          clearSyntheticLocalData();
          persistProfile(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const registerResident = async (data: {
    name: string;
    phone: string;
    localityId: string;
    customPlaceName?: string;
    email?: string;
    pincode: string;
    lat?: number;
    lng?: number;
    aadhaarVerified?: boolean;
    aadhaarLast4?: string;
    aadhaarRef?: string;
  }): Promise<UserProfile> => {
    const loc = GUDALUR_LOCALITIES.find((l) => l.id === data.localityId);
    const phone = normalizePhone(data.phone);
    if (phone.length !== 10) {
      throw new Error('A valid 10-digit mobile number is required');
    }

    const duplicateError = () => {
      const err = new Error('This phone number is already registered. Please login with your mobile number or Gudalur ID.') as Error & { code?: string };
      err.code = DUPLICATE_PHONE_ERROR;
      return err;
    };

    try {
      const res = await authApi.register({
        name: data.name.trim(),
        phone,
        localityId: data.localityId,
        customPlaceName: data.customPlaceName,
        pincode: data.pincode.trim() || loc?.pincode || '643212',
        email: data.email,
        lat: data.lat ?? userCoords?.lat ?? loc?.lat,
        lng: data.lng ?? userCoords?.lng ?? loc?.lng,
      });
      if (!res?.resident) throw new Error('Registration failed');
      const prof = applyPlatformAdminOverride(toUserProfile(res.resident));
      persistProfile(prof);
      setUser(toAuthUser(prof));
      return prof;
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (e?.status === 409 || /duplicate|already registered|unique key/i.test(msg)) {
        throw duplicateError();
      }
      // There is NO offline registration. A Gudalur ID is a real, verifiable
      // identity: only the server generates it (GD-YYYY-XXXXXX), saves it in
      // the residents (users) ledger and issues the session cookie. If the
      // server cannot be reached, fail loudly instead of inventing an
      // unverifiable "OFFLINE-*" card that officials could never confirm.
      if (e?.status === undefined || e?.status === 502 || /failed to fetch|networkerror|load failed|invalid server response/i.test(msg)) {
        const offlineErr = new Error(
          'No internet connection — Gudalur IDs are issued online only and saved in the residents ledger. Please connect to the internet and try again.',
        ) as Error & { code?: string };
        offlineErr.code = 'OFFLINE_REQUIRED';
        throw offlineErr;
      }
      throw e;
    }
  };

  const loginResident = async (phone?: string, gudalurId?: string): Promise<UserProfile> => {
    const p = normalizePhone(phone || '');
    const gid = (gudalurId || '').trim().toUpperCase();
    const hasPhone = p.length === 10;
    const hasId = gid.length > 0;
    if (!hasPhone && !hasId) {
      throw new Error('Enter your registered mobile number OR your Gudalur ID to continue');
    }

    try {
      const res = await authApi.lookup({ phone: hasPhone ? p : undefined, gudalurId: hasId ? gid : undefined });
      if (!res?.resident) {
        throw new Error('No resident found for these details. Check your mobile number / Gudalur ID, or register first.');
      }
      const prof = applyPlatformAdminOverride(toUserProfile(res.resident));
      persistProfile(prof);
      setUser(toAuthUser(prof));
      return prof;
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (e?.status === undefined || /failed to fetch|networkerror|load failed/i.test(msg)) {
        throw new Error('No internet connection — login verifies your identity online. Please connect and try again.');
      }
      if (e?.status === 500 || e?.status === 502) {
        throw new Error('Resident service unavailable. Please try again in a moment.');
      }
      throw new Error('No resident found for these details. Check your mobile number / Gudalur ID, or register first.');
    }
  };

  const updateLocality = async (localityId: string, customPlaceName?: string, pincode?: string) => {
    const loc = GUDALUR_LOCALITIES.find((l) => l.id === localityId);
    if (!profile) return;
    const locName = customPlaceName || loc?.name || profile.localityName;
    const updated: UserProfile = {
      ...profile,
      localityId,
      localityName: locName,
      customPlaceName,
      pincode: pincode || loc?.pincode || profile.pincode,
      updatedAt: Date.now(),
    };
    persistProfile(updated);
    try {
      await authApi.updateProfile({ localityId, customPlaceName, pincode: updated.pincode });
    } catch (e) {
      console.warn('Resident locality update error:', e);
    }
  };

  /**
   * Update an existing resident's details IN PLACE â€” same gudalur_id, same
   * ledger row. Called from the ID-card Edit screen. Never creates a new
   * registration.
   */
  const updateResident = async (fields: {
    name?: string; phone?: string; email?: string;
    localityId?: string; customPlaceName?: string; pincode?: string;
    lat?: number; lng?: number;
  }): Promise<UserProfile> => {
    if (!profile?.gudalurId) throw new Error('No registered resident to update');
    const loc = GUDALUR_LOCALITIES.find((l) => l.id === (fields.localityId ?? profile.localityId));
    const updated: UserProfile = {
      ...profile,
      name: fields.name?.trim() || profile.name,
      phone: fields.phone?.trim() || profile.phone,
      email: fields.email?.trim() ?? profile.email,
      localityId: fields.localityId ?? profile.localityId,
      localityName: fields.customPlaceName || loc?.name || profile.localityName,
      customPlaceName: fields.customPlaceName ?? profile.customPlaceName,
      pincode: fields.pincode?.trim() || loc?.pincode || profile.pincode,
      lat: fields.lat ?? profile.lat,
      lng: fields.lng ?? profile.lng,
      updatedAt: Date.now(),
    };
    persistProfile(updated);
    let cloudSaved = false;
    try {
      await authApi.updateProfile({
        name: updated.name,
        phone: updated.phone,
        email: updated.email ?? null,
        localityId: updated.localityId,
        customPlaceName: updated.customPlaceName ?? null,
        pincode: updated.pincode,
        lat: updated.lat ?? null,
        lng: updated.lng ?? null,
      });
      cloudSaved = true;
    } catch (e) {
      console.warn('Resident update exception:', e);
    }
    if (!cloudSaved) {
      throw new Error('Saved on this device â€” the official ledger could not be reached. Please try again.');
    }
    return updated;
  };

    const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setUser(null);
    persistProfile(null);
    // Clear ALL locally-stored data on logout. In Gudalur one phone is often
    // shared by several residents — the next registration/login must start
    // perfectly fresh (no leftover profile, petition or queue data).
    try {
      // Clear pending offline records
      localStorage.removeItem('og_pending_signatures');
      localStorage.removeItem('og_pending_emails');
      // Clear petition data (the next resident on this phone signs themselves)
      localStorage.removeItem('vog_petition_signed');
      localStorage.removeItem('vog_petition_result');
      // Clear cached public stats
      localStorage.removeItem('vog_stats_cache');
      // Session-scoped UI caches
      sessionStorage.removeItem('vog_intro_seen');
    } catch {
      /* best-effort */
    }
  };

  const refreshProfile = async () => {
    if (!profile) return;
    const cached = readCachedProfile();
    if (cached) setProfile(cached);
  };

return (
  <AuthContext.Provider
    value={{
      user,
      profile,
      loading,
      userCoords,
      acquireLiveLocation,
      registerResident,
      loginResident,
      logout,
      refreshProfile,
      updateLocality,
      updateResident,
    }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
