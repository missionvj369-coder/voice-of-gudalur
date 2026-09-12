/**
 * Sliding window rate limiter.
 * 
 * Uses Redis when available (for multi-instance deployments).
 * Falls back to in-memory store for development/single-instance.
 * 
 * Limits by: IP, identity, endpoint, session, token.
 */

import { redisIncr, redisTTL } from "./redis";

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth endpoints — strict to prevent credential stuffing
  "auth:session": { windowMs: 60_000, maxRequests: 5 },
  "auth:verify": { windowMs: 60_000, maxRequests: 3 },

  // Signing — prevent rapid double-signing
  "petition:sign": { windowMs: 30_000, maxRequests: 2 },

  // Validation — prevent brute force on tokens
  "validation:accept": { windowMs: 60_000, maxRequests: 5 },
  "validation:create": { windowMs: 60_000, maxRequests: 3 },

  // Public endpoints — generous but bounded
  "public:count": { windowMs: 10_000, maxRequests: 10 },
  "public:signatures": { windowMs: 10_000, maxRequests: 10 },
  "public:petition": { windowMs: 10_000, maxRequests: 20 },

  // Abuse report
  "report:abuse": { windowMs: 300_000, maxRequests: 3 },

  // Admin endpoints — strict
  "admin:session": { windowMs: 60_000, maxRequests: 5 },

  // Default fallback
  "default": { windowMs: 60_000, maxRequests: 30 },
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
};

/**
 * Check rate limit for a given key + endpoint combination.
 * Uses a fixed-window counter in Redis (INCR + EXPIRE).
 * The first request in a window starts the window; TTL-based expiry
 * provides a practical approximation of sliding window behavior
 * that is atomic and shared across instances.
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS["default"];
  const key = `ratelimit:${endpoint}:${identifier}`;
  const windowSeconds = Math.max(1, Math.floor(config.windowMs / 1000));

  const count = await redisIncr(key, windowSeconds);
  const ttl = await redisTTL(key);

  if (count > config.maxRequests) {
    const resetAt = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + config.windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
    };
  }

  const resetAt = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + config.windowMs;
  return {
    allowed: true,
    remaining: config.maxRequests - count,
    resetAt,
  };
}

/**
 * Check multiple rate limits at once (e.g., IP + identity).
 * All must pass for the request to be allowed.
 */
export async function checkRateLimits(
  identifiers: string[],
  endpoint: string
): Promise<RateLimitResult> {
  const results = await Promise.all(identifiers.map((id) => checkRateLimit(id, endpoint)));

  // Return the most restrictive result
  const blocked = results.find((r) => !r.allowed);
  if (blocked) return blocked;

  // All allowed — return the one with fewest remaining
  return results.reduce((min, r) => (r.remaining < min.remaining ? r : min));
}
