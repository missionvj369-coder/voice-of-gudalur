/**
 * Voice of Gudalur — typed API client.
 *
 * Replaces the deleted Supabase facade (`src/lib/supabase.ts`) and sign
 * service (`src/lib/signService.ts`). The browser NEVER touches the database:
 * every call goes through the Express API, which performs authorization and
 * talks to CockroachDB server-side.
 *
 * Session model: httpOnly cookies set by the server (access + refresh + a
 * readable csrf_token used for the double-submit CSRF guard on mutations).
 */

export interface ApiError extends Error {
  error: string;
  status: number;
}

import { snapshotOrLive } from '../utils/snapshotFirst';

function csrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = csrfToken();
    if (token) headers['X-CSRF-Token'] = token;
  }
  const res = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // JSON.parse threw — the body is not JSON. Classic cause on Netlify: an
    // /api/* request with no backend route falls through to the SPA fallback
    // and returns index.html, surfacing as the cryptic "Unexpected token '<'"
    // / "unrecognized token" SyntaxError. Surface an actionable message instead.
    const isHtml = /^\s*<(!doctype|html)/i.test(text);
    const detail = isHtml
      ? 'the API backend is not routed on this host (got HTML instead of JSON — check the /api/* proxy redirect in netlify.toml AND that DATABASE_URL + SESSION_SECRET are set in Netlify env)'
      : `unrecognized response: ${text.slice(0, 100)}`;
    const msg = `Invalid server response — ${detail}`;
    const err = new Error(msg) as ApiError;
    err.error = msg;
    err.status = res.ok ? 502 : res.status;
    throw err;
  }
  if (!res.ok) {
    // Throw a REAL Error carrying the server's message — plain objects lost
    // .message and every server error surfaced as a generic UI toast.
    const msg = data?.error || `Request failed (${res.status})`;
    const err = new Error(msg) as ApiError;
    err.error = msg;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

// ─────────────────────────────────────────────────────────────
// Auth (resident + official)
// ─────────────────────────────────────────────────────────────

export interface AuthUser {
  uid: string;
  /** Legacy alias for components that still read `user.id` post-migration. */
  id?: string;
  phone?: string;
  gudalurId?: string;
  name?: string;
  role: string;
  verificationLevel?: string;
  localityName?: string;
  kind?: 'user' | 'official';
  email?: string;
  pincode?: string;
  localityId?: string;
  customPlaceName?: string;
}

export const authApi = {
  /** POST /api/auth/register — create a supporter (issues a Digital Supporter ID + session). */
  register: (input: {
    name: string; phone: string; localityId?: string; customPlaceName?: string;
    address?: string; localityName?: string; pincode?: string; email?: string; aadhaarNumber?: string; lat?: number; lng?: number;
  }) =>
    request<{ resident: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /** POST /api/auth/lookup — resolve a resident by phone OR Gudalur ID. */
  lookup: (input: { phone?: string; gudalurId?: string }) =>
    request<{ resident: AuthUser }>('/api/auth/lookup', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // ─── Admin ─────────────────────────────────────────────────────────

  /** POST /api/admin/login — admin login with GDR ID + password. */
  adminLogin: (input: { gudalurId: string; password: string }) =>
    request<{ user: AuthUser; csrfToken: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /** POST /api/admin/logout */
  adminLogout: () => request<{ ok: true }>('/api/admin/logout', { method: 'POST' }),

  /** GET /api/admin/officials — list all officials (admin only). */
  adminListOfficials: () =>
    request<{ officials: Array<{ id: number; email: string; name: string; phone: string; role: string; status: string; createdAt: string; approvedAt: string; addedBy: string; hasPassword: boolean; passwordSetAt: string }> }>('/api/admin/officials'),

  /** POST /api/admin/officials — add an official email (admin grants access). */
  adminAddOfficial: (input: { email: string; name: string }) =>
    request<{ message: string; email: string }>('/api/admin/officials', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /** POST /api/admin/officials/:id/approve — approve a pending official. */
  adminApproveOfficial: (id: number) =>
    request<{ approved: boolean }>(`/api/admin/officials/${id}/approve`, { method: 'POST' }),

  /** POST /api/admin/officials/:id/reject — reject and remove an official. */
  adminRejectOfficial: (id: number) =>
    request<{ rejected: boolean }>(`/api/admin/officials/${id}/reject`, { method: 'POST' }),

  /** POST /api/admin/officials/:id/reset-password — reset official's password. */
  adminResetOfficialPassword: (id: number) =>
    request<{ message: string; resetToken: string }>(`/api/admin/officials/${id}/reset-password`, { method: 'POST' }),

  /** GET /api/admin/audit — recent audit events. */
  adminAuditLog: () =>
    request<{ events: Array<{ id: string; actor_id: string; actor_kind: string; action: string; target: string; detail: string; ip: string; created_at: string }> }>('/api/admin/audit'),

  /** GET /api/admin/stats — total users + total petition signs + latest hash. */
  adminStats: () =>
    request<{ totalUsers: number; totalSigns: number; latestBatch: number; latestHash: string | null }>('/api/admin/stats'),

  /** GET /api/admin/signs — the full petition hash-ledger (downloadable & shareable). */
  adminSigns: () =>
    request<{
      signs: Array<{
        hash: string; name: string; village: string; phoneLast4: string | null;
        aadhaarLast4: string | null; batchNo: number; signedAt: string; verifyUrl: string;
      }>; total: number;
    }>('/api/admin/signs'),

  // ─── Official password login ───────────────────────────────────────

  /** POST /api/officials/login — login with email + password. */
  officialLogin: (input: { email: string; password: string }) =>
    request<{ user: AuthUser; csrfToken: string }>('/api/officials/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /** POST /api/officials/set-password — set password after approval. */
  officialSetPassword: (input: { email: string; password: string; resetToken?: string; oldPassword?: string }) =>
    request<{ message: string; user: AuthUser; csrfToken: string }>('/api/officials/set-password', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /** POST /api/officials/forgot-password — request password reset. */
  officialForgotPassword: (input: { email: string }) =>
    request<{ message: string; resetToken?: string }>('/api/officials/forgot-password', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /** POST /api/officials/reset-password — reset password with token. */
  officialResetPassword: (input: { email: string; resetToken: string; password: string }) =>
    request<{ message: string }>('/api/officials/reset-password', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

    /** PATCH /api/auth/me — update the authenticated resident's profile. */
  updateProfile: (input: Record<string, unknown>) =>
    request<{ user: AuthUser }>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  me: () => request<{ user: AuthUser | null }>('/api/auth/me'),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  refresh: () =>
    request<{ user: AuthUser; csrfToken: string }>('/api/auth/refresh', { method: 'POST' }),

  /** Official portal: request access, then OTP login. */
  officialRequest: (email: string, name: string, phone?: string) =>
    request<{ message: string }>('/api/officials/request', {
      method: 'POST',
      body: JSON.stringify({ email, name, phone }),
    }),
  officialOtp: (email: string) =>
    request<{ message: string; otp?: { id: string; code: string } }>('/api/officials/otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  officialVerify: (email: string, code: string) =>
    request<{ user: AuthUser }>('/api/officials/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
};

// ─────────────────────────────────────────────────────────────
// Petitions (Act for Gudalur)
// ─────────────────────────────────────────────────────────────

export interface PetitionSignResult {
  signHash: string;
  batchNo: number | null;
  verifyUrl?: string;
  isDuplicate: boolean;
  message: string;
  /** The authoritative signature time (their ORIGINAL sign time on a duplicate). */
  signedAt?: string;
}

export const petitionApi = {
  sign: (input: { address?: string; lat?: number; lng?: number; idempotencyKey?: string }) =>
    request<PetitionSignResult>('/api/petitions/sign', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  verify: (hash: string) =>
    request<{ signHash: string; fullName: string; village?: string; batchNo: number | null; signedAt: string; verified: boolean }>(
      `/api/petitions/verify/${encodeURIComponent(hash)}`,
    ),

  /** GET /api/petitions/sign-stats — CDN-snapshot first, live API fallback.
   *  The deploy-time snapshot is accepted as fresh for 24 hours (regenerated
   *  on every write + cron), so the crowd always sees the real count without
   *  a single DB hit. Shape mirrors the full dashboard stat set. */
  signStats: () =>
    snapshotOrLive<{
      total: number;
      validations?: number;
      communityReach?: number;
      external?: number;
      gudalur?: number;
      outsideGudalur?: number;
      places: Array<{ place: string; count: number }>;
      updatedAt?: string;
    }>(
      '/data/stats.json',
      () => request<{ total: number; places: Array<{ place: string; count: number }> }>('/api/petitions/sign-stats'),
      { acceptStaleMs: 24 * 60 * 60 * 1000 }, // 24h — deploy snapshots stay fresh for the deploy lifetime
    ),

  /** GET /api/petitions/ledger — CDN-snapshot first, live API fallback.
   *  (PUBLIC hash ledger, phone masked. Snapshot is refreshed on writes + cron.) */
  ledger: () =>
    snapshotOrLive<{
      total: number;
      signs: Array<{
        hash: string; name: string; village: string; phoneLast4: string | null;
        batchNo: number; signedAt: string; verifyUrl: string;
      }>;
    }>(
      '/data/ledger.json',
      () => request<{
        total: number;
        signs: Array<{
          hash: string; name: string; village: string; phoneLast4: string | null;
          batchNo: number; signedAt: string; verifyUrl: string;
        }>;
      }>('/api/petitions/ledger'),
      { acceptStaleMs: 30_000 },
    ),

  /** GET /api/petitions/my-sign — THIS resident's own petition signature (auth).
   *  Restores the accurate "already signed" UI after re-login / new device /
   *  cleared localStorage. Null means this resident has not signed. */
  mySign: () =>
    request<{
      sign: {
        signHash: string; fullName: string; village: string | null;
        batchNo: number; signedAt: string; verifyUrl: string;
      } | null;
    }>('/api/petitions/my-sign'),

  list: () =>
    request<{ petitions: Array<Record<string, unknown>> }>('/api/petitions/list'),

  support: (id: string, idempotencyKey?: string) =>
    request<{ supportCount: number; isDuplicate: boolean }>(`/api/petitions/${encodeURIComponent(id)}/support`, {
      method: 'POST',
      body: JSON.stringify({ idempotencyKey }),
    }),
};

// ─────────────────────────────────────────────────────────────
// PUBLIC Name+Mobile petition signing (petition-only launch).
// No account required. The server issues an anti-bot challenge and the
// DATABASE enforces one-signature-per-mobile (HMAC identity, never the raw
// number). POSTs need the global CSRF double-submit token, so callers
// bootstrap the csrf_token cookie via ensureCsrf() once before the sign.
// ─────────────────────────────────────────────────────────────

export interface PetitionChallenge {
  challenge: string;   // base64url payload {n,iat,exp}
  sig: string;         // HMAC signature over the payload
  exp: number;         // expiry (ms epoch)
}

export interface PetitionPublicSignResult {
  ok: boolean;
  isDuplicate: boolean;
  signHash: string;
  verifyUrl: string;
  batchNo: number;
  signedAt: string;    // ORIGINAL sign time (authoritative, server-issued)
  count: number;       // live public signature count after this write
  message: string;
}

/** GET /api/auth/csrf → sets the readable csrf_token cookie for mutations. */
async function ensureCsrf(): Promise<void> {
  try {
    await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  } catch { /* the sign POST will surface a proper CSRF error if it fails */ }
}

export const petitionPublicApi = {
  /** GET /api/petition/challenge — signed anti-bot challenge (single-use). */
  challenge: () => request<PetitionChallenge>('/api/petition/challenge'),

  /** GET /api/petition/count — live authoritative count (6s server TTL). */
  count: () => request<{ count: number }>('/api/petition/count'),

  /** GET /api/petition/check?mobile=… — UX-only "already signed?" pre-check. */
  check: (mobile: string) =>
    request<{ signed: boolean; signHash: string | null }>(
      `/api/petition/check?mobile=${encodeURIComponent(mobile)}`,
    ),

  /** Bootstrap the CSRF cookie once (before the first sign POST). */
  ensureCsrf,

  /** POST /api/petition/sign — one Name + Mobile = one signature (idempotent
   *  by idempotencyKey: retries return the ORIGINAL response, same result). */
  sign: (input: {
    name: string;
    mobile: string;          // raw as typed — the server re-normalizes (authoritative)
    challenge: string;
    sig: string;
    hp?: string;             // honeypot — must stay empty
    idempotencyKey: string;
  }) =>
    ensureCsrf().then(() =>
      request<PetitionPublicSignResult>('/api/petition/sign', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    ),

  /** GET /api/petition/verify/:hash — receipt verification (public signs). */
  verify: (hash: string) =>
    request<{ valid: boolean; full_name?: string; phone_last4?: string | null; batch_no?: number; signed_at?: string }>(
      `/api/petition/verify/${encodeURIComponent(hash)}`,
    ),
};

// ─────────────────────────────────────────────────────────────
// Manifesto (Right to Life)
// ─────────────────────────────────────────────────────────────

export interface ManifestoStats {
  signatures: number;
  submissions: number;
}

export const manifestoApi = {
  sign: (idempotencyKey?: string) =>
    request<{ signatureId: string; isDuplicate: boolean; count: number; message: string }>(
      '/api/manifesto/signature',
      { method: 'POST', body: JSON.stringify({ idempotencyKey }) },
    ),

  stats: () => request<ManifestoStats>('/api/manifesto/stats'),

  /** This resident's signed flag + latest docket (auth). */
  myStatus: () => request<{ hasSigned: boolean; signedAt?: string; submission?: { docketRef: string; subject?: string; lang?: string; createdAt: string; sourceUrl?: string } | null }>('/api/manifesto/my-status'),

  submitDocket: (input: { subject?: string; lang?: string; sourceUrl?: string; toEmails?: string[]; ccEmails?: string[]; idempotencyKey?: string }) =>
    request<{ docketRef: string; isDuplicate: boolean }>('/api/manifesto/submission', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  verifyDocket: (ref: string) =>
    request<{ docketRef: string; senderName: string; gudalurId?: string; locality?: string; subject?: string; lang?: string; createdAt: string; sourceUrl?: string }>(
      `/api/manifesto/submission/${encodeURIComponent(ref)}`,
    ),

};

// ─────────────────────────────────────────────────────────────
// Wildlife (incidents + sightings) — offline-first, idempotent
// ─────────────────────────────────────────────────────────────

export interface WildlifeIncidentInput {
  type: string;
  localityId?: string;
  generalizedArea?: string;
  lat?: number;
  lng?: number;
  urgency?: string;
  reportedBy?: string;
  behaviorNotes?: string;
  herdSize?: number;
  mediaUrl?: string;
  transcript?: string;
  reporterPhone?: string;
  idempotencyKey: string;
}

export const wildlifeApi = {
  reportIncident: (input: WildlifeIncidentInput) =>
    request<{ id: string; isNew: boolean }>('/api/wildlife/incident', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  reportSighting: (input: {
    placeName: string; sightingTime?: string; imageUrl?: string; audioUrl?: string;
    lat?: number; lng?: number; transcript?: string; idempotencyKey: string;
  }) =>
    request<{ id: string; isNew: boolean }>('/api/wildlife/sighting', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  incidents: () => request<{ incidents: Array<Record<string, unknown>> }>('/api/wildlife/incidents'),

  sightings: () => request<{ sightings: Array<Record<string, unknown>> }>('/api/wildlife/sightings'),

  voicePetitions: () => request<{ petitions: Array<Record<string, unknown>> }>('/api/wildlife/voice'),

  addVoicePetition: (input: { placeName?: string; language?: string; audioUrl?: string; transcript?: string; lat?: number; lng?: number }) =>
    request<{ id: string }>('/api/wildlife/voice', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  nearbySightings: (lat: number, lng: number, radiusKm = 25) =>
    request<{ sightings: Array<Record<string, unknown>> }>(
      `/api/wildlife/sightings/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`,
    ),

  /** Bulk offline sync — idempotent per item (repeated syncs create no duplicates). */
  syncOfflineQueue: (items: Array<{ type: 'incident' | 'sighting'; data: Record<string, unknown> }>) =>
    request<{ results: Array<{ id: string; isNew: boolean; type: string }> }>('/api/offline/sync', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
};

// ─────────────────────────────────────────────────────────────
// Officials portal (server-authorized — requireRole gates the APIs)
// ─────────────────────────────────────────────────────────────

export const officialsApi = {
  signs: () => request<{ signs: Array<Record<string, unknown>> }>('/api/officials/signs'),
  incidents: () => request<{ incidents: Array<Record<string, unknown>> }>('/api/officials/incidents'),
};

// ─────────────────────────────────────────────────────────────
// Config / misc
// ─────────────────────────────────────────────────────────────

export const configApi = {
  localities: () => request<{ localities: Array<Record<string, unknown>> }>('/api/config/localities'),
};

// ─────────────────────────────────────────────────────────────
// Media (posters + videos) — "Support the Movement"
// ─────────────────────────────────────────────────────────────

export interface MediaItem {
  id: string;
  kind: 'poster' | 'video';
  title: string;
  description: string | null;
  url: string;            // direct media URL (Storj) or /api/media/:id/file fallback
  mime: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

export const mediaApi = {
  /** GET /api/media?limit&offset — bounded window of public media metadata. */
  listPaged: async (limit = 24, offset = 0): Promise<{ items: MediaItem[]; total: number }> => {
    // Do NOT swallow errors silently — surface failures to callers.
    const q = `?limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(String(offset))}`;
    const r = await request<{ media: Array<MediaItem>; total: number }>(`/api/media${q}`);
    const items = (r.media || []).map((m) => ({
      ...m,
      // CockroachDB's pgwire returns INT columns as strings — normalize.
      sizeBytes: m.sizeBytes != null ? Number(m.sizeBytes) : null,
    }));
    return { items, total: Number(r.total) || items.length };
  },

  /** GET /api/media — every published poster & video (metadata only, snapshot-first). */
  list: async (): Promise<MediaItem[]> => {
    const items = await snapshotOrLive<{ media: MediaItem[] } | MediaItem[]>(
      '/data/media.json',
      () => request<{ media: MediaItem[] }>('/api/media'),
      { acceptStaleMs: 30_000 },
    ).then((d) => (Array.isArray(d) ? d : (d as { media: MediaItem[] }).media || []));
    return items.map((m) => ({ ...m, sizeBytes: m.sizeBytes != null ? Number(m.sizeBytes) : null }));
  },

  /** GET /api/media/:id/file — binary payload for a single poster/video. */
  fileUrl: (id: string): string => `/api/media/${encodeURIComponent(id)}/file`,

  /** POST /api/media — admin upload (multipart: file, kind, title, description). */
  upload: (input: { kind: 'poster' | 'video'; title: string; description?: string; file: File }) => {
    const form = new FormData();
    form.append('kind', input.kind);
    form.append('title', input.title);
    if (input.description) form.append('description', input.description);
    form.append('file', input.file);
    return request<{ id: string; ok: boolean; message: string }>('/api/media', {
      method: 'POST',
      body: form,
    });
  },

  /** DELETE /api/media/:id — admin removes a poster/video. */
  remove: (id: string) =>
    request<{ ok: boolean }>(`/api/media/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export default {
  auth: authApi,
  petitions: petitionApi,
  manifesto: manifestoApi,
  wildlife: wildlifeApi,
  officials: officialsApi,
  config: configApi,
  media: mediaApi,
};
