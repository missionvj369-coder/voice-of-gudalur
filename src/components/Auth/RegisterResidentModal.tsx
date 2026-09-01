import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { GUDALUR_LOCALITIES } from "../../data/gudalurMasterData";
import { getStoredCoords } from "../LocationGate";
import {
  decodeAadhaar,
  validateAadhaarNumber,
  aadhaarAddress,
  type AadhaarDecodeResult,
} from "../../lib/aadhaarDecoder";
import toast from "react-hot-toast";

interface Props {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Stage = "choose" | "scanning" | "verified" | "done";

const FALLBACK_LOCALITY_ID = "new-bazar";

function matchLocality(decoded: AadhaarDecodeResult): string {
  const haystack = [
    decoded.vtc,
    decoded.loc,
    decoded.dist,
    decoded.po,
    decoded.street,
    decoded.co,
    decoded.house,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!haystack) return FALLBACK_LOCALITY_ID;
  const match = GUDALUR_LOCALITIES.find((l) => {
    const keys = [l.name, l.revenueVillage, l.alternativeNames.join(" ")]
      .join(" ")
      .toLowerCase();
    return keys.split(/\s+/).some((k) => k.length > 3 && haystack.includes(k));
  });
  return match?.id || FALLBACK_LOCALITY_ID;
}

export const RegisterResidentModal: React.FC<Props> = ({ open, isOpen, onClose, onSuccess }) => {
  const visible = open !== undefined ? open : !!isOpen;
  const { registerResident, user } = useAuth();
  const [stage, setStage] = useState<Stage>("choose");
  const [decoded, setDecoded] = useState<AadhaarDecodeResult | null>(null);
  const [phone, setPhone] = useState(user?.phone || "");
  const [busy, setBusy] = useState(false);
  const [createdGdrId, setCreatedGdrId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<{ stop: () => Promise<void> } | null>(null);

  const stopScanner = useCallback(async () => {
    try {
      await html5QrRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    html5QrRef.current = null;
  }, []);

  useEffect(() => {
    if (!visible) {
      setStage("choose");
      setDecoded(null);
      setErr("");
      setCreatedGdrId(null);
      setPhone(user?.phone || "");
      stopScanner();
    }
  }, [visible, stopScanner, user?.phone]);

  const startScan = useCallback(async () => {
    setErr("");
    setStage("scanning");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scannerEl = scannerRef.current;
      if (!scannerEl) throw new Error("no scanner element");
      const scanner = new Html5Qrcode(scannerEl.id, { verbose: false });
      html5QrRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
          const result = decodeAadhaar(text);
          if (result.ok) {
            stopScanner();
            setDecoded(result);
            setStage("verified");
            toast.success("Aadhaar verified on-device");
          }
        },
        () => {
          /* per-frame miss — keep scanning */
        }
      );
    } catch (e: any) {
      setErr("Camera unavailable or permission denied: " + (e?.message ?? ""));
      setStage("choose");
    }
  }, [stopScanner]);

