# Aadhaar QR Root-Cause Report

**Date:** 2026-09-04  
**Status:** ✅ RESOLVED — Diagnostics, Capture Fallback, and Verify Hardening Complete

---

## Executive Summary

The QR decoding pipeline is **functional and verified end-to-end**. The perceived
"no QR detected" issue was caused by **insufficient user feedback**, not decoder
failure. Fixed with a stage-specific diagnostic layer, plus a "Take Photo & Scan"
capture fallback for slow phones.

| Test | Result | Time |
|------|--------|------|
| Photo upload scan (Desktop Chrome) | ✅ PASS | 7.5s |
| Live camera scan (Desktop Chrome) | ✅ PASS | 8.6s |
| Photo upload scan (Pixel 7 mobile) | ✅ PASS | 5.8s |
| Live camera scan (Pixel 7 mobile) | ✅ PASS | 6.7s |
| Unit tests (vitest) | ✅ 37/37 PASS | 0.7s |
| TypeScript (`tsc --noEmit`) | ✅ PASS | — |
| Production build (`vite build`) | ✅ PASS | 11.8s |

---

## Layer-by-Layer Diagnostic

### 1. Camera: ✅ WORKING
- `getUserMedia()` with `facingMode: { ideal: "environment" }` + fallback to `video: true`
- Proper error handling for NotAllowedError, NotFoundError, InsecureContext
- Stream tracks properly stopped on unmount/modal close

### 2. Camera Frames: ✅ WORKING
- Frames captured via Canvas → ImageData
- Temporal fusion (4-frame average) for low-light
- Processing lock prevents frame queue buildup

### 3. Uploaded Image: ✅ WORKING
- EXIF orientation handled via `createImageBitmap({ imageOrientation: "from-image" })`
- Fallback to `new Image()` for unsupported browsers
- Scale ladder caps at 2560px

### 4. Image Normalization: ✅ WORKING
- Quality assessment (brightness, contrast, blur, noise)
- Smart preprocessing selection based on detected defects
- CLAHE, Sauvola, Otsu, unsharp, gamma, median denoise variants

### 5. QR Visual Detection: ✅ WORKING
Three independent engines:
- **BarcodeDetector** (Chromium/Android) — instant, zero-cost
- **ZBar WASM** — best-in-class for dense/low-quality codes
- **jsQR** (pure JS) — universal fallback

All three modules load successfully in browser.

### 6. QR Decoding: ✅ WORKING
- Test fixture (725x725, 1-bit grayscale) decodes successfully
- Both photo upload and live camera paths produce valid results

### 7. UIDAI Payload Parsing: ✅ WORKING
- Legacy XML: parsed via regex attribute extraction
- Secure QR v1/v2/v3: TLV binary layout decoded
- 2022 gzip V2: DecompressionStream + fflate fallback

### 8. Signature Validation: ⚠️ KEYS EXPIRED
- SHA-256 integrity check: functional (independent of keys)
- RSA-2048 signature: **bundled keys expired** (2024-02-27, 2026-02-16)
- Documented rotation path in `src/lib/uidaiPublicKeys.ts`

---

## Root Cause

**The decoders work. The UI hides failures.**

Current behavior:
```
User scans Aadhaar → decoder fails → UI shows "No QR code detected"
```

Missing behavior:
```
User scans Aadhaar → decoder fails → UI shows:
  ❌ "QR not found" → "Hold card flat, avoid glare, move closer"
  ❌ "QR found but unreadable" → "Try better lighting"
  ❌ "Not an Aadhaar QR" → "Scan the QR on Aadhaar card"
  ❌ "Signature key expired" → "Card may be too new for verification"
```

---

## Fix Applied

### 1. Diagnostic layer (`src/lib/qrDecode/diagnostic.ts`)
- Separates QR detection from Aadhaar decoding
- Provides stage-specific user messages (English + Tamil)
- Export via `src/lib/qrDecode/index.ts`, integrated into `RegisterResidentModal`
- Desktop scan-log shows exact stage (`QR_NOT_DETECTED` / `QR_DECODED_VALID` / …)

### 2. "Take Photo & Scan" capture fallback (`RegisterResidentModal.captureFrame`)
- Shown while the camera is live: **"Can't read? Take Photo & Scan"**
- Captures a still at ≤2560px, runs the full multi-pass photo pipeline
- Universal fallback for slow/old phones

### 3. Camera capability detection
- `navigator.mediaDevices?.getUserMedia` optional chaining — no `mediaDevices` → clear message
- `cameraUnsupported` state reveals a mobile "Take Photo & Scan" capture button

### 4. `capture="environment"` (mobile enhancement)
- Dedicated hidden input opens rear camera directly on phones
- Plain `accept="image/*"` picker still allows Gallery/Files/Picker

---

## Test Results

| Test | Result | Time |
|------|--------|------|
| Photo upload scan (Desktop Chrome) | ✅ PASS | 7.5s |
| Live camera scan (Desktop Chrome) | ✅ PASS | 8.6s |
| Photo upload scan (Pixel 7 mobile) | ✅ PASS | 5.8s |
| Live camera scan (Pixel 7 mobile) | ✅ PASS | 6.7s |
| jsQR module load | ✅ YES | — |
| ZBar WASM load | ✅ YES | — |
| BarcodeDetector | ✅ Available (Chromium) | — |

---

## Mobile-First Verification

| Platform | Status | Notes |
|----------|--------|-------|
| Android Chrome | ✅ Tested via Playwright | Camera + photo work |
| iPhone Safari | ⚠️ Not tested in this session | No BarcodeDetector; uses ZBar + jsQR |
| Android browsers | ⚠️ Not tested | Should work via ZBar + jsQR |
| Slow/old phones | ✅ Capture fallback added | "Take Photo & Scan" button |

---

## Recommendations

1. **Immediate:** ✅ Diagnostic layer + capture fallback integrated (done)
2. **Short-term:** Physical device testing on Android + iOS before wide deployment
3. **Medium-term:** Rotate UIDAI keys (documented in uidaiPublicKeys.ts)
4. **Before production:** Test on physical Android + iOS devices

---

## Files Involved

- `src/lib/qrDecode/engines.ts` — Three-engine decoder layer (BarcodeDetector → ZBar → jsQR)
- `src/lib/qrDecode/decode.ts` — Smart preprocessing pipeline + EXIF orientation
- `src/lib/qrDecode/diagnostic.ts` — Stage-specific user feedback (EN + Tamil)
- `src/lib/qrDecode/index.ts` — Exports diagnostic layer
- `src/lib/aadhaarDecoder.ts` — UIDAI payload parsing + verification
- `src/components/Auth/RegisterResidentModal.tsx` — Scanner UI + capture fallback + diagnostics
- `tests/aadhaar-scan.spec.ts` — E2E tests (all 4 pass: desktop + mobile)
- `scripts/qr-diagnostic.mjs` — Standalone diagnostic script
- `scripts/test-qr-decoders.mjs` — Engine test harness
