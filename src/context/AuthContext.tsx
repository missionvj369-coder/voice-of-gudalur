import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { UserProfile, Role, VerificationLevel } from '../types';
import { GUDALUR_LOCALITIES } from '../data/gudalurMasterData';
import { supabase, db, generateGudalurId, normalizePhone, isSupabaseConfigured } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  userCoords: { lat: number; lng: number } | null;
  acquireLiveLocation: () => Promise<{ lat: number; lng: number } | null>;
  /** Register with phone number only (no password). Generates & saves a unique Gudalur ID. */
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
  /** Login with EITHER mobile number OR Gudalur ID number (no password — either identifier alone works). */
  loginResident: (phone?: string, gudalurId?: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocality: (localityId: string, customPlaceName?: string, pincode?: string) => Promise<void>;
  /** Update an existing resident's details IN PLACE — same Gudalur ID, same ledger row, never a new creation. */
  updateResident: (fields: {
    name?: string; phone?: string; email?: string;
    localityId?: string; customPlaceName?: string; pincode?: string;
    lat?: number; lng?: number;
  }) => Promise<UserProfile>;
}

export const DUPLICATE_PHONE_ERROR = 'DUPLICATE_PHONE';

const PROFILE_KEY = 'VoiceOfGudalur_resident_profile';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      return saved ? JSON.parse(saved) : null;
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

  const rowToProfile = (data: any): UserProfile => ({
    uid: data.uid,
    name: data.name,
    phone: data.phone,
    email: data.email || undefined,
    localityId: data.locality_id,
    localityName: data.locality_name,
    customPlaceName: data.custom_place_name || undefined,
    pincode: data.pincode,
    gudalurId: data.gudalur_id,
    role: (data.role as Role) || 'LOCAL_MEMBER',
    verificationLevel: (data.verification_level as VerificationLevel) || 'REGISTERED',
    isBloodDonor: data.is_blood_donor,
    bloodGroup: data.blood_group || undefined,
    avatarUrl: data.avatar_url || undefined,
    bio: data.bio || undefined,
    lat: data.lat || undefined,
    lng: data.lng || undefined,
    createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
    updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : Date.now(),
    issuesReported: data.issues_reported || 0,
    issuesSupported: data.issues_supported || 0,
    representationsCreated: data.representations_created || 0,
    alertsAcknowledged: data.alerts_acknowledged || 0,
  });

  const rowToUpsertPayload = (p: UserProfile) => ({
    uid: p.uid,
    name: p.name,
    phone: p.phone,
    email: p.email || null,
    locality_id: p.localityId,
    locality_name: p.localityName,
    custom_place_name: p.customPlaceName || null,
    pincode: p.pincode,
    gudalur_id: p.gudalurId,
    role: p.role,
    verification_level: p.verificationLevel,
    is_blood_donor: p.isBloodDonor,
    blood_group: p.bloodGroup || null,
    avatar_url: p.avatarUrl || null,
    bio: p.bio || null,
    lat: p.lat || null,
    lng: p.lng || null,
    issues_reported: p.issuesReported,
    issues_supported: p.issuesSupported,
    representations_created: p.representationsCreated,
    alerts_acknowledged: p.alertsAcknowledged,
  });

  const applyPlatformAdminOverride = (p: UserProfile): UserProfile => {
    // Preserve elevated role for the platform owner account
    if ((user as any)?.email === 'vijaybalakrishnanshanmugam@gmail.com') {
      return { ...p, role: 'PLATFORM_ADMIN', verificationLevel: 'PLATFORM_ADMIN' };
    }
    return p;
  };

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

  useEffect(() => {
    acquireLiveLocation();

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          try {
            const { data } = await db.getUserProfile(session.user.id);
            if (data) {
              persistProfile(applyPlatformAdminOverride(rowToProfile(data)));
            }
          } catch {
            /* keep cached profile */
          }
        } else {
          setUser(null);
          // Keep the cached resident card so registered residents stay logged in locally
          const cached = readCachedProfile();
          if (cached) setProfile(cached);
        }
        setLoading(false);
      });

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) setLoading(false);
      }).catch(() => setLoading(false));

      // Never block the app on auth boot — phone auth works without Supabase sessions
      const bootTimer = setTimeout(() => setLoading(false), 2500);
      return () => {
        clearTimeout(bootTimer);
        subscription.unsubscribe();
      };
    } catch (err) {
      console.warn('Auth initialization fallback:', err);
      setLoading(false);
    }
  }, []);

  /**
   * PHONE-ONLY REGISTRATION (no password).
   * Generates a unique Gudalur ID (GD-YYYY-NNNNNN), verifies uniqueness against the Supabase
   * ledger, saves the resident record in the cloud, and caches it locally for offline login.
   */
  const registerResident = async (data: {
    name: string;
    phone: string;
    localityId: string;
    customPlaceName?: string;
    email?: string;
    pincode: string;
    lat?: number;
    lng?: number;
  }): Promise<UserProfile> => {
    const loc = GUDALUR_LOCALITIES.find((l) => l.id === data.localityId);
    const locName = data.customPlaceName?.trim() || loc?.name || 'Gudalur Taluk';
    const phone = normalizePhone(data.phone);

    if (phone.length !== 10) {
      throw new Error('A valid 10-digit mobile number is required');
    }

    const uid = user?.id || `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const buildProfile = (gudalurId: string): UserProfile => ({
      uid,
      name: data.name.trim(),
      phone,
      localityId: data.localityId,
      localityName: locName,
      customPlaceName: data.customPlaceName?.trim() || undefined,
      pincode: data.pincode.trim() || loc?.pincode || '643212',
      email: data.email?.trim() || undefined,
      gudalurId,
      role: (user as any)?.email === 'vijaybalakrishnanshanmugam@gmail.com' ? 'PLATFORM_ADMIN' : 'LOCAL_MEMBER',
      verificationLevel: 'PHONE_VERIFIED',
      isBloodDonor: profile?.isBloodDonor || false,
      bloodGroup: profile?.bloodGroup,
      avatarUrl: profile?.avatarUrl,
      bio: profile?.bio,
      lat: data.lat || userCoords?.lat || loc?.lat,
      lng: data.lng || userCoords?.lng || loc?.lng,
      createdAt: profile?.createdAt || Date.now(),
      updatedAt: Date.now(),
      issuesReported: profile?.issuesReported || 0,
      issuesSupported: profile?.issuesSupported || 0,
      representationsCreated: profile?.representationsCreated || 0,
      alertsAcknowledged: profile?.alertsAcknowledged || 0,
    });

    const duplicateError = () => {
      const err = new Error('This phone number is already registered. Please login with your mobile number or Gudalur ID.') as Error & { code?: string };
      err.code = DUPLICATE_PHONE_ERROR;
      return err;
    };

    if (isSupabaseConfigured()) {
      // 1. Prevent duplicate registrations on the same phone number
      const { data: existing } = await db.getResidentByPhone(phone);
      if (existing && existing.gudalur_id) {
        throw duplicateError();
      }

      // 2. Issue the NEXT sequential Gudalur ID (GDR000001, GDR000002, …) —
      //    verified unique in the cloud ledger. When the 6-digit range is
      //    exhausted, it continues at 7 digits (GDR0000000, GDR0000001, …).
      const gudalurId = profile?.gudalurId || (await db.nextGudalurId());

      // 3. Save the resident record (create-only so conflicts surface clearly)
      const newProfile = buildProfile(gudalurId);
      const { error } = await db.insertResident(rowToUpsertPayload(newProfile));
      if (error) {
        const msg = (error as any)?.message || '';
        if (/users_phone_key|users_gudalur_id_key|duplicate key/i.test(msg)) {
          throw duplicateError();
        }
        console.warn('Could not save to Supabase, saving locally:', error);
        // NEVER fail silently — the resident must know this ID is not yet in the public ledger
        // and that Phone + Gudalur ID login will not work on other devices until cloud save succeeds.
        const saveMsg = (error as any)?.message || '';
        if (/row-level security|42501|permission denied/i.test(saveMsg)) {
          // Ledger access policies are not enabled yet — tell the owner the exact fix.
          toast.error('Saved on this device — the official ledger needs its registration policies enabled (owner: run supabase/FIX_RESIDENT_ACCESS.sql once in the Supabase SQL Editor).', { duration: 8000 });
        } else {
          toast.error('Cloud ledger unreachable — your ID is saved on this device only. Please try registering again later.', { duration: 6000 });
        }
        persistProfile(newProfile);
        return newProfile;
      }
      persistProfile(applyPlatformAdminOverride(newProfile));
      return newProfile;
    }

    // Offline / unconfigured fallback: still issue a local unique ID and cache the card
    const fallbackProfile = buildProfile(profile?.gudalurId || generateGudalurId());
    persistProfile(fallbackProfile);
    return fallbackProfile;
  };

  /**
   * LOGIN with EITHER the mobile number OR the Gudalur ID number (no password).
   * When both are provided they must match the same resident; either one alone
   * is enough to sign in. Falls back to the locally cached card when offline.
   */
  const loginResident = async (phone?: string, gudalurId?: string): Promise<UserProfile> => {
    const p = normalizePhone(phone || '');
    const gid = (gudalurId || '').trim().toUpperCase();
    const hasPhone = p.length === 10;
    const hasId = gid.length > 0;
    if (!hasPhone && !hasId) {
      throw new Error('Enter your registered mobile number OR your Gudalur ID to continue');
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await db.findResidentByLogin(hasPhone ? p : '', hasId ? gid : '');
      if (error) {
        console.warn('Login lookup error, trying local cache:', error);
      }
      if (data) {
        const resident = applyPlatformAdminOverride(rowToProfile(data));
        persistProfile(resident);
        return resident;
      }
      // Not found in cloud — allow matching the offline cache before failing
      const cached = readCachedProfile();
      const phoneMatch = hasPhone && cached?.phone === p;
      const idMatch = hasId && cached?.gudalurId?.toUpperCase() === gid;
      if (cached && (phoneMatch || idMatch)) {
        persistProfile(cached);
        return cached;
      }
      throw new Error('No resident found for these details. Check your mobile number / Gudalur ID, or register first.');
    }

    // Offline fallback against the locally cached resident card
    const cached = readCachedProfile();
    const phoneMatch = hasPhone && cached?.phone === p;
    const idMatch = hasId && cached?.gudalurId?.toUpperCase() === gid;
    if (cached && (phoneMatch || idMatch)) {
      persistProfile(cached);
      return cached;
    }
    throw new Error('Offline: no matching resident card cached on this device');
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

    if (isSupabaseConfigured()) {
      try {
        await db.upsertUserProfile(rowToUpsertPayload(updated));
      } catch (e) {
        console.warn('Supabase locality update error:', e);
      }
    }

    persistProfile(updated);
  };

  /**
   * Update an existing resident's details IN PLACE — same gudalur_id, same ledger row.
   * Called from the ID-card Edit screen. Never creates a new registration.
   */
  const updateResident = async (fields: {
    name?: string; phone?: string; email?: string;
    localityId?: string; customPlaceName?: string; pincode?: string;
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
      updatedAt: Date.now(),
    };

    let cloudSaved = false;
    if (isSupabaseConfigured()) {
      try {
        const { error } = await db.updateResidentProfile(profile.gudalurId, {
          name: updated.name,
          phone: updated.phone,
          email: updated.email || null,
          locality_id: updated.localityId,
          locality_name: updated.localityName,
          custom_place_name: updated.customPlaceName || null,
          pincode: updated.pincode,
        });
        cloudSaved = !error;
        if (error) console.warn('Supabase resident update error:', error);
      } catch (e) {
        console.warn('Supabase resident update exception:', e);
      }
    }
    persistProfile(updated);
    if (!cloudSaved && isSupabaseConfigured()) {
      throw new Error('Saved on this device — the official ledger could not be reached. Please try again.');
    }
    return updated;
  };

    const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setUser(null);
    persistProfile(null);
    // Clear all locally-pending records on logout so the next user starts fresh
    try {
      localStorage.removeItem('og_pending_signatures');
      localStorage.removeItem('og_pending_emails');
    } catch {
      /* best-effort */
    }
  };

  const refreshProfile = async () => {
    if (!profile) return;
    if (isSupabaseConfigured()) {
      try {
        const { data } = await db.getResidentByPhone(profile.phone);
        if (data) {
          persistProfile(applyPlatformAdminOverride(rowToProfile(data)));
          return;
        }
      } catch {
        /* keep cached */
      }
    }
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