import React, { useCallback, useEffect } from "react";

const STORAGE_KEY = "vog_location_granted";
const COORDS_KEY = "vog_location_coords";

interface LocationGateProps {
  children: React.ReactNode;
  onLocation?: (pos: { lat: number; lng: number }) => void;
}

export interface StoredCoords {
  lat: number;
  lng: number;
}

export function getStoredCoords(): StoredCoords | null {
  try {
    const raw = sessionStorage.getItem(COORDS_KEY);
    return raw ? (JSON.parse(raw) as StoredCoords) : null;
  } catch {
    return null;
  }
}

export const LocationGate: React.FC<LocationGateProps> = ({
  children,
  onLocation,
}) => {
  const [status, setStatus] = React.useState<
    "loading" | "granted" | "denied"
  >(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "true"
        ? "granted"
        : "loading";
    } catch {
      return "loading";
    }
  });
  const [errorMsg, setErrorMsg] = React.useState("");

  const requestLocation = useCallback(() => {
    setStatus("loading");
    setErrorMsg("");
    if (!navigator.geolocation) {
      setErrorMsg("This browser does not support geolocation. Please use Chrome, Edge or Safari.");
      setStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try {
          sessionStorage.setItem(STORAGE_KEY, "true");
          sessionStorage.setItem(COORDS_KEY, JSON.stringify(coords));
        } catch {
          /* storage full/blocked — proceed */
        }
        onLocation?.(coords);
        setStatus("granted");
      },
      (err) => {
        setErrorMsg(
          err.code === err.PERMISSION_DENIED
            ? "Location access was denied by the browser."
            : err.message || "Unable to determine your location."
        );
        setStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  }, [onLocation]);

  useEffect(() => {
    let granted = false;
    try {
      granted = sessionStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      granted = false;
    }
    if (!granted) {
      requestLocation();
    }
  }, [requestLocation]);

  if (status === "loading") {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center text-white px-6">
          <div className="h-12 w-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
          <p className="text-base font-bold">Requesting precise location…</p>
          <p className="text-xs text-slate-400 mt-2">
            Voice of Gudalur needs your location for wildlife alerts &amp; petition verification.
          </p>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-red-50 via-orange-50 to-amber-50 flex items-center justify-center p-6 overflow-y-auto">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-red-100 p-8 my-8">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-4xl mb-5">
            📍
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">
            Location is Mandatory
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            <strong>Voice of Gudalur</strong> requires your precise location to show
            real-time wildlife corridor alerts near you, display verified community
            voice petitions on the live conflict map, and accurately verify regional
            signature dockets.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 mb-6">
            <span className="font-bold block mb-1">⛔ Access blocked</span>
            {errorMsg}
          </div>
          <button
            onClick={requestLocation}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-sm shadow-lg hover:from-amber-500 hover:to-orange-500 transition"
          >
            🔄 Allow Access &amp; Unlock the App
          </button>
          <p className="text-[11px] text-slate-400 text-center mt-4 leading-relaxed">
            If the browser blocked permission: tap the <strong>lock 🔒 icon</strong> in
            the address bar → <strong>Site settings</strong> → <strong>Location → Allow</strong>,
            then press the button above.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};