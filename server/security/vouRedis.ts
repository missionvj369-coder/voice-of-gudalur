/**
 * Redis client abstraction with in-memory fallback.
 * 
 * Uses Redis in production (for multi-instance rate limiting and sessions).
 * Falls back to in-memory store for development/single-instance.
 * 
 * Connection string: REDIS_URL environment variable.
 * e.g. REDIS_URL="redis://:password@host:6379"
 */

import { createClient } from "redis";

let redisClient: ReturnType<typeof createClient> | null = null;
let connectPromise: Promise<unknown> | null = null;
const memoryStore = new Map<string, { value: string; expiresAt: number }>();

function getRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!redisClient) {
    redisClient = createClient({ url });
    redisClient.on("error", (err: Error) => {
      // Log Redis errors but don't crash — callers fall back to memory
      console.error(`[redis] ${err.message}`);
    });
  }

  // Fire-and-forget connect (redis v4+ requires explicit connect()).
  // Callers treat a failed/pending connection as "fall back to memory".
  if (!connectPromise) {
    connectPromise = redisClient.connect().catch((e: unknown) => {
      console.error(`[redis] connect failed, using memory fallback: ${e}`);
      connectPromise = null; // allow retry on next call
    });
  }

  // Only hand out the client once it is ready; otherwise use memory.
  if (!redisClient.isReady) return null;
  return redisClient;
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  const client = getRedisClient();
  if (client) {
    try {
      await client.set(key, value, { EX: ttlSeconds });
      return;
    } catch (e) {
      console.error(`[redis] set failed, falling back to memory: ${e}`);
    }
  }
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function redisGet(key: string): Promise<string | null> {
  const client = getRedisClient();
  if (client) {
    try {
      return await client.get(key);
    } catch (e) {
      console.error(`[redis] get failed, falling back to memory: ${e}`);
    }
  }
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

export async function redisDel(key: string): Promise<void> {
  const client = getRedisClient();
  if (client) {
    try {
      await client.del(key);
      return;
    } catch (e) {
      console.error(`[redis] del failed, falling back to memory: ${e}`);
    }
  }
  memoryStore.delete(key);
}

export async function redisIncr(key: string, ttlSeconds: number): Promise<number> {
  const client = getRedisClient();
  if (client) {
    try {
      const val = await client.incr(key);
      if (val === 1) {
        await client.expire(key, ttlSeconds);
      }
      return val;
    } catch (e) {
      console.error(`[redis] incr failed, falling back to memory: ${e}`);
    }
  }
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || now > entry.expiresAt) {
    memoryStore.set(key, { value: "1", expiresAt: now + ttlSeconds * 1000 });
    return 1;
  }
  const next = parseInt(entry.value, 10) + 1;
  entry.value = String(next);
  return next;
}

export async function redisTTL(key: string): Promise<number> {
  const client = getRedisClient();
  if (client) {
    try {
      return await client.ttl(key);
    } catch (e) {
      console.error(`[redis] ttl failed, falling back to memory: ${e}`);
    }
  }
  const entry = memoryStore.get(key);
  if (!entry) return -1;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return -1;
  }
  return Math.ceil((entry.expiresAt - Date.now()) / 1000);
}

export async function redisExists(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (client) {
    try {
      return (await client.exists(key)) > 0;
    } catch (e) {
      console.error(`[redis] exists failed, falling back to memory: ${e}`);
    }
  }
  return redisGet(key) !== null;
}