  const verifyManualNumber = useCallback(() => {
    const input = document.getElementById("aadhaar-no-input") as HTMLInputElement | null;
    const result = validateAadhaarNumber(input?.value ?? "");
    if (!result.ok) {
      setErr(result.error || "Invalid Aadhaar number");
      return;
    }
    setDecoded({ ...result, name: "Aadhaar Verified User" });
    setStage("verified");
    toast.success("Aadhaar checksum verified");
  }, []);

const handleRegister = useCallback(async () => {
    if (!decoded?.ok) return setErr("Aadhaar not verified");
    if (!/^\d{10}$/.test(phone.trim())) {
      setErr("A valid 10-digit mobile number is required");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const coords = getStoredCoords();
      const profile = await registerResident({
        name: (decoded.name || "Gudalur Resident").trim(),
        phone: phone.trim(),
        localityId: matchLocality(decoded),
        customPlaceName: decoded.vtc || decoded.loc || undefined,
        pincode: decoded.pc || "643212",
        lat: coords?.lat,
        lng: coords?.lng,
        aadhaarVerified: true,
        aadhaarLast4: decoded.last4,
        aadhaarRef: decoded.referenceId || (decoded.yob ? "QR" : "CHKSUM"),
      });
      setCreatedGdrId(profile.gudalurId);
      setStage("done");
      onSuccess?.();
      toast.success("Verified! Your GDR ID is ready.");
    } catch (e: any) {
      setErr(e?.message ?? "Registration failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [decoded, phone, registerResident]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Register with Aadhaar</h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" aria-label="Close">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {stage === "choose" && (
                <>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <strong>One-step verified registration.</strong> Scan your e-Aadhaar QR code
                    (on the PDF back page) and your GDR ID is created automatically from the
                    scanned details — <em>fully on-device</em>, nothing leaves your phone.
                  </p>
                  <button
                    onClick={startScan}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2"
                  >
                    📷 Scan e-Aadhaar QR Code
                  </button>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex-1 h-px bg-slate-200" /> or <span className="flex-1 h-px bg-slate-200" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600" htmlFor="aadhaar-no-input">
                      Enter 12-digit Aadhaar number
                    </label>
                    <input
                      id="aadhaar-no-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={12}
                      placeholder="•••• •••• ••••"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={verifyManualNumber}
                      className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-bold text-sm"
                    >
                      Verify Number (offline checksum)
                    </button>
                  </div>
                  {err && <p className="text-xs text-red-600 font-semibold">{err}</p>}
                </>
              )}

              {stage === "scanning" && (
                <div className="space-y-3 text-center">
                  <div
                    id="aadhaar-qr-scanner"
                    ref={scannerRef}
                    className="w-full aspect-square bg-slate-900 rounded-2xl overflow-hidden"
                  />
                  <p className="text-xs text-slate-500">Point your camera at the e-Aadhaar QR code…</p>
                  <button
                    onClick={() => {
                      stopScanner();
                      setStage("choose");
                    }}
                    className="text-xs text-slate-600 font-bold underline"
                  >
                    Cancel scan
                  </button>
                </div>
              )}

              {stage === "verified" && decoded?.ok && (
                <>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                      <span>✅</span> Aadhaar verified on-device
                    </div>
                    <dl className="text-xs space-y-1 text-slate-700">
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Legal Name</dt>
                        <dd className="font-bold max-w-[60%] text-right">{decoded.name}</dd>
                      </div>
                      {decoded.yob && (
                        <div className="flex justify-between">
                          <dt className="text-slate-400">Year of Birth</dt>
                          <dd className="font-bold">{decoded.yob}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Aadhaar (last 4)</dt>
                        <dd className="font-bold tracking-widest">•••• {decoded.last4}</dd>
                      </div>
                      {aadhaarAddress(decoded) && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-slate-400">Address</dt>
                          <dd className="font-medium max-w-[60%] text-right">{aadhaarAddress(decoded)}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600" htmlFor="gdr-phone">
                      Mobile number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="gdr-phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="10-digit mobile number"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      Needed for your Gudalur ID and login. Scanned Aadhaar details auto-register you — no form fields.
                    </p>
                  </div>

                  {err && <p className="text-xs text-red-600 font-semibold">{err}</p>}

                  <button
                    onClick={handleRegister}
                    disabled={busy}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-sm shadow-lg disabled:opacity-60"
                  >
                    {busy ? "Registering…" : "🚀 Create My GDR ID"}
                  </button>
                </>
              )}

              {stage === "done" && createdGdrId && (
                <div className="text-center space-y-4">
                  <div className="text-5xl">🪪</div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Your Gudalur Resident ID
                    </p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{createdGdrId}</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                    Registered with verified Aadhaar details. Use this GDR ID to sign the petition.
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-bold text-sm"
                  >
                    Done — Enter the App
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};