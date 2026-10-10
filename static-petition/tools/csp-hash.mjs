// Independent check of the CSP hash for the one inline <script>.
// Reads the snippet straight out of each page, hashes it with Node's own
// crypto, and compares against the hash declared in _headers. Two separate
// implementations agreeing is the point: the hash in the CSP has to be exactly
// the bytes between <script> and </script>, or the browser drops the script and
// the .rv blocks stay hidden for ever.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = [
  'index.html',
  'grievances/18982473/index.html',
  'grievances/19177921/index.html',
].map((p) => path.join(root, p));

const hashOf = (s) => 'sha256-' + crypto.createHash('sha256').update(s, 'utf8').digest('base64');
const seen = new Map();
for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
  const m = html.match(/<script>(\(function\(\).*?\(\);)<\/script>/);
  if (!m) { console.error('FAIL no inline snippet in ' + p); process.exit(1); }
  const h = hashOf(m[1]);
  seen.set(h, (seen.get(h) || 0) + 1);
  console.log(h + '  ' + p.replace(root, ''));
}
if (seen.size !== 1) { console.error('FAIL the three pages differ'); process.exit(1); }
const h = [...seen.keys()][0];

const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
const want = "script-src 'self' '" + h + "'";
if (headers.includes(want)) {
  console.log('\nok  _headers pins ' + want);
} else {
  console.error('\nFAIL _headers does not contain:\n     ' + want);
  process.exit(1);
}

// Test the directive itself, not the prose above it: the explanatory comments
// legitimately contain the string 'unsafe-inline'.
const csp = (headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m) || [])[1] || '';
const scriptSrc = (csp.match(/script-src ([^;]+)/) || [])[1] || '';
console.log('     script-src is: ' + scriptSrc.trim());
if (scriptSrc.includes('unsafe-inline')) {
  console.error("FAIL script-src still allows 'unsafe-inline'");
  process.exit(1);
}
console.log("ok  script-src carries no 'unsafe-inline'");
if (!scriptSrc.includes("'" + h + "'")) {
  console.error('FAIL script-src does not carry the computed hash');
  process.exit(1);
}
console.log('ok  script-src carries the hash computed from the shipped HTML');
