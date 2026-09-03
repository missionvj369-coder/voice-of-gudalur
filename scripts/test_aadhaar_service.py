"""
Regression + integration test for the Aadhaar verification micro-service
(server/aadhaar_service.py). Fully offline — no real PII, no network.

Checks:
  1. The bundled Verhoeff tables match the canonical UIDAI tables and that
     canonical check digits validate (catches silently corrupted tables).
  2. End-to-end `number` mode through the real service protocol.
  3. End-to-end `qr` mode with a SYNTHETIC 2022 “V2” e-Aadhaar QR — the
     format current cards actually use (0xFF-delimited fields, gzip
     compressed) and the one pyaadhaar ≥1.2 parses. The RSA signature is
     zeros — structural decode never verifies signatures.

Run:  python scripts/test_aadhaar_service.py   (exit code 0 = all passed)
"""
import gzip
import json
import subprocess
import sys
from pathlib import Path

# Windows consoles/redirects default to cp1252; the output uses typographic
# characters (→, —) that cp1252 cannot encode. Force UTF-8 so the suite is
# reproducible in CI and redirected pipelines.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
SERVICE = ROOT / "server" / "aadhaar_service.py"
sys.path.insert(0, str(SERVICE.parent))

import aadhaar_service  # noqa: E402

# ── Canonical Verhoeff tables (UIDAI / Wikipedia) ──────────────────────────
CANONICAL_D = [
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
CANONICAL_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]
CANONICAL_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]


def canonical_check_digit(prefix: str) -> str:
    """UIDAI Verhoeff generation: prefix digits run through permutations
    P[1..8] (the final check digit itself consumes P[0], the identity,
    during validation — so generation is shifted by one)."""
    c = 0
    for i, ch in enumerate(reversed(prefix)):
        c = CANONICAL_D[c][CANONICAL_P[(i + 1) % 8][int(ch)]]
    return str(CANONICAL_INV[c])


def run_service(req: dict) -> dict:
    proc = subprocess.run(
        [sys.executable, str(SERVICE)],
        input=json.dumps(req),
        capture_output=True,
        text=True,
        timeout=60,
    )
    line = proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else ""
    if not line:
        raise AssertionError(f"service produced no output (stderr: {proc.stderr[:300]})")
    return json.loads(line)



# Field order of the 2022 “V2” format — matches pyaadhaar's details list:
# version, email_mobile_status, referenceid, name, dob, gender, careof,
# district, landmark, house, location, pincode, postoffice, state, street,
# subdistrict, vtc, last_4_digits_mobile_no — each followed by a 0xFF byte.
V2_FIELDS = [
    "V2", "0", "1234",
    "Gudalur Test", "01/01/1990", "M", "S/O Parent",
    "Nilgiris", "Landmark", "12 Test Street", "Locality", "643212",
    "Gudalur PO", "Tamil Nadu", "Gudalur", "Gudalur", "Gudalur", "6789",
]


def build_secure_qr(fields: list | None = None) -> str:
    """2022 “V2” e-Aadhaar QR → decimal string (0xFF-delimited, gzip)."""
    parts = fields if fields is not None else V2_FIELDS
    blob = b"".join(p.encode("latin-1") + bytes([255]) for p in parts)
    blob += bytes(64)    # embedded photo placeholder
    blob += bytes(256)   # (zeroed) RSA signature — decode never checks it
    return str(int.from_bytes(gzip.compress(blob), "big"))


def main() -> int:
    failures = []

    # 1 ── Verhoeff table integrity ─────────────────────────────────────────
    # Structural properties of the canonical tables (catch any corruption
    # independently of formulas): rows are permutations of 0..9, P[0] is the
    # identity, and D[c][INV[c]] == 0 for every c.
    for label, got, want in (
        ("VERHOEFF_D", aadhaar_service.VERHOEFF_D, CANONICAL_D),
        ("VERHOEFF_P", aadhaar_service.VERHOEFF_P, CANONICAL_P),
        ("VERHOEFF_INV", aadhaar_service.VERHOEFF_INV, CANONICAL_INV),
    ):
        if got != want:
            bad = [i for i, (a, b) in enumerate(zip(got, want)) if a != b]
            failures.append(f"{label} does not match canonical table (bad rows: {bad})")
        else:
            print(f"[ok] {label} matches canonical UIDAI table")

    for c in range(10):
        if CANONICAL_D[c][CANONICAL_INV[c]] != 0:
            failures.append(f"canonical property broken: D[{c}][INV[{c}]] != 0")
    if CANONICAL_P[0] != list(range(10)):
        failures.append("canonical property broken: P[0] is not the identity")

    # Known-good anchor from the canonical algorithm: check digit of 236 is 3.
    if canonical_check_digit("236") == "3":
        print("[ok] canonical_check_digit('236') == '3' (reference vector)")
    else:
        failures.append(f"canonical_check_digit('236') != 3 (got {canonical_check_digit('236')})")

    valid_number = "23412341234" + canonical_check_digit("23412341234")
    # Uniqueness: exactly one digit may complete the prefix to a valid number.
    passing = [d for d in "0123456789" if aadhaar_service.verhoeff_valid("23412341234" + d)]
    if len(passing) == 1 and passing[0] == valid_number[-1]:
        print(f"[ok] brute-force check digit agrees: {valid_number}")
    else:
        failures.append(f"brute-force check digits {passing} disagree with {valid_number}")
    bad_number = valid_number[:-1] + ("0" if valid_number[-1] != "0" else "1")
    if aadhaar_service.verhoeff_valid(valid_number):
        print(f"[ok] verhoeff_valid accepts canonical valid number {valid_number}")
    else:
        failures.append(f"verhoeff_valid rejects canonical valid number {valid_number}")
    if not aadhaar_service.verhoeff_valid(bad_number):
        print(f"[ok] verhoeff_valid rejects corrupted number {bad_number}")
    else:
        failures.append(f"verhoeff_valid accepts corrupted number {bad_number}")

    # 2 ── number mode e2e ──────────────────────────────────────────────────
    resp = run_service({"mode": "number", "payload": valid_number})
    ok = resp.get("verified") is True and resp.get("last4") == valid_number[-4:]
    print(f"[{'ok' if ok else 'FAIL'}] number mode → {json.dumps(resp)[:160]}")
    if not ok:
        failures.append(f"number mode failed: {resp}")
    resp = run_service({"mode": "number", "payload": bad_number})
    ok = resp.get("verified") is False
    print(f"[{'ok' if ok else 'FAIL'}] number mode (bad) → {json.dumps(resp)[:160]}")
    if not ok:
        failures.append(f"number mode accepted a bad number: {resp}")

    # 3 ── qr mode e2e (synthetic secure QR) ────────────────────────────────
    payload = build_secure_qr()
    resp = run_service({"mode": "qr", "payload": payload})
    print(f"[info] qr mode full response → {json.dumps(resp)}")
    ok = resp.get("verified") is True and resp.get("name") == "Gudalur Test"
    print(f"[{'ok' if ok else 'FAIL'}] qr mode verified={resp.get('verified')} name={resp.get('name')}")
    if not ok:
        failures.append(f"qr mode failed: {resp}")
    ok = resp.get("last4") == "1234"
    print(f"[{'ok' if ok else 'FAIL'}] qr mode last4={resp.get('last4')} (expected 1234)")
    if not ok:
        failures.append(f"qr mode last4 wrong: {resp}")

    print("-" * 60)
    if failures:
        for f in failures:
            print(f"FAIL: {f}")
        return 1
    print("ALL AADHAAR SERVICE TESTS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
