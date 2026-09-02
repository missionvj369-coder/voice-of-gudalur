import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import {
  decodeAadhaar,
  looksLikeAadhaarSecureQr,
  verifyAadhaarSecureQr,
  type AadhaarDecodeResult,
  type AadhaarVerification,
} from "../../lib/aadhaarDecoder";
import { initUidaiVerification } from "../../lib/uidaiPublicKeys";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, AlertCircle, CheckCircle, X } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Stage = "scanning" | "verified" | "registering" | "done";

interface CameraHelp {
  title: string;
  steps: string[];
}

const isMobileDevice = (): boolean =>
  /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

/** Turn a getUserMedia / Html5Qrcode start failure into human recovery steps. */
function classifyCameraError(e: unknown): CameraHelp {
  const raw =
    typeof e === "string"
      ? e
      : e instanceof Error
        ? e.message
        : e && typeof e === "object" && "name" in e
          ? String((e as { name?: unknown }).name)
          : "";
  const blob = raw.toLowerCase();
  if (blob.includes("notallowed") || blob.includes("permission")) {
    return isMobileDevice()
      ? {
          title: "Camera is blocked for this site — two taps to fix",
          steps: [
            "Android Chrome: tap ⋮ (or the 🔒/ⓘ icon) beside the address bar → Permissions → Camera → Allow.",
            "iPhone Safari: tap aA in the address bar → Site Settings → Camera → Allow.",
            "Then tap “Open Camera & Scan” again — or use “Scan from Photo”, which needs no permission.",
          ],
        }
      : {
          title: "Camera is blocked for this site",
          steps: [
            "Click the 🔒/ⓘ icon in the address bar → Site settings → Camera → Allow.",
            "Refresh the page, then tap “Open Camera & Scan” again — or use “Scan from Photo”.",
          ],
        };
  }
  if (blob.includes("notfound") || blob.includes("nocamera")) {
    return {
      title: "No camera found on this device",
      steps: ["Use “Scan from Photo” below — it works without any camera permission."],
    };
  }
  if (blob.includes("notreadable") || blob.includes("in use") || blob.includes("track start")) {
    return {
      title: "The camera is busy",
      steps: [
        "Close other apps or tabs using the camera (video calls, other scanner tabs), then try again.",
      ],
    };
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return {
      title: "Camera needs a secure (https) connection",
      steps: ["Open the site over https — or just use “Scan from Photo”, which always works."],
    };
  }
  return {
    title: "Couldn't open the camera",
    steps: [
      "Tap “Open Camera & Scan” once more — phones sometimes need a second tap.",
      "Or skip the camera entirely with “Scan from Photo”.",
    ],
  };
}

