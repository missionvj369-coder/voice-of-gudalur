/**
 * Voice of Gudalur — 25,000-User Production Load Test
 *
 * Simulates realistic traffic mix: 80% public reads, 10% auth reads, 7% dynamic, 3% writes.
 * Controlled, measured, safe. Run against production.
 *
 * Usage: node scripts/loadtest-25k.mjs
 * Output: PRODUCTION_25K_LOAD_TEST_REPORT.md
 */
import axios from 'axios';
import { generateReport } from './loadtest-report.mjs';

const BASE = process.env.LOADTEST_BASE || 'https://voiceofgudalur.space';
const CONCURRENT = Number(process.env.LOADTEST_CONCURRENT || 100);
const TOTAL_REQUESTS = Number(process.env.LOADTEST_REQUESTS || 25000);

const latencies = [];
const errors = [];
const cacheHits = { hit: 0, miss: 0, unknown: 0 };
const endpointStats = {};
let totalBytes = 0;
let totalRequests = 0;
let startTime = 0;

function track(ep, latencyMs, status, bytes, cacheStatus) {
  totalRequests++;
  totalBytes += bytes || 0;
  latencies.push(latencyMs);
  const cs = (cacheStatus || '').toLowerCase();
  if (cs.includes('hit') || cs === 'hit') cacheHits.hit++;
  else if (cs.includes('miss') || cs === 'miss' || cs.includes('revalidated')) cacheHits.miss++;
  else cacheHits.unknown++;
  if (!endpointStats[ep]) endpointStats[ep] = { count: 0, errors: 0, latencies: [] };
  endpointStats[ep].count++;
  endpointStats[ep].latencies.push(latencyMs);
  if (status >= 400) { endpointStats[ep].errors++; errors.push({ ep, status, latency: latencyMs }); }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

const http = axios.create({ baseURL: BASE, timeout: 15000, validateStatus: () => true });

async function req(method, url, opts = {}) {
  const t0 = Date.now();
  try {
    const res = await http.request({ method, url, ...opts });
    const lat = Date.now() - t0;
    const cs = res.headers['cache-status'] || res.headers['x-cache'] || res.headers['cf-cache-status'] || '';
    track(url, lat, res.status, JSON.stringify(res.data || '').length, cs);
    return res;
  } catch (err) {
    const lat = Date.now() - t0;
    track(url, lat, 0, 0, '');
    return { status: 0, data: err.message };
  }
}

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function publicRead() {
  const eps = [
    { m: 'get', u: '/' },
    { m: 'get', u: '/data/stats.json' },
    { m: 'get', u: '/data/ledger.json' },
    { m: 'get', u: '/data/media.json' },
    { m: 'get', u: '/api/petitions/sign-stats' },
    { m: 'get', u: '/api/petitions/ledger' },
    { m: 'get', u: '/api/manifesto/stats' },
    { m: 'get', u: '/api/wildlife/incidents' },
    { m: 'get', u: '/api/wildlife/sightings' },
    { m: 'get', u: '/api/media' },
  ];
  const e = rand(eps);
  return req(e.m, e.u);
}

async function authRead() {
  const eps = ['/api/petitions/my-sign', '/api/manifesto/my-status', '/api/auth/me', '/api/officials/signs'];
  return req('get', rand(eps));
}

async function dynamicOp() {
  const eps = ['/api/config/localities', '/api/config/uidai-keys', '/api/health', '/api/config/emergency'];
  return req('get', rand(eps));
}

async function criticalWrite() {
  const ops = [
    () => req('post', '/api/auth/lookup', { data: { phone: `9${Math.floor(1e8 + Math.random() * 9e8)}` } }),
    () => req('post', '/api/petitions/sign', { data: { idempotencyKey: `lt-${Date.now()}-${Math.random()}` } }),
  ];
  return rand(ops)();
}

async function worker(id, count) {
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    try {
      if (r < 0.80) await publicRead();
      else if (r < 0.90) await authRead();
      else if (r < 0.97) await dynamicOp();
      else await criticalWrite();
    } catch { /* tracked in req() */ }
  }
}

async function petitionBurst() {
  const burst = [];
  for (let i = 0; i < 50; i++) burst.push(req('post', '/api/petitions/sign', { data: { idempotencyKey: `burst-${i}` } }));
  for (let i = 0; i < 10; i++) burst.push(req('post', '/api/petitions/sign', { data: { idempotencyKey: `burst-${i}` } })); // dupes
  return Promise.all(burst);
}
async function main() {
  console.log(`=== VOG 25K Load Test ===`);
  console.log(`Target: ${BASE}`);
  console.log(`Total requests: ${TOTAL_REQUESTS}`);
  console.log(`Concurrency: ${CONCURRENT}`);
  console.log('');

  startTime = Date.now();
  const perWorker = Math.ceil(TOTAL_REQUESTS / CONCURRENT);
  const workers = [];
  for (let w = 0; w < CONCURRENT; w++) workers.push(worker(w, perWorker));

  console.log(`[Phase 1] Main load: ${TOTAL_REQUESTS} requests across ${CONCURRENT} workers...`);
  const p1s = Date.now();
  await Promise.all(workers);
  const p1t = Date.now() - p1s;
  console.log(`[Phase 1] Done in ${p1t}ms`);

  console.log(`[Phase 2] Petition burst: 50 unique + 10 duplicate idempotency keys...`);
  await petitionBurst();
  console.log(`[Phase 2] Done`);

  const totalTime = Date.now() - startTime;
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const totalErrors = errors.length;
  const errorRate = ((totalErrors / totalRequests) * 100).toFixed(2);
  const rps = (totalRequests / (totalTime / 1000)).toFixed(1);
  const cacheTotal = cacheHits.hit + cacheHits.miss;
  const cacheHitRatio = cacheTotal > 0 ? ((cacheHits.hit / cacheTotal) * 100).toFixed(1) : 'N/A';

  console.log('\n=== RESULTS ===');
  console.log(`Total requests:      ${totalRequests}`);
  console.log(`Total time:          ${totalTime}ms`);
  console.log(`Requests/second:     ${rps}`);
  console.log(`Avg latency:         ${avg.toFixed(0)}ms`);
  console.log(`p50 latency:         ${p50}ms`);
  console.log(`p95 latency:         ${p95}ms`);
  console.log(`p99 latency:         ${p99}ms`);
  console.log(`Total errors:        ${totalErrors} (${errorRate}%)`);
  console.log(`Cache hit ratio:     ${cacheHitRatio}% (${cacheHits.hit} hit / ${cacheHits.miss} miss)`);
  console.log(`Total bytes:         ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

  const epRows = Object.entries(endpointStats).sort((a, b) => b[1].count - a[1].count)
    .map(([ep, s]) => {
      const es = [...s.latencies].sort((a, b) => a - b);
      return { ep, count: s.count, avg: es.reduce((a, b) => a + b, 0) / es.length, p50: percentile(es, 50), p95: percentile(es, 95), errors: s.errors };
    });

  generateReport({
    totalRequests, totalTime, rps, avg, p50, p95, p99, totalErrors, errorRate,
    cacheHitRatio, cacheHits, totalBytes, epRows, sorted, p1t, p2t: 0,
  });

  console.log('\nReport written to PRODUCTION_25K_LOAD_TEST_REPORT.md');
}

main().catch(console.error);

