/**
 * Refresh-snapshots — safely regenerates the public data snapshots.
 *
 * Netlify serverless functions run in a READ-ONLY filesystem, so the cron
 * cannot write dist/data/*.json at runtime. Instead this function triggers a
 * **Netlify Build Hook**, which runs `npm run build` (and thus the snapshot
 * exporter) and re-deploys the fresh snapshots to the CDN.
 *
 * Configure in Netlify: Build hooks → add one → put its URL in env as
 * SNAPSHOT_BUILD_HOOK_URL, then add a scheduled (cron) trigger calling this
 * function (e.g. every 15 minutes).
 *
 * SECURITY: never log the hook URL (it can trigger a deploy).
 */

// Netlify functions receive a `handler` export with `(event, context) =>
// response`. Typed inline (no @netlify/functions dep needed — matches the
// rest of this repo's functions).
function jsonResponse(statusCode: number, body: unknown) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export const handler = async () => {
  const hookUrl = process.env.SNAPSHOT_BUILD_HOOK_URL;
  if (!hookUrl) {
    return jsonResponse(200, { ok: false, reason: 'SNAPSHOT_BUILD_HOOK_URL not set' });
  }
  try {
    const res = await fetch(hookUrl, { method: 'POST' });
    if (!res.ok) throw new Error(`hook ${res.status}`);
    return jsonResponse(200, { ok: true });
  } catch (e: any) {
    return jsonResponse(500, { ok: false, error: String(e?.message || e) });
  }
};