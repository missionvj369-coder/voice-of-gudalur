/**
 * Local verification of the Netlify Function handler (netlify/functions/api.ts).
 * Simulates Netlify Functions v1 (API Gateway-style) events and asserts real
 * responses from the Express backend + CockroachDB (read-only calls only).
 * Run: npx tsx scripts/test-lambda-handler.ts
 */
import { handler } from '../netlify/functions/api';

function makeEvent(method: string, path: string, body?: unknown) {
  return {
    httpMethod: method,
    path,
    headers: { 'content-type': 'application/json', 'user-agent': 'lambda-test', host: 'localhost' },
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    body: body === undefined ? null : JSON.stringify(body),
    isBase64Encoded: false,
    requestContext: { http: { method, path }, protocol: 'HTTP/1.1' },
  } as any;
}

async function call(method: string, path: string, body?: unknown) {
  const res: any = await handler(makeEvent(method, path, body), {} as any);
  let parsed: any = null;
  try { parsed = JSON.parse(res.body); } catch { /* non-JSON body */ }
  return { status: res.statusCode, parsed, raw: String(res.body ?? '').slice(0, 120) };
}

async function main() {
  let failures = 0;

  // 1. Health via the original path shape.
  const health = await call('GET', '/api/health');
  console.log('GET /api/health ->', health.status, health.raw);
  if (health.status !== 200 || health.parsed?.status !== 'ok') failures++;

  // 2. Health via the function-scoped path shape (Netlify rewrites may deliver either).
  const health2 = await call('GET', '/.netlify/functions/api/health');
  console.log('GET /.netlify/functions/api/health ->', health2.status, health2.raw);
  if (health2.status !== 200 || health2.parsed?.status !== 'ok') failures++;

  // 3. Public config (proves a real CockroachDB round-trip through the handler).
  const localities = await call('GET', '/api/config/localities');
  console.log('GET /api/config/localities ->', localities.status,
    'localities:', Array.isArray(localities.parsed?.localities) ? localities.parsed.localities.length : typeof localities.parsed?.localities);
  if (localities.status !== 200 || !localities.parsed || !('localities' in localities.parsed)) failures++;

  // 4. Live petition stats endpoint.
  const stats = await call('GET', '/api/petitions/sign-stats');
  console.log('GET /api/petitions/sign-stats ->', stats.status, stats.raw);
  if (stats.status !== 200 || typeof stats.parsed?.total !== 'number') failures++;

  // 5. POST with a JSON body (proves body parsing + DB query path; unknown phone -> 404).
  const lookup = await call('POST', '/api/auth/lookup', { phone: '0000000000' });
  console.log('POST /api/auth/lookup ->', lookup.status, lookup.raw);
  if (lookup.status !== 404) failures++;

  console.log(failures === 0 ? '\nALL HANDLER TESTS PASSED' : `\n${failures} HANDLER TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
