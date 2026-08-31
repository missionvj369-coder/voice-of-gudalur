/**
 * LocationGate.tsx
 * Mandatory geolocation requirement for Voice of Gudalur.
 */
import React, { useEffect, useState } from 'react';
import { MapPin, ShieldCheck, BarChart, Map, Lock } from 'lucide-react';
import { motion } from 'motion/react';

const LOCATION_GRANTED_KEY = 'vog_location_granted';

export interface LocationGateProps {
  children: React.ReactNode;
}

export const LocationGate: React.FC<LocationGateProps> = ({ children }) => {
  const [granted, setGranted] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(LOCATION_GRANTED_KEY) === 'true') {
        setGranted(true);
        setChecking(false);
        return;
      }
    } catch {}

    if (!navigator.geolocation) {
      setChecking(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setGranted(true);
        try { sessionStorage.setItem(LOCATION_GRANTED_KEY, 'true'); } catch {}
        setChecking(false);
      },
      () => { setChecking(false); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  }, []);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      () => {
        setGranted(true);
        try { sessionStorage.setItem(LOCATION_GRANTED_KEY, 'true'); } catch {}
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  const handleReset = () => {
    try { sessionStorage.removeItem(LOCATION_GRANTED_KEY); } catch {}
    setGranted(false);
    setTimeout(handleRequestLocation, 100);
  };

  if (checking) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-300">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
          <span className="text-xs">Requesting precise location…</span>
        </div>
      </div>
    );
  }

  if (!granted && navigator.geolocation) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[200] bg-gradient-to-b from-[#0a0e0c] via-[#0f172a] to-[#0a0e0c] flex items-center justify-center p-6"
      >
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="flex justify-center">
            <MapPin className="h-14 w-14 text-amber-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-serif font-black text-white leading-tight">
            Location Access Required
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Voice of Gudalur requires your precise location to show real-time wildlife
            corridor alerts, display community voice petitions on the live conflict map,
            and accurately verify regional signature dockets.
          </p>
          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              <span className="text-[10px] text-slate-400">Civic integrity</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <BarChart className="h-6 w-6 text-amber-400" />
              <span className="text-[10px] text-slate-400">Real-time alerts</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Map className="h-6 w-6 text-blue-400" />
              <span className="text-[10px] text-slate-400">Verified dockets</span>
            </div>
          </div>
          <button
            onClick={handleRequestLocation}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-sm shadow-2xl transition transform hover:scale-[1.02]"
          >
            Enable Location Access
          </button>
          <button
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-400 underline underline-offset-2"
          >
            Location blocked? Try again
          </button>
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" />
            Your location is never stored or shared — it powers alerts local to you.
          </p>
        </div>
      </motion.div>
    );
  }

  return <>{children}</>;
};