import React, { useCallback, useEffect, useRef, useState } from "react";

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

type PermState = "granted" | "prompt" | "denied" | "unsupported";

export const LocationGate: React.FC<LocationGateProps> = ({
  children,
  onLocation,
}) => {
  const [status, setStatus] = useState<"loading" | "granted" | "denied">(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "true"
        ? "granted"
        : "loading";
    } catch {
      return "loading";
    }
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [permState, setPermState] = useState<PermState>("prompt");
  const [attempted, setAttempted] = useState(false);
  const requestToken = useRef(0);

  const requestLocation = useCallback(() => {
    setStatus("loading");
    setErrorMsg("");
    if (!navigator.geolocation) {
      setErrorMsg("This browser does not support geolocation. Please use Chrome, Edge or Safari.");
      setPermState("unsupported");
      setStatus("denied");
      return;
    }
    const token = ++requestToken.current;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (token !== requestToken.current) return; // stale response — ignore
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
        if (token !== requestToken.current) return; // stale response — ignore
        setErrorMsg(
          err.code === err.PERMISSION_DENIED
            ? "Location access was denied by the browser."
            : err.code === err.TIMEOUT
              ? "Timed out while locating you — move to an open area and retry."
              : err.message || "Unable to determine your location."
        );
        if (err.code === err.PERMISSION_DENIED) setPermState("denied");
        setStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [onLocation]);

  // Mirror the browser permission state. When the user re-enables Location in
  // site settings, the PermissionStatus 'change' event fires and the app
  // unlocks itself — the button above only has to re-run getCurrentPosition
  // for browsers that show the prompt again (state === 'prompt').
  useEffect(() => {
    let cancelled = false;
    if (!navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((ps) => {
        if (cancelled) return;
        setPermState(ps.state as PermState);
        ps.onchange = () => {
          setPermState(ps.state as PermState);
          if (ps.state === "granted") {
            requestLocation(); // auto-unlock the instant permission returns
          }
        };
      })
      .catch(() => {
        /* Permissions API unavailable — retry button still works */
      });
    return () => {
      cancelled = true;
    };
  }, [requestLocation]);

  useEffect(() => {
    let granted = false;
    try {
      granted = sessionStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      granted = false;
    }
    if (!granted) {
      setAttempted(true);
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
    const blocked = permState === "denied" && attempted;
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-red-50 via-orange-50 to-amber-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-red-100 p-6 sm:p-8 my-8">
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
          <div
            className={`rounded-xl p-4 text-xs mb-6 border ${
              blocked
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <span className="font-bold block mb-1">
              {blocked ? "🔒 Location is blocked in browser settings" : "⛔ Access blocked"}
            </span>
            {errorMsg}
            {blocked && (
              <span className="block mt-2 font-medium">
                The browser will not ask again until you allow it in site settings —
                follow the steps below. The app unlocks automatically the moment
                location is allowed.
              </span>
            )}
          </div>
          <button
            onClick={requestLocation}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-sm shadow-lg hover:from-amber-500 hover:to-orange-500 active:scale-[0.99] transition"
          >
            🔄 Allow Access &amp; Unlock the App
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full mt-2.5 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 active:scale-[0.99] transition"
          >
            ↩ Back — Restart App
          </button>
          <details className="mt-5" open={blocked}>
            <summary className="text-xs font-bold text-slate-500 cursor-pointer select-none hover:text-slate-700">
              Blocked for good? Enable location in site settings →
            </summary>
            <ol className="mt-2 space-y-1.5 text-[11px] text-slate-500 leading-relaxed list-decimal list-inside">
              <li>
                Tap the <strong>🔒 lock</strong> / <strong>ⓘ</strong> icon at the left of the
                address bar (Android Chrome: <strong>⋮</strong> menu → Site settings).
              </li>
              <li>
                Open <strong>Permissions</strong> → <strong>Location</strong> and choose{" "}
                <strong>Allow</strong>.
              </li>
              <li>
                Come back here — the app unlocks by itself. If it does not, press{" "}
                <strong>“Allow Access &amp; Unlock the App”</strong>.
              </li>
            </ol>
          </details>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};