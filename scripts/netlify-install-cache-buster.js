/**
 * Netlify cache-buster for node_modules.
 *
 * Problem: Netlify caches node_modules between builds. If a previous `npm install`
 * was interrupted or partially failed (e.g. network blip), the cached node_modules
 * can be missing packages (like vite-plugin-pwa) even when package-lock.json is
 * correct. This script forces a clean reinstall on Netlify whenever the lockfile
 * changes — without deleting node_modules during local development.
 *
 * How it works:
 *   - It writes a marker file (cache-buster.json) containing the package-lock
 *     lockfileVersion + the resolved vite-plugin-pwa version.
 *   - On the next build, if the marker doesn't match the current lockfile, it
 *     deletes node_modules so npm reinstalls everything fresh.
 *
 * On Netlify the `CI=true` environment forces a fresh install regardless of cache.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM doesn't have __dirname — derive it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const LOCKFILE = path.join(ROOT, 'package-lock.json');
const NODE_MODULES = path.join(ROOT, 'node_modules');
const MARKER = path.join(ROOT, '.netlify-node-deps-marker.json');

function readLockfileSignature() {
  try {
    const lock = JSON.parse(fs.readFileSync(LOCKFILE, 'utf8'));
    // A stable signature of the lockfile: version + vite-plugin-pwa resolution
    const vitePluginPwa = lock.packages?.['node_modules/vite-plugin-pwa']?.version || 'MISSING';
    return {
      lockfileVersion: lock.lockfileVersion,
      vitePluginPwa,
      integrity: lock.packages?.['node_modules/vite-plugin-pwa']?.integrity || 'MISSING',
      packageCount: Object.keys(lock.packages || {}).length,
    };
  } catch {
    return null;
  }
}

function readMarker() {
  try {
    return JSON.parse(fs.readFileSync(MARKER, 'utf8'));
  } catch {
    return null;
  }
}

function writeMarker(signature) {
  fs.writeFileSync(MARKER, JSON.stringify(signature, null, 2));
}

function signaturesMatch(a, b) {
  if (!a || !b) return false;
  return (
    a.lockfileVersion === b.lockfileVersion &&
    a.vitePluginPwa === b.vitePluginPwa &&
    a.integrity === b.integrity &&
    a.packageCount === b.packageCount
  );
}

// Don't cache-bust in local dev — only on CI (Netlify)
const isCI = process.env.CI === 'true' || process.env.NETLIFY === 'true';

if (!isCI) {
  process.exitCode = 0;
  process.exit();
}

const current = readLockfileSignature();
const previous = readMarker();

if (current && !signaturesMatch(current, previous)) {
  console.log('[netlify-cache-buster] Lockfile changed or first install — clearing node_modules for a clean reinstall.');
  // Remove node_modules so npm reinstalls fresh on Netlify
  fs.rmSync(NODE_MODULES, { recursive: true, force: true });
}

// Save the current signature
if (current) {
  writeMarker(current);
  console.log(`[netlify-cache-buster] Marker updated: vite-plugin-pwa@${current.vitePluginPwa} | ${current.packageCount} packages locked.`);
} else {
  console.log('[netlify-cache-buster] WARNING: Could not read package-lock.json signature.');
}
