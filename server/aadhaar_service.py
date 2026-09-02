"""
Aadhaar verification micro-service for VOICE OF GUDALUR.

Uses the open-source `pyaadhaar` library (MIT) to decode, fully OFFLINE:
  - Aadhaar Secure QR codes (new e-Aadhaar paper/PDF QR)
  - Aadhaar Old QR codes

Protocol: reads ONE JSON request from stdin, prints ONE JSON response to stdout.

  Request : {"mode": "qr",     "payload": "<raw string captured from the Aadhaar QR>"}
            {"mode": "number", "payload": "<12-digit Aadhaar number>"}

  Response (QR, verified) : {"verified": true, "method": "qr", "name": "...", "dob": "...",
                             "gender": "...", "last4": "3456", "referenceid": "...",
                             "address": "...", "mobile_linked": true}
  Response (number)       : {"verified": true, "method": "number", "last4": "3456",
                             "checksum_valid": true}
  Response (failure)      : {"verified": false, "error": "..."}

PRIVACY CONTRACT: the full Aadhaar number is NEVER echoed back, never logged and never
persisted. Only the last 4 digits and the UIDAI reference id are returned.
"""
import sys
import json
import re

VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]
VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]


def verhoeff_valid(number: str) -> bool:
    """Official UIDAI Verhoeff checksum used by every Aadhaar number."""
    c = 0
    for i, ch in enumerate(reversed(number)):
        c = VERHOEFF_D[c][VERHOEFF_P[i % 8][int(ch)]]
    return VERHOEFF_INV[c] == 0


def respond(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))
    sys.stdout.flush()


def verify_number(raw: str) -> None:
    digits = re.sub(r"\D", "", raw)
    if len(digits) != 12:
        respond({"verified": False, "error": "Aadhaar number must be exactly 12 digits."})
        return
    if digits[0] == "0":
        respond({"verified": False, "error": "Aadhaar numbers cannot start with 0."})
        return
    if not verhoeff_valid(digits):
        respond({"verified": False, "error": "Invalid Aadhaar number — failed the UIDAI Verhoeff checksum."})
        return
    respond({"verified": True, "method": "number", "last4": digits[-4:], "checksum_valid": True})


def verify_qr(raw: str) -> None:
    data = re.sub(r"\s+", "", raw)
    if not data:
        respond({"verified": False, "error": "Empty QR payload."})
        return
    try:
        from pyaadhaar.decode import AadhaarSecureQr, AadhaarOldQr

        decoded = None
        source = None
        try:
            # pyaadhaar's Secure-QR constructor needs the payload as an INT
            # (it calls .to_bytes() internally); passing a str always fails.
            obj = AadhaarSecureQr(int(data))
            decoded = obj.decodeddata()
            source = "secure-qr"
        except (ValueError, TypeError):
            # Not a numeric payload — can only be the old XML-format QR.
            try:
                obj = AadhaarOldQr(data)
                decoded = obj.decodeddata()
                source = "old-qr"
            except Exception as inner:
                respond({"verified": False,
                         "error": "Not a decodable Aadhaar QR. Scan the Secure QR printed on e-Aadhaar.",
                         "detail": str(inner)[:200]})
                return
        except Exception:
            try:
                obj = AadhaarOldQr(data)
                decoded = obj.decodeddata()
                source = "old-qr"
            except Exception as inner:
                respond({"verified": False,
                         "error": "Not a decodable Aadhaar QR. Scan the Secure QR printed on e-Aadhaar.",
                         "detail": str(inner)[:200]})
                return

        if not isinstance(decoded, dict) or not decoded:
            respond({"verified": False, "error": "QR decoded but contained no Aadhaar fields."})
            return

        # Masked identity — last 4 digits only, never the full number.
        # pyaadhaar uses "aadhaar_*" spelling; older data may use "adhaar_*".
        last4 = (
            decoded.get("aadhaar_last_4_digit")
            or decoded.get("adhaar_last_4_digit")
            or decoded.get("aadhaar_last_digit")
            or decoded.get("adhaar_last_digit")
        )
        if not last4 and decoded.get("uid"):
            last4 = str(decoded["uid"])[-4:]
        if not last4:
            respond({"verified": False, "error": "Could not extract the Aadhaar reference from this QR."})
            return

        address_parts = [
            decoded.get("careof"), decoded.get("house"), decoded.get("street"),
            decoded.get("landmark"), decoded.get("location"), decoded.get("vtc"),
            decoded.get("postoffice"), decoded.get("subdistrict"),
            decoded.get("district"), decoded.get("state"),
        ]
        address = ", ".join([str(p).strip() for p in address_parts if p and str(p).strip() not in ("-", "")])
        pincode = decoded.get("pincode") or decoded.get("pc")
        if pincode:
            address = f"{address} - {pincode}" if address else str(pincode)

        status = decoded.get("email_mobile_status")
        respond({
            "verified": True,
            "method": "qr",
            "qr_type": source,
            "name": decoded.get("name"),
            "dob": decoded.get("dob") or decoded.get("yob"),
            "gender": decoded.get("gender"),
            "last4": str(last4),
            "referenceid": decoded.get("referenceid"),
            "address": address or None,
            "mobile_linked": status in ("2", "3") if status is not None else None,
        })
    except ImportError as ie:
        respond({"verified": False,
                 "error": "pyaadhaar is not installed on the server. Run: pip install pyaadhaar",
                 "detail": str(ie)})
    except Exception as e:
        respond({"verified": False, "error": "Aadhaar decode failed.", "detail": str(e)[:200]})


def main() -> None:
    try:
        raw = sys.stdin.read() or ""
        req = json.loads(raw) if raw.strip() else {}
    except Exception:
        respond({"verified": False, "error": "Malformed request to Aadhaar service."})
        return

    mode = req.get("mode", "qr")
    payload = str(req.get("payload") or "").strip()
    if not payload:
        respond({"verified": False, "error": "No Aadhaar QR data or number supplied."})
        return
    if mode == "number":
        verify_number(payload)
    else:
        verify_qr(payload)


if __name__ == "__main__":
    main()
