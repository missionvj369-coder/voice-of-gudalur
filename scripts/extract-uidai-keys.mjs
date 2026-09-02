/**
 * Extract the UIDAI Offline PKI public keys (SPKI / base64 DER) from the
 * official UIDAI certificates so the browser can verify Aadhaar Secure QR
 * signatures with WebCrypto. Run:  node scripts/extract-uidai-keys.mjs
 *
 * Inputs (UIDAI "Offline Aadhaar Verification" published certs, also vendored
 * by the anon-aadhaar project):
 *   scripts/certs/uidai_offline_publickey_26022021.pem  (valid to 2024-02-27)
 *   scripts/certs/uidai_offline_publickey_17022026.pem  (valid to 2026-02-16)
 * UIDAI rotates keys periodically — drop newer .pem files into scripts/certs/.
 */
import { X509Certificate, createPublicKey } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const certDir = fileURLToPath(new URL('./certs/', import.meta.url));

for (const file of readdirSync(certDir).filter((f) => f.endsWith('.pem'))) {
  try {
    const pem = readFileSync(join(certDir, file), 'utf8');
    const cert = new X509Certificate(pem);
    const spki = cert.publicKey.export({ type: 'spki', format: 'der' });
    console.log(`\n=== ${file}`);
    console.log(`subject: ${cert.subject.replace(/[\n,]+/g, ' | ')}`);
    console.log(`valid:   ${cert.validFrom} -> ${cert.validTo}`);
    console.log(`SPKI base64:\n${spki.toString('base64')}`);
  } catch (e) {
    console.error(`ERROR ${file}:`, e?.message ?? e);
  }
}