export const RegisterResidentModal: React.FC<Props> = ({ open, isOpen, onClose, onSuccess }) => {
  const visible = open !== undefined ? open : !!isOpen;
  const { registerResident } = useAuth();
  const [stage, setStage] = useState<Stage>("scanning");
  const [aadhaar, setAadhaar] = useState<AadhaarDecodeResult | null>(null);
  const [verify, setVerify] = useState<AadhaarVerification | null>(null);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState(""); // secure QRs carry no phone — collected here
  const [gdrId, setGdrId] = useState(""); // auto-issued ID, shown on the Done screen
  const [camState, setCamState] = useState<"idle" | "starting" | "running">("idle");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [errHelp, setErrHelp] = useState<CameraHelp | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef(0);
  const photoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    initUidaiVerification();
  }, []);

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s) return;
    try { await s.stop(); } catch { /* already stopped */ }
    try { s.clear(); } catch { /* ignore */ }
  }, []);

  /** Shared success path for camera frames AND scanned photos. */
  const handleDecoded = useCallback(
    async (decoded: string) => {
      const now = Date.now();
      if (now - lastScanRef.current < 1200) return; // debounce same-frame hits
      lastScanRef.current = now;
      const data = decodeAadhaar(decoded);
      if (!data || !data.ok || !data.name) {
        // Keep the camera running for the next frame. If the payload at
        // least looks like an Aadhaar secure QR, the capture worked and the
        // read was noisy — guide the user instead of confusing them.
        setError(
          looksLikeAadhaarSecureQr(decoded)
            ? "Aadhaar QR detected but read unclearly. Hold steadier, get 10-15 cm closer, avoid glare — or use “Scan from Photo”."
            : "That QR is not an Aadhaar card. Scan the QR printed on the Aadhaar card / e-Aadhaar."
        );
        return;
      }
      setError("");
      setErrHelp(null);
      await stopScanner();
      setCamState("idle");
      const v = await verifyAadhaarSecureQr(data);
      setVerify(v);
      // Legacy XML QRs may carry a phone — prefill. Modern secure QRs
      // never do; the user types it on the Verified screen.
      setPhone(data.phone || "");
      setAadhaar(data);
      setStage("verified");
    },
    [stopScanner]
  );

  /**
   * Started DIRECTLY from the button tap so the browser ties its native
   * "Allow camera?" prompt to a real user gesture (mandatory on iOS, and it
   * makes the Allow decision a single obvious tap on Android).
   */
  const openCamera = useCallback(async () => {
    if (scannerRef.current || camState !== "idle") return;
    setError("");
    setErrHelp(null);
    if (!document.getElementById("qr-reader")) {
      await new Promise((r) => setTimeout(r, 80)); // let the stage mount
      if (!document.getElementById("qr-reader")) return;
    }
    setCamState("starting");
    const html5 = new Html5Qrcode("qr-reader", {
      verbose: false,
      // Native BarcodeDetector (Chrome/Android) is dramatically faster and
      // more reliable on dense Version-25 codes than the JS fallback.
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    });
    scannerRef.current = html5;
    try {
      await html5.start(
        {
          facingMode: "environment",
          // Aadhaar secure QRs are Version-25 codes (~129 modules/side): the
          // denser payload needs a high-resolution stream or it can never be
          // resolved. Ask for 1080p and let the browser pick the best offered.
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        {
          fps: 10,
          // A fixed small qrbox crops the frame below the resolvable
          // threshold for dense QRs — use ~85% of the viewfinder instead
          // (min 280px so tiny streams still get enough px per module).
          qrbox: (vw: number, vh: number) => {
            const side = Math.max(280, Math.min(Math.floor(vw * 0.85), Math.floor(vh * 0.85)));
            return { width: side, height: side };
          },
        },
        (decoded) => {
          void handleDecoded(decoded);
        },
        () => { /* per-frame decode misses are normal — stay silent */ }
      );
      setCamState("running");
    } catch (e: unknown) {
      scannerRef.current = null;
      try { html5.clear(); } catch { /* ignore */ }
      setCamState("idle");
      setErrHelp(classifyCameraError(e));
    }
  }, [camState, handleDecoded]);

  /** Native camera / gallery path — no web camera permission involved at all. */
  const decodePhoto = useCallback(
    async (file: File) => {
      setError("");
      setErrHelp(null);
      setPhotoBusy(true);
      let inst: Html5Qrcode | null = null;
      try {
        if (!document.getElementById("qr-reader")) {
          await new Promise((r) => setTimeout(r, 80));
        }
        inst = new Html5Qrcode("qr-reader", { verbose: false });
        const text = await inst.scanFile(file, false);
        try { inst.clear(); } catch { /* ignore */ }
        inst = null;
        lastScanRef.current = 0; // photos must never be debounced
        await handleDecoded(text);
      } catch {
        setError(
          "Couldn't read a QR in that photo. Retake it with the QR filling the frame, sharp and well-lit — no glare."
        );
      } finally {
        if (inst) {
          try { inst.clear(); } catch { /* ignore */ }
        }
        setPhotoBusy(false);
      }
    },
    [handleDecoded]
  );

  // When permission is ALREADY granted, skip the tap and go live instantly
  // (also makes "Scan Again" resume straight into the viewfinder).
  useEffect(() => {
    if (!visible || stage !== "scanning" || scannerRef.current) return;
    let cancelled = false;
    try {
      navigator.permissions
        ?.query({ name: "camera" as PermissionName })
        .then((ps) => {
          if (!cancelled && ps.state === "granted") void openCamera();
        })
        .catch(() => { /* prompt/denied/unsupported → wait for the explicit tap */ });
    } catch {
      /* unsupported — wait for the explicit tap */
    }
    return () => {
      cancelled = true;
    };
  }, [visible, stage, openCamera]);

  useEffect(() => {
    if (!visible) stopScanner();
  }, [visible, stopScanner]);

  useEffect(
    () => () => {
      void stopScanner(); // unmount safety — release the camera
    },
    [stopScanner]
  );

  useEffect(() => {
    if (!visible) return;
    setStage("scanning");
    setAadhaar(null);
    setVerify(null);
    setError("");
    setPhone("");
    setGdrId("");
  }, [visible]);

  const handleRegister = async () => {
    if (!aadhaar) return;
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) {
      setError("Enter your 10-digit mobile number to complete registration.");
      return;
    }
    setStage("registering");
    setError("");

    try {
      const prof = await registerResident({
        name: aadhaar.name ?? "",
        phone: digits,
        localityId: "gudalur-town",
        customPlaceName: [aadhaar.vtc, aadhaar.dist].filter(Boolean).join(", "),
        pincode: aadhaar.pc ?? "643211",
        lat: 11.5333,
        lng: 76.6,
        aadhaarVerified: true,
        aadhaarLast4: aadhaar.last4,
        aadhaarRef: aadhaar.referenceId,
      });

      setGdrId(prof.gudalurId || "");
      setStage("done");
      onSuccess?.();
      toast.success("Welcome to Voice of Gudalur! Registration complete via Aadhaar scan.");
    } catch (e: unknown) {
      // Stay on the Verified screen so the user can fix the problem (e.g. a
      // duplicate phone number) without rescanning their Aadhaar card.
      setError(e instanceof Error ? e.message : "Registration failed. Please try again.");
      setStage("verified");
    }
  };

  const resetScan = () => {
    void stopScanner();
    setAadhaar(null);
    setVerify(null);
    setError("");
    setErrHelp(null);
    setCamState("idle");
    setStage("scanning");
  };

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneOk = phoneDigits.length === 10;

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-700 relative overflow-hidden"
        >
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="absolute top-3 right-3 text-slate-400 hover:text-white transition z-10"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="p-6">
            {/* Scanning Stage */}
            {stage === "scanning" && (
              <div className="text-center">
                <Shield size={32} className="text-amber-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">Register as Gudalur Resident</h3>
                <p className="text-sm text-slate-300 mb-1">
                  Scan the QR code on your Aadhaar card.
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  உங்கள் ஆதார் அட்டையில் உள்ள QR குறியீட்டை ஸ்கேன் செய்யவும்
                </p>
                <div className="relative w-full mb-2 rounded-xl overflow-hidden bg-slate-800 min-h-[220px]">
                  <div id="qr-reader" data-testid="qr-reader-region" className="w-full min-h-[220px]" />
                  {camState === "idle" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-6 text-center pointer-events-none">
                      <span className="text-4xl">📷</span>
                      <p className="text-xs text-slate-300 font-medium">Tap “Open Camera &amp; Scan” below</p>
                      <p className="text-[11px] text-slate-400">
                        Your phone asks for camera access — just tap <b>Allow</b>
                      </p>
                    </div>
                  )}
                  {camState === "starting" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center pointer-events-none">
                      <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-slate-300">
                        Opening camera… tap <b>Allow</b> if your phone asks
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mt-1">
                  <button
                    onClick={() => void openCamera()}
                    disabled={camState !== "idle" || photoBusy}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-sm shadow-lg hover:from-amber-500 hover:to-orange-500 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
                    data-testid="open-camera"
                  >
                    📷 {camState === "starting" ? "Opening camera…" : camState === "running" ? "Camera live — scanning…" : "Open Camera & Scan"}
                  </button>
                  <button
                    onClick={() => photoRef.current?.click()}
                    disabled={photoBusy || camState === "starting" || camState === "running"}
                    className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
                    data-testid="photo-scan-button"
                  >
                    🖼️ {photoBusy ? "Reading photo…" : "Scan from Photo (no permission needed)"}
                  </button>
                </div>

                {camState === "running" && (
                  <p className="text-[11px] text-sky-300 text-center mt-2">
                    Fill most of the box with the QR, 10-15 cm away, good light, hold steady.
                  </p>
                )}

                {errHelp && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left" data-testid="camera-help">
                    <p className="text-xs font-bold text-amber-300 mb-1">🔒 {errHelp.title}</p>
                    <ol className="space-y-1 text-[11px] text-amber-200/90 list-decimal list-inside">
                      {errHelp.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {error && (
                  <div data-testid="scan-error" className="flex items-start gap-2 text-left mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                    <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-red-300">{error}</span>
                  </div>
                )}
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void decodePhoto(f);
                  }}
                  data-testid="photo-scan-input"
                />
                <p className="text-[11px] text-slate-500 text-center mt-3">
                  Decoded on your device only — your Aadhaar never leaves this phone.
                </p>
              </div>
            )}

            {/* Verified Stage */}
            {stage === "verified" && aadhaar && (
              <>
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle size={40} className="text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-center text-white mb-2" data-testid="aadhaar-verified-card">Aadhaar Verified</h3>
                <div className="flex flex-col items-center gap-1 mb-4">
                  {verify?.integrityOk === true && (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                      <ShieldCheck size={14} /> Integrity verified (SHA-256)
                    </span>
                  )}
                  {verify?.integrityOk === false && (
                    <span className="inline-flex items-center gap-1.5 text-red-400 text-xs font-medium">
                      <ShieldAlert size={14} /> QR data looks corrupted — please rescan
                    </span>
                  )}
                  {verify?.integrityOk == null && (
                    <span className="inline-flex items-center gap-1.5 text-slate-400 text-xs">
                      <ShieldQuestion size={14} /> Integrity check unavailable for this QR type
                    </span>
                  )}
                  {verify?.signatureOk === true && (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                      <ShieldCheck size={14} /> Digitally signed by UIDAI
                    </span>
                  )}
                  {verify?.signatureOk === false && (
                    <span className="inline-flex items-center gap-1.5 text-amber-400 text-xs">
                      <ShieldAlert size={14} /> UIDAI signature key not matched (key rotation) — decoded offline
                    </span>
                  )}
                </div>
                <div className="bg-slate-800/60 rounded-xl p-4 space-y-2 mb-4">
                  <p className="text-sm">
                    <span className="text-slate-400">Name: </span>
                    <span className="text-white font-medium">{aadhaar.name}</span>
                  </p>
                  {aadhaar.pc && (
                    <p className="text-sm">
                      <span className="text-slate-400">PIN: </span>
                      <span className="text-white">{aadhaar.pc}</span>
                    </p>
                  )}
                  {aadhaar.vtc && (
                    <p className="text-sm">
                      <span className="text-slate-400">VTC: </span>
                      <span className="text-white">{aadhaar.vtc}</span>
                    </p>
                  )}
                  {aadhaar.dist && (
                    <p className="text-sm">
                      <span className="text-slate-400">District: </span>
                      <span className="text-white">{aadhaar.dist}</span>
                    </p>
                  )}
                  <p className="text-xs text-slate-400 pt-1">
                    Verified &bull; Last 4: {aadhaar.last4}
                  </p>
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="vog-reg-phone"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Mobile number <span className="text-amber-400">*</span>
                    <span className="text-slate-500"> — for sign-in &amp; alerts</span>
                  </label>
                  <input
                    id="vog-reg-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                    data-testid="reg-phone-input"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm tracking-widest placeholder:text-slate-500 placeholder:tracking-normal focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  {phoneDigits.length > 0 && !phoneOk && (
                    <p className="text-[11px] text-amber-400 mt-1">
                      Aadhaar QRs never carry your number — enter all 10 digits to continue.
                    </p>
                  )}
                </div>
                <button
                  onClick={handleRegister}
                  disabled={!phoneOk}
                  className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold shadow-lg hover:from-amber-500 hover:to-orange-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {phoneOk ? "Register & Get My GDR ID" : "Enter mobile number to register"}
                </button>
                <button
                  onClick={resetScan}
                  className="w-full mt-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition"
                >
                  Scan Again
                </button>
                {error && (
                  <div className="flex items-center gap-2 justify-center text-red-400 text-xs mt-2">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                  </div>
                )}
              </>
            )}

            {/* Registering Stage */}
            {stage === "registering" && (
              <div className="text-center py-8">
                <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-300">Creating your GDR ID and registering…</p>
              </div>
            )}

            {/* Done Stage */}
            {stage === "done" && (
              <div className="text-center py-6">
                <CheckCircle size={48} className="text-emerald-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">Registration Complete!</h3>
                <p className="text-sm text-slate-300 mb-4">
                  You are now a verified Voice of Gudalur resident.
                </p>
                {gdrId && (
                  <div
                    className="mb-4 p-4 rounded-xl bg-slate-800 border border-emerald-500/30"
                    data-testid="gdr-id-card"
                  >
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                      Your Gudalur Resident ID
                    </p>
                    <p
                      className="text-2xl font-mono font-black text-emerald-400 tracking-wider"
                      data-testid="gdr-id-value"
                    >
                      {gdrId}
                    </p>
                    <button
                      onClick={() => {
                        try {
                          navigator.clipboard?.writeText(gdrId);
                          toast.success("GDR ID copied to clipboard");
                        } catch {
                          toast.error("Could not copy — please note it down");
                        }
                      }}
                      className="mt-2 text-xs text-slate-400 hover:text-white underline underline-offset-2 transition"
                    >
                      Copy ID
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-400 mb-4">
                  Sign in anytime with this ID or your mobile number — no password needed.
                </p>
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition"
                >
                  Continue to App
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
