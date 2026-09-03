"""
Generate a REAL PNG QR code of a synthetic 2022 "V2" Aadhaar Secure QR payload
(the exact 0xFF-delimited + gzip + decimal layout the frontend
`decodeAadhaarAsync` parses and the backend pyaadhaar service parses).

Usage:  python scripts/make_test_qr.py  -> writes tests/fixtures/aadhaar_secure_qr.png

The fixture lets Playwright exercise the real browser pipeline:
  photo scan (upload through #qr-file-input) and live-camera scan
  (canvas.captureStream() fed through getUserMedia) -> BarcodeDetector /
  ZBar-wasm / jsQR -> decodeAadhaarAsync -> decoded fields on screen.

No real PII: the payload is synthetic test data ("Gudalur Test" resident).
Requires the dev-only `segno` package (pure-python QR encoder): pip install segno
"""
import gzip
import pathlib
import random

import segno

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "tests" / "fixtures"
OUT.mkdir(parents=True, exist_ok=True)


def build_secure_qr(fields, photo_bytes: int = 1500) -> str:
    """2022 V2 layout: 0xFF-delimited fields -> photo -> sig -> gzip -> decimal.

    The photo placeholder is real entropy (like the ~3-5 KB JPEG real cards
    embed), so the gzip stream stays large and the QR lands in the same
    Version-30+ density range as an actual Aadhaar secure QR.
    """
    rng = random.Random(20240817)  # deterministic fixture across runs
    blob = b"".join(p.encode("latin-1") + bytes([255]) for p in fields)
    blob += bytes(rng.randrange(256) for _ in range(photo_bytes))
    blob += bytes(256)  # RSA signature placeholder (zeros — structural decode)
    gz = gzip.compress(blob, compresslevel=9)
    return str(int.from_bytes(gz, "big"))


V2_FIELDS = [
    "V2", "0", "1234",
    "Gudalur Test", "01/01/1990", "M", "S/O Parent",
    "Nilgiris", "Landmark", "12 Test Street", "Locality", "643212",
    "Gudalur PO", "Tamil Nadu", "Gudalur", "Gudalur", "Gudalur", "6789",
]


def main() -> int:
    payload = build_secure_qr(V2_FIELDS)
    print(f"payload digits: {len(payload)}")

    qr = segno.make(payload, error="l")
    out = OUT / "aadhaar_secure_qr.png"
    qr.save(str(out), scale=5, border=4, dark="000000", light="ffffff")
    print(f"written: {out} (version {qr.version}, {qr.symbol_size()[0]}x{qr.symbol_size()[1]} modules)")

    # Sanity: decode the PNG back with pyzbar to prove the image is a valid QR.
    try:
        from PIL import Image
        from pyzbar.pyzbar import decode
        decoded = decode(Image.open(out))
        if not decoded:
            print("FAIL: pyzbar could not decode the generated PNG")
            return 1
        text = decoded[0].data.decode()
        if text != payload:
            print("FAIL: pyzbar payload mismatch")
            return 1
        print(f"[ok] pyzbar round-trip decodes the PNG ({len(text)} digits)")
    except Exception as exc:  # pragma: no cover
        print(f"WARN: pyzbar sanity skipped ({exc})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())