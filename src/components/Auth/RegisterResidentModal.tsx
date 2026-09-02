import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { decodeAadhaar, type AadhaarDecodeResult as AadhaarData } from "../../lib/aadhaarDecoder";
import { Html5Qrcode } from "html5-qrcode";
import { Shield, AlertCircle, CheckCircle, X } from "lucide-react";
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
  const [aadhaar, setAadhaar] = useState<AadhaarData | null>(null);
  const [error, setError] = useState("");
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStage("scanning");
    setAadhaar(null);
    setError("");
  }, [visible]);

  const startScan = useCallback(async () => {
    if (!visible) return;
    setError("");
    const html5 = new Html5Qrcode("qr-reader");
    setHtml5QrCode(html5);

    try {
      await html5.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decoded) => {
          try { if (html5) html5.clear(); } catch { /* ignore */ }
          const data = decodeAadhaar(decoded);
          if (!data || !data.name) {
            setError("Scanned QR is not a valid Aadhaar card.");
            return;
          }
          setAadhaar(data);
          setStage("verified");
        },
        () => { /* silent: scan errors are normal while initializing */ }
      );
    } catch {
      setError("Could not access camera. Please allow camera permissions.");
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      startScan();
    } else if (html5QrCode) {
      try { html5QrCode.clear(); } catch { /* ignore */ }
    }
  }, [visible, startScan]);
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
    }
  };

  const resetScan = () => {
    setAadhaar(null);
    setStage("scanning");
    setError("");
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
            onClick={onClose}
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
                <p className="text-sm text-slate-300 mb-4">
                  Scan your Aadhaar QR to verify your identity.
                </p>
                <div id="qr-reader" className="w-full mb-4 rounded-xl overflow-hidden" />
                {error && (
                  <div className="flex items-center gap-2 justify-center text-red-400 text-xs mt-2">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            )}

            {/* Verified Stage */}
            {stage === "verified" && aadhaar && (
              <>
                <div className="flex items-center justify-center mb-4">
                  <CheckCircle size={40} className="text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-center text-white mb-4">Aadhaar Verified</h3>
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
                <p className="text-sm text-slate-300">Creating your GDR ID and registeringâ€¦</p>
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
