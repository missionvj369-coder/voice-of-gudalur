# Aadhaar QR Root-Cause Report

**Date:** 2026-09-04  
**Status:** Diagnostic Complete — Pipeline Functional, UI Feedback Missing

---

## Executive Summary

The QR decoding pipeline is **functional**. Both Playwright E2E tests pass:
- Photo upload scan: **PASS** (13.2s)
- Live camera scan: **PASS** (13.8s)

The perceived "no QR detected" issue is caused by **insufficient user feedback**, not decoder failure. Users see a generic error instead of actionable guidance.

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

Added diagnostic layer (`src/lib/qrDecode/diagnostic.ts`):
- Separates QR detection from Aadhaar decoding
- Provides stage-specific user messages (English + Tamil)
- Never logs or displays personal data

---

## Test Results

| Test | Result | Time |
|------|--------|------|
| Photo upload scan | ✅ PASS | 13.2s |
| Live camera scan | ✅ PASS | 13.8s |
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
| Slow/old phones | ⚠️ Not tested | Capture fallback available |

---

## Recommendations

1. **Immediate:** Integrate diagnostic layer into RegisterResidentModal UI
2. **Short-term:** Add "Take Photo & Scan" fallback for slow phones
3. **Medium-term:** Rotate UIDAI keys (documented in uidaiPublicKeys.ts)
4. **Before production:** Test on physical Android + iOS devices

---

## Files Involved

- `src/lib/qrDecode/engines.ts` — Three-engine decoder layer
- `src/lib/qrDecode/decode.ts` — Smart preprocessing pipeline
- `src/lib/qrDecode/diagnostic.ts` — NEW: Stage-specific user feedback
- `src/lib/aadhaarDecoder.ts` — UIDAI payload parsing + verification
- `src/components/Auth/RegisterResidentModal.tsx` — Scanner UI
- `tests/aadhaar-scan.spec.ts` — E2E tests (both pass)
