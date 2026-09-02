import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import {
  decodeAadhaar,
  verifyAadhaarSecureQr,
  type AadhaarDecodeResult,
  type AadhaarVerification,
} from "../../lib/aadhaarDecoder";
import { initUidaiVerification } from "../../lib/uidaiPublicKeys";
import { Html5Qrcode } from "html5-qrcode";
import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, AlertCircle, CheckCircle, X } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Stage = "scanning" | "verified" | "registering" | "done";

export const RegisterResidentModal: React.FC<Props> = ({ open, isOpen, onClose, onSuccess }) => {
  const visible = open !== undefined ? open : !!isOpen;
  const { registerResident } = useAuth();
  const [stage, setStage] = useState<Stage>("scanning");
  const [aadhaar, setAadhaar] = useState<AadhaarDecodeResult | null>(null);
  const [verify, setVerify] = useState<AadhaarVerification | null>(null);
  const [error, setError] = useState("");
  const [session, setSession] = useState(0); // bump to restart the scanner
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef(0);

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

  // Scanner lifecycle — keyed to [visible, session] so "Scan Again" restarts it.
  useEffect(() => {
    if (!visible) {
      stopScanner();
      return;
    }
    let cancelled = false;
    // Wait for the #qr-reader element to mount inside the animated modal.
    const timer = setTimeout(async () => {
      if (cancelled || scannerRef.current) return;
      if (!document.getElementById("qr-reader")) {
        setError("Scanner could not start. Please close and reopen this dialog.");
        return;
      }
      const html5 = new Html5Qrcode("qr-reader", false);
      scannerRef.current = html5;
      try {
        await html5.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
          async (decoded) => {
            const now = Date.now();
            if (now - lastScanRef.current < 1200) return; // debounce same-frame hits
            lastScanRef.current = now;
            const data = decodeAadhaar(decoded);
            if (!data || !data.ok || !data.name) {
              // Not an Aadhaar QR — keep the camera running for the next frame.
              setError("That QR is not an Aadhaar card. Scan the QR printed on the Aadhaar card / e-Aadhaar.");
              return;
            }
            setError("");
            await stopScanner();
            const v = await verifyAadhaarSecureQr(data);
            setVerify(v);
            setAadhaar(data);
            setStage("verified");
          },
          () => { /* per-frame decode misses are normal — stay silent */ }
        );
      } catch {
        if (!cancelled) {
          setError("Could not access the camera. Allow camera permission in your browser, then tap Scan Again.");
        }
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopScanner();
    };
  }, [visible, session, stopScanner]);

  useEffect(() => {
    if (!visible) return;
    setStage("scanning");
    setAadhaar(null);
    setVerify(null);
    setError("");
  }, [visible]);

  const handleRegister = async () => {
    if (!aadhaar) return;
    setStage("registering");
    setError("");

    try {
      await registerResident({
        name: aadhaar.name ?? "",
        phone: aadhaar.phone ?? "",
        localityId: "gudalur-town",
        customPlaceName: [aadhaar.vtc, aadhaar.dist].filter(Boolean).join(", "),
        pincode: aadhaar.pc ?? "643211",
        lat: 11.5333,
        lng: 76.6,
        aadhaarVerified: true,
        aadhaarLast4: aadhaar.last4,
        aadhaarRef: aadhaar.referenceId,
      });

      setStage("done");
      onSuccess?.();
      toast.success("Welcome to Voice of Gudalur! Registration complete via Aadhaar scan.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Registration failed. Please try again.");
      setStage("scanning");
      setSession((s) => s + 1); // restart the camera for the retry
    }
  };

  const resetScan = () => {
    setAadhaar(null);
    setVerify(null);
    setError("");
    setStage("scanning");
    setSession((s) => s + 1);
  };

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
                <div id="qr-reader" data-testid="qr-reader-region" className="w-full mb-4 rounded-xl overflow-hidden bg-slate-800 min-h-[240px]" />
                {error && (
                  <div data-testid="scan-error" className="flex items-start gap-2 text-left mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                    <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-red-300">{error}</span>
                  </div>
                )}
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
                <button
                  onClick={handleRegister}
                  className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold shadow-lg hover:from-amber-500 hover:to-orange-500 transition"
                >
                  Register
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
