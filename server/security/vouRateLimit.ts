/**
 * VOU Rate Limiter - Adapted from D:\vou
 */
import { redisIncr, redisTTL } from "./vouRedis";

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "auth:session": { windowMs: 60_000, maxRequests: 5 },
  "auth:verify": { windowMs: 60_000, maxRequests: 3 },
  "petition:sign": { windowMs: 30_000, maxRequests: 2 },
  "validation:accept": { windowMs: 60_000, maxRequests: 5 },
  "validation:create": { windowMs: 60_000, maxRequests: 3 },
  "report:abuse": { windowMs: 300_000, maxRequests: 3 },
  "admin:session": { windowMs: 60_000, maxRequests: 5 },
  "default": { windowMs: 60_000, maxRequests: 30 },
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
};

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
