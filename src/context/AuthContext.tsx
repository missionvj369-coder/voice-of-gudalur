import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { UserProfile, Role, VerificationLevel } from '../types';
import { GUDALUR_LOCALITIES } from '../data/gudalurMasterData';
import { supabase, db, generateGudalurId, normalizePhone, isSupabaseConfigured } from '../lib/supabase';

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
    pincode: string;
    lat?: number;
    lng?: number;
  }) => Promise<UserProfile>;
  /** Login with phone number + Gudalur ID number (no password). */
  loginResident: (phone: string, gudalurId: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocality: (localityId: string, customPlaceName?: string, pincode?: string) => Promise<void>;
}

export const DUPLICATE_PHONE_ERROR = 'DUPLICATE_PHONE';

const PROFILE_KEY = 'onegudalur_resident_profile';

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
      const err = new Error('This phone number is already registered. Please login with your Phone + Gudalur ID.') as Error & { code?: string };
      err.code = DUPLICATE_PHONE_ERROR;
      return err;
    };

    if (isSupabaseConfigured()) {
      // 1. Prevent duplicate registrations on the same phone number
      const { data: existing } = await db.getResidentByPhone(phone);
      if (existing && existing.gudalur_id) {
        throw duplicateError();
      }

      // 2. Generate a Gudalur ID guaranteed unique in the cloud ledger
      let gudalurId = profile?.gudalurId || generateGudalurId();
      for (let attempt = 0; attempt < 6; attempt++) {
        const { taken } = await db.isGudalurIdTaken(gudalurId);
        if (!taken) break;
        gudalurId = generateGudalurId();
      }

      // 3. Save the resident record (create-only so conflicts surface clearly)
      const newProfile = buildProfile(gudalurId);
      const { error } = await db.insertResident(rowToUpsertPayload(newProfile));
      if (error) {
        const msg = (error as any)?.message || '';
        if (/users_phone_key|users_gudalur_id_key|duplicate key/i.test(msg)) {
          throw duplicateError();
        }
        console.warn('Could not save to Supabase, saving locally:', error);
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

  /** LOGIN with phone number + Gudalur ID number (no password). */
  const loginResident = async (phone: string, gudalurId: string): Promise<UserProfile> => {
    const p = normalizePhone(phone);
    const gid = (gudalurId || '').trim().toUpperCase();
    if (p.length !== 10 || !gid) {
      throw new Error('Enter your 10-digit phone number and your Gudalur ID');
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await db.findResidentByLogin(p, gid);
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
      if (cached && cached.phone === p && cached.gudalurId.toUpperCase() === gid) {
        persistProfile(cached);
        return cached;
      }
      throw new Error('No resident found for this Phone + Gudalur ID combination');
    }

    // Offline fallback against the locally cached resident card
    const cached = readCachedProfile();
    if (cached && cached.phone === p && cached.gudalurId.toUpperCase() === gid) {
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

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setUser(null);
    persistProfile(null);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);