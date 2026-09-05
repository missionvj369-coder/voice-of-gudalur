/**
 * VOICE OF GUDALUR — API Netlify Function (Functions v1 event format).
 *
 * Wraps the Express app built by server.ts#createApp() with serverless-http so
 * the whole backend (auth, petitions, config, … + CockroachDB) runs on Netlify.
 * netlify.toml rewrites /api/* → /.netlify/functions/api.
 *
 * Depending on the rewrite shape, Netlify may deliver either the ORIGINAL
 * request path (/api/…) or the function-scoped path (/.netlify/functions/api/…);
 * the wrapper below normalizes both so Express always sees its /api/* routes.
 *
 * Required Netlify environment variables (Site configuration → Environment):
 *   DATABASE_URL, SESSION_SECRET, NODE_ENV=production, DATABASE_POOL_MAX=5,
 *   DATABASE_SSL (optional — encryption-only fallback without a CA file).
 */
import serverless from 'serverless-http';
import { createApp } from '../../server';

const FUNCTION_PREFIX = '/.netlify/functions/api';

let lambda: ReturnType<typeof serverless> | null = null;

export const handler = async (event: any, context: any) => {
  if (!lambda) {
    // Cold start: build the Express app once per lambda instance. If init
    // fails (bad bundle, missing env, DB config), answer with a JSON 503 that
    // NAMES the problem instead of an opaque HTML 502 the client cannot read.
    // A failed init is NOT cached — the next invocation retries.
    try {
      lambda = serverless(await createApp());
    } catch (e: any) {
      console.error('[api] function init failed:', e?.stack || e?.message || e);
      return {
        statusCode: 503,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: `API failed to initialize — ${e?.message || e}`,
          hint: 'Check Netlify function logs and environment variables (DATABASE_URL, SESSION_SECRET).',
        }),
      };
    }
  }
  const e = { ...event };
  const path: string = e.path || '';
  if (path.startsWith(FUNCTION_PREFIX)) {
    const suffix = path.slice(FUNCTION_PREFIX.length) || '/';
    e.path = suffix === '/' ? '/api' : `/api${suffix}`;
  }
  return lambda(e, context);
};

export default handler;
