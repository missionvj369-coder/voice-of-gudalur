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
import { decodePhotoQr, decodeVideoFrame, getStageMessage } from "../../lib/qrDecode";
import { Shield, ShieldCheck, ShieldAlert, CheckCircle, X, Camera } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Stage = "scanning" | "verified" | "registering" | "done";

type DiagnosticStage =
  | "IMAGE_LOADED"
  | "QR_NOT_DETECTED"
  | "QR_DETECTED_NOT_DECODED"
  | "QR_DECODED_INVALID"
  | "QR_DECODED_VALID"
  | "SIGNATURE_VERIFIED"
  | "SIGNATURE_UNVERIFIED"
  | "SIGNATURE_INVALID";

interface CameraHelp {
  title: string;
  steps: string[];
}

interface DiagnosticInfo {
  stage: DiagnosticStage;
  engine?: string;
  attempts: number;
  processingMs?: number;
}

const isMobileDevice = (): boolean =>
  /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

/** Turn a getUserMedia / camera start failure into human recovery steps. */
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
  const [diagnosticStage, setDiagnosticStage] = useState<DiagnosticStage | null>(null);
  const [diagnosticEngine, setDiagnosticEngine] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [gdrId, setGdrId] = useState("");
  const [camState, setCamState] = useState<"idle" | "starting" | "running">("idle");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [errHelp, setErrHelp] = useState<CameraHelp | null>(null);
  const [cameraUnsupported, setCameraUnsupported] = useState(false);
  // Live camera resources — raw getUserMedia, no scanner library in the loop.
  const cameraRef = useRef<{
    stream: MediaStream;
    video: HTMLVideoElement;
    timer: number | null;
    canvas: HTMLCanvasElement;
    tickCount: number;
    busy: boolean;
    } | null>(null);
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
    async (decoded: string, engine?: string) => {
      const now = Date.now();
      if (now - lastScanRef.current < 1200) return;
      lastScanRef.current = now;
      if (engine) setDiagnosticEngine(engine);
      setDiagnosticStage("QR_DECODED_VALID");
      const data = await decodeAadhaarAsync(decoded);
      if (!data || !data.ok || !data.name) {
        setDiagnosticStage(looksLikeAadhaarSecureQr(decoded) ? "QR_DETECTED_NOT_DECODED" : "QR_DECODED_INVALID");
        setError(
          looksLikeAadhaarSecureQr(decoded)
            ? (data?.error ||
                "Aadhaar QR detected but read unclearly") +
                " Hold the card flat, avoid glare, get 10-15 cm closer — or use “Scan from Photo”."
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
      // Honest verification state — never "verified" on integrity-only.
      if (v.signatureStatus === "verified") {
        setDiagnosticStage("SIGNATURE_VERIFIED");
      } else if (v.signatureStatus === "invalid") {
        setDiagnosticStage("SIGNATURE_INVALID");
      } else {
        setDiagnosticStage("SIGNATURE_UNVERIFIED");
      }
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
      setCameraUnsupported(true);
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
      let stream: MediaStream;
      try {
        // Prefer rear camera, but don't fail on devices that can't satisfy it.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch {
        // Fallback: any available camera.
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      const container = document.getElementById("qr-reader")!;
      const video = document.createElement("video");
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;
      // Legacy iOS (<15) needs the attribute, not just the property.
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.style.position = "absolute";
      video.style.inset = "0";
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.display = "block";
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
            void handleDecoded(hit.text, hit.engine);
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
      try {
        setScanStatus("Loading image…");
        // Multi-engine pipeline: native BarcodeDetector → ZBar-wasm → jsQR,
        // over scale / Otsu-contrast / sharpen variants. Runs heavy enhancement
        // on a Web Worker pool, falls back to main-thread on old browsers.
        const hit = await decodePhotoQr(file, (m) => setScanStatus(m));
        if (hit) {
          setScanStatus(`QR decoded via ${hit.engine} — verifying Aadhaar payload…`);
          lastScanRef.current = 0;
          await handleDecoded(hit.text, hit.engine);
          return;
        }
        setDiagnosticStage("QR_NOT_DETECTED");
        setScanStatus("");
        setError("No QR found in this photo even after deep scanning (scales, contrast, sharpening). Retake it: fill the frame with the QR, hold steady, avoid glare — or try the live camera.");
      } catch (e: unknown) {
        // Never swallow failures silently — surface them in the scan log so
        // the user isn't left staring at a stopped spinner.
        const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "";
        setError(
          `Photo scan failed${msg ? `: ${msg}` : ""}. Try a sharper, well-lit photo of the QR — or use the camera.`
        );
      } finally {
        setPhotoBusy(false);
      }
    },
    [handleDecoded]
  );

/** "Take Photo & Scan" — capture a still from the live camera and run the
   *  full multi-pass photo pipeline. This is the universal fallback for slow
   *  phones where continuous live decoding can't keep up. */
  const captureFrame = useCallback(async () => {
    const cam = cameraRef.current;
    if (!cam) return;
    setPhotoBusy(true);
    setScanStatus("Capturing photo… running deep scan");
    try {
      const video = cam.video;
      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(vw, 2560);
      canvas.height = Math.max(1, Math.round((canvas.width / vw) * vh));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("canvas 2d unavailable");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.92));
      if (!blob) throw new Error("could not capture frame");
      const file = new File([blob], `aadhaar-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      await stopScanner();
      setCamState("idle");
      setError("");
      const hit = await decodePhotoQr(file, (m) => setScanStatus(m));
      if (hit) {
        setScanStatus(`QR decoded via ${hit.engine} — verifying…`);
        lastScanRef.current = 0;
        await handleDecoded(hit.text, hit.engine);
        return;
      }
      setDiagnosticStage("QR_NOT_DETECTED");
      setError(
        "Couldn't read the QR from the captured photo either. Move closer, avoid glare, and try again — or pick an existing photo."
      );
    } catch (e: unknown) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "";
      setError(`Capture failed${msg ? `: ${msg}` : ""}. Try Scan from Photo instead.`);
    } finally {
      setPhotoBusy(false);
    }
  }, [handleDecoded, stopScanner]);

  useEffect(() => {
        if (!visible) {
      void stopScanner();
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
    setAadhaar(null);
    setVerify(null);
    setError("");
    setErrHelp(null);
    setScanStatus("");
    setCamState("idle");
    setStage("scanning");
    setDiagnosticStage(null);
    setDiagnosticEngine("");
    setCameraUnsupported(false);
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#2E7D32] shadow-xl w-full h-full min-h-0 rounded-none sm:rounded-2xl sm:h-auto sm:max-w-md border border-[#AED581]/30 relative overflow-hidden"
        >
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition sm:bg-transparent sm:text-slate-400 sm:hover:bg-black/10"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="h-full">
            {/* Scanning Stage */}
            {stage === "scanning" && (
              <div className="flex flex-col h-full text-center gap-2 px-4 pt-14 sm:pt-6 pb-4 overflow-y-auto">
                {/* Desktop header */}
                <div className="hidden sm:block">
                  <Shield size={32} className="text-amber-400 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-white mb-2">Register as Gudalur Resident</h3>
                  <p className="text-sm text-slate-300 mb-1">Scan the QR code on your Aadhaar card.</p>
                  <p className="text-xs text-slate-400 mb-4">உங்கள் ஆதார் அட்டையில் உள்ள QR குறியீட்டை ஸ்கேன் செய்யவும்</p>
                </div>
                {/* Compact header for the full-screen mobile layout */}
                <div className="sm:hidden">
                  <Shield size={26} className="text-amber-400 mx-auto mb-1" />
                  <h3 className="text-lg font-bold text-white leading-tight">Register as Gudalur Resident</h3>
                  <p className="text-[11px] text-slate-300 mt-1">Scan the QR on your Aadhaar card</p>
                </div>

                {/* Viewfinder — landscape camera feed that fills the screen on mobile */}
                <div className="relative flex-1 min-h-0 w-full sm:flex-none sm:aspect-video rounded-xl overflow-hidden bg-black">
                  <div id="qr-reader" data-testid="qr-reader-region" className="absolute inset-0" />

                  {camState === "idle" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center bg-black">
                      <p className="text-[11px] text-slate-500">Landscape view — hold the card sideways, flat, QR toward camera.</p>
                      <label
                        htmlFor="qr-file-input"
                        className="block w-full max-w-[280px] border-2 border-dashed border-amber-400/70 bg-amber-500/10 rounded-xl p-4 text-center cursor-pointer hover:border-amber-300 hover:bg-amber-500/20 transition"
                        data-testid="photo-scan-button"
                      >
                        <p className="text-sm font-bold text-amber-200">📷 Scan from Photo — recommended</p>
                        <p className="text-[11px] text-slate-400 mt-1">Photograph the Aadhaar QR (or pick an existing shot).</p>
                      </label>
                      {photoBusy && (
                        <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
                          <div className="h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                          Processing uploaded image...
                        </div>
                      )}
                      {errHelp && (
                        <div className="w-full max-w-[300px] text-left rounded-lg bg-slate-800/90 border border-slate-600 p-3 max-h-28 overflow-y-auto">
                          <p className="font-bold text-amber-300 text-xs mb-1">{errHelp.title}</p>
                          <ol className="text-[11px] text-amber-200/90 list-decimal list-inside space-y-1">
                            {errHelp.steps.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {!photoBusy && error && !errHelp && (
                        <p className="text-red-400 text-xs font-bold max-w-[300px]">{error}</p>
                      )}
                    </div>
                  )}

                  {camState === "running" && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[92%] px-3 py-2 rounded-lg bg-black/70 backdrop-blur text-center">
                      <span
                        className={`block text-[11px] font-medium break-words ${error ? "text-red-400" : "text-emerald-300"}`}
                      >
                        {error || scanStatus}
                      </span>
                      {photoBusy ? (
                        <span className="block mt-1 text-[11px] text-amber-300">Processing captured photo…</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void captureFrame()}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold transition active:scale-[0.98]"
                          data-testid="capture-photo-scan"
                        >
                          <Camera size={12} /> Can't read? Take Photo & Scan
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Diagnostic stage feedback — tells users exactly which layer failed */}
                {diagnosticStage && !errHelp && !error && camState !== "running" && (
                  <div
                    className="w-full rounded-lg bg-slate-800/90 border border-slate-600 px-3 py-2 text-left sm:hidden"
                    data-testid="diagnostic-panel"
                  >
                    <p className="text-[11px] font-bold text-amber-300">{getStageMessage(diagnosticStage).title}</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">{getStageMessage(diagnosticStage).hint}</p>
                    {diagnosticEngine && (
                      <p className="text-[9px] font-mono text-slate-500 mt-0.5">engine: {diagnosticEngine}</p>
                    )}
                  </div>
                )}

                {/* Footer controls */}
                <div className="flex gap-2 pt-1">
                  <label
                    htmlFor="qr-file-input"
                    className="sm:hidden flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-amber-400/70 bg-amber-500/10 text-amber-200 font-bold text-sm cursor-pointer active:scale-[0.99] transition"
                  >
                    📷 Photo
                  </label>
                  {camState !== "running" ? (
                    <button
                      type="button"
                      onClick={() => void openCamera()}
                      disabled={camState === "starting" || photoBusy}
                      className="flex-1 py-3 rounded-xl border border-slate-500 bg-slate-800/60 text-slate-200 font-bold text-sm hover:border-amber-400 hover:text-amber-200 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
                      data-testid="open-camera"
                    >
                      {camState === "starting" ? "Opening camera..." : "Use Live Camera"}
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

                {/* Desktop-only detail log + reset */}
                <div
                  className="hidden sm:block mt-2 p-3 rounded-lg bg-slate-800/80 border border-slate-600 text-left font-mono text-[11px] leading-relaxed text-slate-200 max-h-[150px] overflow-y-auto break-words"
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
                  ) : diagnosticStage && diagnosticStage !== "IMAGE_LOADED" ? (
                    <span className="text-amber-300">
                      <span className="font-bold">{getStageMessage(diagnosticStage).title}</span>
                      {diagnosticEngine ? ` (${diagnosticEngine})` : ""} — {diagnosticStage}
                    </span>
                  ) : (
                    <span className="text-emerald-400">{scanStatus || "Status: Ready. Click start or upload an image."}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={resetScan}
                  className="hidden sm:block mt-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition"
                >
                  Scan Again
                </button>

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
                {/* Mobile camera-capture enhancement — opens the rear camera directly
                    on phones, while the plain picker above still allows Gallery/Files. */}
                <input
                  id="qr-capture-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    if (f) void decodePhoto(f);
                  }}
                />
                {cameraUnsupported && (
                  <label
                    htmlFor="qr-capture-input"
                    className="sm:hidden flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm cursor-pointer active:scale-[0.99] transition"
                    data-testid="mobile-capture-fallback"
                  >
                    <Camera size={16} /> Take Photo & Scan
                  </label>
                )}
              </div>
            )}

            {/* Verified Stage — decoded Aadhaar data, ready to register */}
            {stage === "verified" && (
              <div className="flex flex-col h-full gap-3 px-4 pt-14 sm:pt-6 pb-4 overflow-y-auto">
                <div className="text-center">
                  {verify?.signatureStatus === "verified" ? (
                    <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 rounded-full px-3 py-1 mb-2">
                      <CheckCircle size={15} />
                      <span className="text-[11px] font-bold uppercase tracking-wider" data-testid="verified-badge">✓ Aadhaar Secure QR Verified</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-400/40 text-amber-300 rounded-full px-3 py-1 mb-2">
                      <ShieldAlert size={15} />
                      <span className="text-[11px] font-bold uppercase tracking-wider" data-testid="read-badge">
                        {verify?.signatureStatus === "invalid" ? "Signature Invalid — Caution" : "Details Read From Document"}
                      </span>
                    </div>
                  )}
                  <h3
                    className="text-xl font-bold text-white leading-tight"
                    data-testid="decoded-name"
                  >
                    {aadhaar?.name || "Resident"}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {aadhaar?.gender}
                    {aadhaar?.yob ? ` · Born ${aadhaar.yob}` : ""}
                  </p>
                </div>

                {(verify?.integrityOk !== null || verify?.signatureStatus !== "unverified") && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {verify.integrityOk === true && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-1">
                        <ShieldCheck size={12} /> Tamper check passed
                      </span>
                    )}
                    {verify?.signatureStatus === "verified" && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-1">
                        <ShieldCheck size={12} /> Digitally signed by UIDAI (current key)
                      </span>
                    )}
                    {verify?.signatureStatus === "unverified" && verify?.integrityOk !== false && (
                      <span
                        className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-2.5 py-1"
                        data-testid="signature-unverified-badge"
                      >
                        <ShieldAlert size={12} /> Details read — digital signature not yet confirmable (UIDAI key rotation)
                      </span>
                    )}
                    {verify?.signatureStatus === "invalid" && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-red-300 bg-red-500/10 border border-red-500/30 rounded-full px-2.5 py-1">
                        <ShieldAlert size={12} /> Signature did not match a current UIDAI key — treat with caution
                      </span>
                    )}
                    {verify?.integrityOk === false && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-red-300 bg-red-500/10 border border-red-500/30 rounded-full px-2.5 py-1">
                        <ShieldAlert size={12} /> Integrity hash not matched — treat with caution
                      </span>
                    )}
                    {verify?.integrityOk === null && verify?.signatureStatus !== "verified" && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-300 bg-slate-500/10 border border-slate-500/30 rounded-full px-2.5 py-1">
                        <ShieldAlert size={12} /> Legacy QR — no cryptographic check possible
                      </span>
                    )}
                  </div>
                )}

                {/* Identity summary card */}
                <div className="rounded-xl bg-slate-800/70 border border-slate-600 p-4 space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400">Aadhaar</span>
                    <span
                      className="font-mono font-bold text-slate-100 text-sm"
                      data-testid="decoded-last4"
                    >
                      {aadhaar?.last4 ? `XXXX XXXX ${aadhaar.last4}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400">Address</span>
                    <span className="text-[11px] text-slate-300 text-right max-w-[65%]" data-testid="decoded-address">
                      {[
                        aadhaar?.house, aadhaar?.street, aadhaar?.loc, aadhaar?.vtc,
                        aadhaar?.po, aadhaar?.dist, aadhaar?.state, aadhaar?.pc,
                      ].filter(Boolean).join(", ") || "Not available"}
                    </span>
                  </div>
                  {aadhaar?.referenceId && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400">Reference</span>
                      <span className="font-mono text-[11px] text-slate-300">{aadhaar.referenceId}</span>
                    </div>
                  )}
                </div>

                {/* Mobile number — required to complete registration */}
                <div className="rounded-xl bg-slate-800/70 border border-slate-600 p-4 space-y-2">
                  <label className="block text-[11px] uppercase tracking-wider text-slate-400">
                    Your mobile number <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-500 text-white text-center text-lg font-mono tracking-widest placeholder:text-slate-500 placeholder:text-sm focus:border-emerald-400 focus:outline-none transition"
                    data-testid="phone-input"
                  />
                  <p className="text-[10px] text-slate-400">
                    Used for your Gudalur Resident ID. The Aadhaar number itself stays on this device.
                  </p>
                </div>
                {error && (
                  <p className="text-red-400 text-xs font-bold text-center" data-testid="verified-error">
                    {error}
                  </p>
                )}

                <div className="flex gap-2 pt-1 mt-auto">
                  <button
                    type="button"
                    onClick={resetScan}
                    className="flex-1 py-3 rounded-xl border border-slate-500 bg-slate-800/60 text-slate-200 font-bold text-sm hover:border-amber-400 hover:text-amber-200 active:scale-[0.99] transition"
                  >
                    Scan Again
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRegister()}
                    disabled={!phoneOk}
                    className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition"
                    data-testid="complete-registration"
                  >
                    Complete Registration
                  </button>
                </div>
              </div>
            )}

            {/* Registering Stage */}
            {stage === "registering" && (
              <div className="text-center py-8 p-6">
                <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-300">Creating your GDR ID and registering…</p>
              </div>
            )}

            {/* Done Stage */}
            {stage === "done" && (
              <div className="text-center py-6 p-6">
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

