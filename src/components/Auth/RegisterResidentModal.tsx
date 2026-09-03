import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import {
  decodeAadhaarAsync,
  looksLikeAadhaarSecureQr,
  verifyAadhaarSecureQr,
  type AadhaarDecodeResult,
  type AadhaarVerification,
} from "../../lib/aadhaarDecoder";
import { initUidaiVerification } from "../../lib/uidaiPublicKeys";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { decodePhotoQr, decodeVideoFrame } from "../../lib/qrDecode";
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

type PhotoBitmap = ImageBitmap | HTMLImageElement;

/** Decode an uploaded image to a drawable bitmap (ImageBitmap, legacy fallback). */
async function loadPhotoBitmap(file: File): Promise<PhotoBitmap> {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file); } catch { /* older browsers */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Unsupported image"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Zoom ladder for photo scanning. Aadhaar secure QRs are Version-25 codes
 * (~129 modules per side) — a phone photo only resolves at the right pixel
 * scale, so we try the original size, then step down (or up for thumbnails).
 */
function photoScalePlan(w: number, h: number): number[] {
  const longest = Math.max(w, h);
  const plan = [longest, 2200, 1600, 1200, 900, 640];
  if (longest < 700) plan.unshift(longest * 2);
  return [...new Set(plan.filter((s) => s >= 320))].sort((a, b) => b - a);
}

async function renderScaledJpeg(src: PhotoBitmap, maxSide: number): Promise<Blob> {
  const sw = "naturalWidth" in src ? src.naturalWidth : src.width;
  const sh = "naturalHeight" in src ? src.naturalHeight : src.height;
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Image encode failed"))), "image/jpeg", 0.92),
  );
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
  const [scanStatus, setScanStatus] = useState("");
  const [errHelp, setErrHelp] = useState<CameraHelp | null>(null);
  // Live camera resources — raw getUserMedia, no scanner library in the loop.
  const cameraRef = useRef<{
    stream: MediaStream;
    video: HTMLVideoElement;
    timer: number | null;
    canvas: HTMLCanvasElement;
    tickCount: number;
    busy: boolean;
  } | null>(null);
  // html5-qrcode file scanner — last-resort fallback engine for photos only.
  const fileScannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef(0);
  const photoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    initUidaiVerification();
  }, []);

  const stopScanner = useCallback(async () => {
    setCamState("idle");
    const cam = cameraRef.current;
    cameraRef.current = null;
    if (!cam) return;
    if (cam.timer !== null) window.clearTimeout(cam.timer);
    cam.stream.getTracks().forEach((t) => t.stop());
    try { cam.video.pause(); } catch { /* already paused */ }
    cam.video.remove();
    setScanStatus("Scanner stopped. Scan from Photo, or start the camera again.");
  }, []);

  /** Shared success path for camera frames AND scanned photos. */
  const handleDecoded = useCallback(
    async (decoded: string) => {
      const now = Date.now();
      if (now - lastScanRef.current < 1200) return; // debounce same-frame hits
      lastScanRef.current = now;
      const data = await decodeAadhaarAsync(decoded);
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
   * "Allow camera?" prompt to a real user gesture (mandatory on iOS).
   * Raw getUserMedia + a decode loop over the SAME engines as photo scanning
   * (native BarcodeDetector every frame, ZBar-wasm → jsQR every other frame,
   * full-frame — no qrbox cropping). html5-qrcode's zxing build was too weak
   * for Version-25+ Aadhaar QRs; this loop is not.
   */
  const openCamera = useCallback(async () => {
    if (camState === "starting" || camState === "running") return;
    setError("");
    setErrHelp(null);
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setErrHelp({
        title: "Camera needs a secure (https) connection",
        steps: ["Open the site over https — or use “Scan from Photo”, which always works."],
      });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrHelp({
        title: "This browser can't open the camera",
        steps: ["Use “Scan from Photo” below — it works on every browser, no permissions needed."],
      });
      return;
    }
    if (!document.getElementById("qr-reader")) {
      await new Promise((r) => setTimeout(r, 80));
      if (!document.getElementById("qr-reader")) return;
    }
    setCamState("starting");
    setScanStatus("Requesting camera permissions…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      const container = document.getElementById("qr-reader")!;
      const video = document.createElement("video");
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;
      // Legacy iOS (<15) needs the attribute, not just the property.
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.style.width = "100%";
      video.style.display = "block";
      video.style.borderRadius = "12px";
      video.style.background = "#000";
      video.style.objectFit = "cover";
      container.innerHTML = "";
      container.appendChild(video);
      video.srcObject = stream;
      await video.play().catch(() => { /* muted autoplay is allowed everywhere */ });

      // Wait until the track reports real dimensions — on slow devices the
      // first frames can otherwise be 0×0 and every engine no-ops silently.
      if (!video.videoWidth || !video.videoHeight) {
        await new Promise<void>((res) => {
          const t = window.setTimeout(res, 4000); // hard timeout — don't hang forever
          video.onloadedmetadata = () => { window.clearTimeout(t); res(); };
        });
      }
      if (!video.videoWidth || !video.videoHeight) {
        throw new Error("Camera started but no video track — try Scan from Photo.");
      }

      const cam: NonNullable<typeof cameraRef.current> = {
        stream,
        video,
        timer: null,
        canvas: document.createElement("canvas"),
        tickCount: 0,
        busy: false,
      };
      cameraRef.current = cam;

      const tick = async () => {
        const cur = cameraRef.current;
        if (!cur || cur !== cam) return;
        if (cur.busy) {
          cur.timer = window.setTimeout(tick, 100);
          return;
        }
        cur.busy = true;
        try {
          cur.tickCount++;
          const hit = await decodeVideoFrame(cur.video, cur.canvas, cur.tickCount % 2 === 0);
          if (hit) {
            window.clearTimeout(cur.timer);
            cur.timer = null;
            void handleDecoded(hit.text);
            return; // handleDecoded → stopScanner releases the camera
          }
        } catch { /* skip this frame */ } finally {
          cur.busy = false;
        }
        if (cameraRef.current === cam) {
          cam.timer = window.setTimeout(tick, 150);
        }
      };
      cam.timer = window.setTimeout(tick, 300);
      setCamState("running");
      setScanStatus("Camera active. Hold the card 10-15 cm away, QR toward the camera, steady.");
    } catch (e: unknown) {
      setCamState("idle");
      setErrHelp(classifyCameraError(e));
    }
  }, [camState, handleDecoded]);

  /** Gallery / file-picker path — no web camera permission involved at all. */
  const decodePhoto = useCallback(
    async (file: File) => {
      setError("");
      setErrHelp(null);
      setPhotoBusy(true);
      let inst: Html5Qrcode | null = null;
      try {
        setScanStatus("Loading image…");
        // NEW multi-engine pipeline first — native BarcodeDetector → ZBar-wasm
        // → jsQR, over scale / Otsu-contrast / sharpen variants. This is what
        // makes low-quality photos work.
        const hit = await decodePhotoQr(file, (m) => setScanStatus(m));
        if (hit) {
          setScanStatus(`QR decoded via ${hit.engine} — verifying Aadhaar payload…`);
          lastScanRef.current = 0;
          await handleDecoded(hit.text);
          return;
        }
        setScanStatus("Deep scan found nothing — trying the fallback engine…");
        // Fallback: html5-qrcode file scanner (separate hidden element —
        // never fights with the live camera element).
        if (!document.getElementById("qr-reader-file")) {
          const el = document.createElement("div");
          el.id = "qr-reader-file";
          el.style.display = "none";
          document.body.appendChild(el);
        }
        if (!fileScannerRef.current) {
          fileScannerRef.current = new Html5Qrcode("qr-reader-file", {
            verbose: false,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          });
        }
        inst = fileScannerRef.current;
        let text: string | null = null;
        try {
          text = await inst.scanFile(file, true);
        } catch { text = null; }
        if (!text) {
          try {
            const bitmap = await loadPhotoBitmap(file);
            for (const maxSide of photoScalePlan(bitmap.width, bitmap.height)) {
              const blob = await renderScaledJpeg(bitmap, maxSide);
              try {
                text = await inst.scanFile(new File([blob], "frame.jpg", { type: "image/jpeg" }), true);
              } catch { text = null; }
              if (text) break;
            }
          } catch { /* undecodable image */ }
        }
        if (!text) {
          setError("No QR found in this photo even after deep scanning (scales, contrast, sharpening). Retake it: fill the frame with the QR, hold steady, avoid glare — or try the live camera.");
          return;
        }
        lastScanRef.current = 0;
        await handleDecoded(text);
      } catch (e: unknown) {
        // Never swallow failures silently — surface them in the scan log so
        // the user isn't left staring at a stopped spinner.
        const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "";
        setError(
          `Photo scan failed${msg ? `: ${msg}` : ""}. Try a sharper, well-lit photo of the QR — or use the camera.`
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





  useEffect(() => {
    if (!visible) {
      void stopScanner();
      if (fileScannerRef.current) {
        try { fileScannerRef.current.clear(); } catch { /* ignore */ }
        fileScannerRef.current = null;
      }
    }
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
    if (fileScannerRef.current) {
      try { fileScannerRef.current.clear(); } catch { /* ignore */ }
      fileScannerRef.current = null;
    }
    setAadhaar(null);
    setVerify(null);
    setError("");
    setErrHelp(null);
    setScanStatus("");
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
          className="bg-[#2E7D32] rounded-2xl shadow-xl w-full max-w-md border border-[#AED581]/30 relative overflow-hidden"
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
                {/* Viewfinder */}
                <div id="qr-reader" data-testid="qr-reader-region" className="w-full min-h-[220px] rounded-xl overflow-hidden bg-black" />

                {/* PRIMARY — photo scan: no permissions, every browser, and
                    the multi-engine decoder (BarcodeDetector → ZBar → jsQR)
                    retries scales, contrast and sharpening on low-quality
                    shots. */}
                <div className="mt-3 text-left">
                  <label
                    htmlFor="qr-file-input"
                    className="block border-2 border-dashed border-amber-400/70 bg-amber-500/10 rounded-xl p-5 text-center cursor-pointer hover:border-amber-300 hover:bg-amber-500/20 transition"
                    data-testid="photo-scan-button"
                  >
                    <p className="text-sm font-bold text-amber-200">📷 Scan from Photo — recommended</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Photograph the Aadhaar QR (or pick an existing shot). Dim, blurry or glaring — the decoder retries every way it can.
                    </p>
                  </label>
                  <input
                    ref={photoRef}
                    id="qr-file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files && e.target.files[0];
                      if (f) void decodePhoto(f);
                    }}
                  />
                  {photoBusy && (
                    <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-300">
                      <div className="h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      Processing uploaded image...
                    </div>
                  )}
                </div>

                {/* SECONDARY — live camera (needs permission + https). */}
                <div className="flex gap-2 mt-3">
                  {camState !== "running" ? (
                    <button
                      type="button"
                      onClick={() => void openCamera()}
                      disabled={camState === "starting" || photoBusy}
                      className="flex-1 py-3 rounded-xl border border-slate-500 bg-slate-800/60 text-slate-200 font-bold text-sm hover:border-amber-400 hover:text-amber-200 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
                      data-testid="open-camera"
                    >
                      {camState === "starting" ? "Opening camera..." : "Use Live Camera Instead"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { void stopScanner(); }}
                      className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm active:scale-[0.99] transition"
                      data-testid="stop-camera"
                    >
                      Stop Camera
                    </button>
                  )}
                </div>

                <div
                  className="mt-3 p-3 rounded-lg bg-slate-800/80 border border-slate-600 text-left font-mono text-[11px] leading-relaxed text-slate-200 max-h-[150px] overflow-y-auto break-words"
                  data-testid="scan-log"
                >
                  {errHelp ? (
                    <>
                      <p className="font-bold text-amber-300 mb-1">{errHelp.title}</p>
                      <ol className="space-y-1 text-amber-200/90 list-decimal list-inside">
                        {errHelp.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    </>
                  ) : error ? (
                    <span className="text-red-400 font-bold">{error}</span>
                  ) : (
                    <span className="text-emerald-400">{scanStatus || "Status: Ready. Click start or upload an image."}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={resetScan}
                  className="w-full mt-3 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition"
                >
                  Scan Again
                </button>
              </div>
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
