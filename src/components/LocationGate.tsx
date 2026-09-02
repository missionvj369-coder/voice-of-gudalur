import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { MapPin, RefreshCw, ShieldAlert, X } from "lucide-react";

/**
 * LocationGate — soft permission gate.
 *
 * The app ALWAYS renders (no dead-end full-screen block): when location is
 * missing, a compact banner below the header invites the user to enable it.
 *  - "prompt"  → banner with "Allow Location" (fires the native prompt)
 *  - "denied"  → banner explains the browser won't re-prompt, shows
 *                site-settings steps + "Check Again" (re-queries permission;
 *                auto-unlocks the instant it flips)
 *  - "granted" → no banner, app fully live
 * Every button press produces visible feedback.
 */

const STORAGE_KEY = "vog_location_granted";
const COORDS_KEY = "vog_location_coords";
const DISMISS_KEY = "vog_location_banner_dismissed";

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

interface LocationGateCtx {
  permission: PermState;
  coords: StoredCoords | null;
  /** Ask the browser for location (fires the native prompt when allowed). */
  request: () => void;
  /** Re-query the permission after the user flips a site setting. */
  recheck: () => void;
}

const LocationGateContext = createContext<LocationGateCtx | null>(null);

/** Consume gate state from any page (e.g. to gate map/report features inline). */
export function useLocationGate(): LocationGateCtx {
  const ctx = useContext(LocationGateContext);
  if (!ctx) throw new Error("useLocationGate must be used inside <LocationGate>");
  return ctx;
}

interface LocationGateProps {
  children: React.ReactNode;
  onLocation?: (pos: StoredCoords) => void;
}

