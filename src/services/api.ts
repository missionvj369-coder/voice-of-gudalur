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
  /** POST /api/auth/request-otp - send a 6-digit code to a phone number. */
  requestOtp: (input: { phone: string }) =>
    request<{ message: string; otp?: string }>('/api/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /** POST /api/auth/verify-otp - validate OTP, returns user (login) or isNew + phone (new registration). */
  verifyOtp: (input: { phone: string; code: string }) =>
    request<{ user?: AuthUser; isNew: boolean; phone: string; csrfToken?: string }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /** POST /api/auth/register — create a supporter (issues a Digital Supporter ID + session). */
  register: (input: {
    name: string; phone: string; localityId?: string; customPlaceName?: string;
    address?: string; localityName?: string; pincode?: string; email?: string; lat?: number; lng?: number;
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

  /** GET /api/petitions/sign-stats — live total + per-place leaderboard (highest first). */
  signStats: () =>
    request<{ total: number; places: Array<{ place: string; count: number }> }>('/api/petitions/sign-stats'),

  /** GET /api/petitions/ledger — PUBLIC live hash ledger (anyone can read; phone masked). */
  ledger: () =>
    request<{
      total: number;
      signs: Array<{
        hash: string; name: string; village: string; phoneLast4: string | null;
        batchNo: number; signedAt: string; verifyUrl: string;
      }>;
    }>('/api/petitions/ledger'),

  list: () =>
    request<{ petitions: Array<Record<string, unknown>> }>('/api/petitions/list'),

  support: (id: string, idempotencyKey?: string) =>
    request<{ supportCount: number; isDuplicate: boolean }>(`/api/petitions/${encodeURIComponent(id)}/support`, {
      method: 'POST',
      body: JSON.stringify({ idempotencyKey }),
    }),
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

  /** My latest docket (auth). */
  mySubmission: () => request<{ submission: Record<string, unknown> | null }>('/api/manifesto/my-submission'),
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
  url: string;            // data URL
  mime: string | null;
  createdAt: string;
}

export const mediaApi = {
  /** GET /api/media — every published poster & video. */
  list: async (): Promise<MediaItem[]> => {
    try {
      const r = await request<{ media: MediaItem[] }>('/api/media');
      return r.media || [];
    } catch {
      return [];
    }
  },

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
