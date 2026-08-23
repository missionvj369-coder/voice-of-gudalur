import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { UserProfile, Role, VerificationLevel } from '../types';
import { GUDALUR_LOCALITIES } from '../data/gudalurMasterData';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  userCoords: { lat: number; lng: number } | null;
  acquireLiveLocation: () => Promise<{ lat: number; lng: number } | null>;
  loginWithGoogle: () => Promise<void>;
  registerResident: (data: {
    name: string;
    phone: string;
    localityId: string;
    customPlaceName?: string;
    pincode: string;
    lat?: number;
    lng?: number;
  }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocality: (localityId: string, customPlaceName?: string, pincode?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  userCoords: null,
  acquireLiveLocation: async () => null,
  loginWithGoogle: async () => {},
  registerResident: async () => { throw new Error('Not implemented'); },
  logout: async () => {},
  refreshProfile: async () => {},
  updateLocality: async () => {}
});

function generateGudalurId(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `GD-2026-${randomNum}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('onegudalur_resident_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Automatically attempt to acquire live GPS location for safety & proximity calculations
  const acquireLiveLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
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
          // Default to central Gudalur coordinate if GPS is pending permission
          const fallback = { lat: 11.5034, lng: 76.4912 };
          setUserCoords(fallback);
          resolve(fallback);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  };

  useEffect(() => {
    acquireLiveLocation();
  }, []);

  const fetchProfile = async (uid: string, email: string | null) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const profileData = docSnap.data() as UserProfile;
        if (email === 'vijaybalakrishnanshanmugam@gmail.com') {
          profileData.role = 'PLATFORM_ADMIN';
          profileData.verificationLevel = 'PLATFORM_ADMIN';
        }
        setProfile(profileData);
        localStorage.setItem('onegudalur_resident_profile', JSON.stringify(profileData));
      } else {
        const defaultLoc = GUDALUR_LOCALITIES[0];
        const newProfile: UserProfile = {
          uid,
          name: auth.currentUser?.displayName || 'Gudalur Citizen',
          phone: auth.currentUser?.phoneNumber || '',
          localityId: defaultLoc.id,
          localityName: defaultLoc.name,
          pincode: defaultLoc.pincode || '643212',
          gudalurId: generateGudalurId(),
          role: email === 'vijaybalakrishnanshanmugam@gmail.com' ? 'PLATFORM_ADMIN' : 'RESIDENT',
          verificationLevel: email === 'vijaybalakrishnanshanmugam@gmail.com' ? 'PLATFORM_ADMIN' : 'PHONE_VERIFIED',
          isBloodDonor: false,
          avatarUrl: auth.currentUser?.photoURL || undefined,
          lat: userCoords?.lat || defaultLoc.lat,
          lng: userCoords?.lng || defaultLoc.lng,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await setDoc(docRef, newProfile);
        setProfile(newProfile);
        localStorage.setItem('onegudalur_resident_profile', JSON.stringify(newProfile));
      }
    } catch (error) {
      console.warn('Firestore profile fetch error, using local state:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.uid, currentUser.email);
      } else {
        const local = localStorage.getItem('onegudalur_resident_profile');
        if (local) {
          try { setProfile(JSON.parse(local)); } catch (e) { setProfile(null); }
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        await fetchProfile(res.user.uid, res.user.email);
      }
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

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
    const locName = data.customPlaceName || loc?.name || 'Gudalur Taluk';
    const uid = user ? user.uid : `res_${Date.now()}`;

    const newProfile: UserProfile = {
      uid,
      name: data.name.trim(),
      phone: data.phone.trim(),
      localityId: data.localityId,
      localityName: locName,
      customPlaceName: data.customPlaceName?.trim(),
      pincode: data.pincode.trim() || loc?.pincode || '643212',
      gudalurId: profile?.gudalurId || generateGudalurId(),
      role: user?.email === 'vijaybalakrishnanshanmugam@gmail.com' ? 'PLATFORM_ADMIN' : 'LOCAL_MEMBER',
      verificationLevel: user ? 'PHONE_VERIFIED' : 'REGISTERED',
      isBloodDonor: false,
      lat: data.lat || userCoords?.lat || loc?.lat,
      lng: data.lng || userCoords?.lng || loc?.lng,
      createdAt: profile?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), newProfile, { merge: true });
      } catch (err) {
        console.warn('Could not save to Firestore, saving locally:', err);
      }
    }
    setProfile(newProfile);
    localStorage.setItem('onegudalur_resident_profile', JSON.stringify(newProfile));
    return newProfile;
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
      updatedAt: Date.now()
    };
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), updated, { merge: true });
      } catch (e) {
        console.warn('Firestore locality update error:', e);
      }
    }
    setProfile(updated);
    localStorage.setItem('onegudalur_resident_profile', JSON.stringify(updated));
  };

  const logout = async () => {
    await auth.signOut();
    setUser(null);
    setProfile(null);
    localStorage.removeItem('onegudalur_resident_profile');
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid, user.email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        userCoords,
        acquireLiveLocation,
        loginWithGoogle,
        registerResident,
        logout,
        refreshProfile,
        updateLocality
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