export const LocationGate: React.FC<LocationGateProps> = ({ children, onLocation }) => {
  const [permission, setPermission] = useState<PermState>("prompt");
  const [coords, setCoords] = useState<StoredCoords | null>(() => getStoredCoords());
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const autoTried = useRef(false);
  const token = useRef(0);
  const noticeTimer = useRef<number | null>(null);

  const flashNotice = useCallback((msg: string, ms = 5000) => {
    setNotice(msg);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), ms);
  }, []);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setPermission("unsupported");
      flashNotice("Geolocation is not supported here — please use Chrome, Edge or Safari.", 8000);
      return;
    }
    setBusy(true);
    setNotice("");
    const my = ++token.current;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (my !== token.current) return; // stale response — ignore
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try {
          sessionStorage.setItem(STORAGE_KEY, "true");
          sessionStorage.setItem(COORDS_KEY, JSON.stringify(c));
          sessionStorage.removeItem(DISMISS_KEY);
        } catch {
          /* storage blocked — proceed */
        }
        setCoords(c);
        setPermission("granted");
        setBusy(false);
        flashNotice("✅ Location enabled — live wildlife alerts are active for your area.");
        onLocation?.(c);
      },
      (err) => {
        if (my !== token.current) return; // stale response — ignore
        setBusy(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermission("denied");
          setShowHelp(true);
          flashNotice(
            "The browser blocked location, so it will not show the prompt again. Use “How to enable” below — the app unlocks automatically once allowed.",
            12000,
          );
        } else {
          flashNotice(
            err.code === err.TIMEOUT
              ? "GPS timed out — step outside or near a window, then tap Allow again."
              : err.message || "Could not determine your location — please try again.",
          );
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }, [onLocation, flashNotice]);

  /** Called from the denied banner — every tap gives visible feedback. */
  const recheck = useCallback(() => {
    if (!navigator.permissions?.query) {
      request(); // Firefox/iOS fallback — just try the prompt again
      return;
    }
    setBusy(true);
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((ps) => {
        setPermission(ps.state as PermState);
        setBusy(false);
        if (ps.state === "granted") {
          request(); // user flipped it in site settings → unlock now
        } else {
          setShowHelp(true);
          flashNotice(
            "Location is still blocked in site settings. Follow the steps below, then tap Check Again.",
            8000,
          );
        }
      })
      .catch(() => {
        setBusy(false);
        request();
      });
  }, [request, flashNotice]);

  // Boot: silent-unlock for an already-granted session; otherwise query the
  // permission and auto-fire ONE native prompt (browsers show it immediately
  // when state is 'prompt'). Denied users get the instructive banner instead —
  // never a dead-end screen, never a hung spinner.
  useEffect(() => {
    let cancelled = false;
    let ps: PermissionStatus | null = null;
    const alreadyGranted = (() => {
      try {
        return getStoredCoords() !== null || sessionStorage.getItem(STORAGE_KEY) === "true";
      } catch {
        return getStoredCoords() !== null;
      }
    })();

    if (alreadyGranted) {
      setPermission("granted");
      return;
    }

    if (!navigator.permissions?.query) {
      if (!autoTried.current) {
        autoTried.current = true;
        request();
      }
      return;
    }

    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((s) => {
        if (cancelled) return;
        ps = s;
        setPermission(s.state as PermState);
        s.onchange = () => {
          if (cancelled) return;
          setPermission(s.state as PermState);
          if (s.state === "granted" && !getStoredCoords()) {
            request(); // auto-unlock the instant the user allows it in site settings
          } else if (s.state === "denied") {
            setShowHelp(true);
          }
        };
        if (s.state === "granted") {
          request();
        } else if (s.state === "prompt" && !autoTried.current) {
          autoTried.current = true;
          request();
        }
      })
      .catch(() => {
        if (!cancelled && !autoTried.current) {
          autoTried.current = true;
          request();
        }
      });

    return () => {
      cancelled = true;
      if (ps) ps.onchange = null;
    };
  }, [request]);

  useEffect(
    () => () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    },
    [],
  );

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  const ctxValue: LocationGateCtx = { permission, coords, request, recheck };
  const showBanner = permission !== "granted" && !dismissed;

  return (
    <LocationGateContext.Provider value={ctxValue}>
      {showBanner && (
        <div className="fixed inset-x-0 top-14 z-40 px-3 pt-2 pointer-events-none" data-testid="location-banner">
          <div className="mx-auto max-w-2xl pointer-events-auto">
            <div
              className={`rounded-2xl border shadow-xl backdrop-blur px-3.5 py-2.5 sm:px-4 ${
                permission === "denied"
                  ? "bg-amber-50/95 border-amber-300"
                  : "bg-white/95 border-sky-200"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                    permission === "denied" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {permission === "denied" ? <ShieldAlert size={16} /> : <MapPin size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-800 leading-snug">
                    {permission === "denied"
                      ? "Location is blocked — live wildlife alerts are off"
                      : "Enable location for live wildlife alerts near you"}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                    Needed for corridor alerts, the live conflict map, and signature verification —
                    you can keep browsing meanwhile.
                  </p>
                  {notice && (
                    <p className="text-[11px] font-medium text-slate-700 mt-1.5 bg-slate-100 rounded-lg px-2 py-1.5">
                      {notice}
                    </p>
                  )}
                  {showHelp && permission === "denied" && (
                    <ol className="mt-1.5 space-y-1 text-[11px] text-slate-600 list-decimal list-inside">
                      <li>
                        Tap the <strong>🔒 lock</strong> / <strong>ⓘ</strong> icon in the address bar
                        (Android Chrome: <strong>⋮</strong> → Site settings).
                      </li>
                      <li>
                        <strong>Permissions</strong> → <strong>Location</strong> → <strong>Allow</strong>.
                      </li>
                      <li>
                        The app unlocks automatically — if not, tap <strong>Check Again</strong>.
                      </li>
                    </ol>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {permission === "denied" ? (
                      <button
                        onClick={recheck}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-500 disabled:opacity-60 transition"
                        data-testid="location-check-again"
                      >
                        <RefreshCw size={12} className={busy ? "animate-spin" : ""} />
                        {busy ? "Checking…" : "Check Again"}
                      </button>
                    ) : (
                      <button
                        onClick={request}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-[11px] font-bold hover:bg-sky-500 disabled:opacity-60 transition"
                        data-testid="location-allow"
                      >
                        <MapPin size={12} className={busy ? "animate-bounce" : ""} />
                        {busy ? "Locating…" : "Allow Location"}
                      </button>
                    )}
                    {permission === "denied" && (
                      <button
                        onClick={() => setShowHelp((v) => !v)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition"
                      >
                        {showHelp ? "Hide steps" : "How to enable"}
                      </button>
                    )}
                    <button
                      onClick={dismiss}
                      className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                      aria-label="Not now — continue without location"
                      title="Not now"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {children}
    </LocationGateContext.Provider>
  );
};
