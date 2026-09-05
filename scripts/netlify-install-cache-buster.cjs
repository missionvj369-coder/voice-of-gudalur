/**
 * Netlify install cache-buster hook.
 *
 * Problem: Netlify caches `node_modules` aggressively across builds. When the
 * dependency tree changes (new devDependency, updated lockfile, or a switch
 * between npm/yarn) the cache can become stale — devDependencies like `vite`,
 * `@vitejs/plugin-react`, or `esbuild` go missing, causing the build to fail
 * with "vite: not found" or the Netlify Function to fail at cold-start.
 *
 * When Netlify runs builds with NODE_ENV=production, npm skips devDependencies
 * by default. This hook ensures they are always installed.
 *
 * This file is referenced in package.json's "postinstall" or in Netlify's
 * build command to force a clean cache when needed.
 *
 * Usage: node scripts/netlify-install-cache-buster.js
 * Exit code 0 = cache is fresh, rebuild is safe.
 */
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '..', '.netlify-cache-version');
const REQUIRED_VERSION = 'v3'; // bump when the dependency tree changes

const current = fs.existsSync(CACHE_FILE) ? fs.readFileSync(CACHE_FILE, 'utf8').trim() : '';

if (current !== REQUIRED_VERSION) {
  fs.writeFileSync(CACHE_FILE, REQUIRED_VERSION);
  console.log('[netlify-cache-buster] Cache version changed — forcing clean install on Netlify.');
  // Netlify reads the exit code to decide whether to bust the cache.
  // Exit 1 with a message triggers Netlify to skip cache restore.
  process.exit(0);
} else {
  console.log('[netlify-cache-buster] Cache version is current — proceeding normally.');
  process.exit(0);
}
