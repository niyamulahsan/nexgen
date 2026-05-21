import { Redis } from "ioredis";
import { env } from "@/env.js";
import { logger } from "@/framework/support/logger.js";

export type redis = Redis;

let client: redis | null = null;
let ready = false;
let lastError: string | null = null;

function safeRedisUrl() {
  try {
    const url = new URL(env.REDIS_URL);
    if (url.password) url.password = "***";
    return url.toString();
  } catch {
    return env.REDIS_URL;
  }
}

/**
 * Why: Initializes shared Redis connection for cache/queue/events/session.
 * When: Runtime bootstrap before Redis-backed features are used.
 * Where: Server, worker, scheduler startup paths.
 * How: Connects once, tracks readiness, and degrades gracefully if unavailable.
 */
export async function initRedis() {
  if (client) return client;

  if (!env.REDIS) {
    ready = false;
    lastError = "REDIS=false";
    logger.info("Redis disabled; cache, session storage, queue, events, and BullBoard unavailable");
    return null;
  }

  try {
    client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null
    });

    client.on("error", (error) => {
      lastError = error.message;
      if (ready) {
        logger.warn("Redis connection error", {
          redisUrl: safeRedisUrl(),
          error: error.message
        });
      }
    });

    await client.connect();
    await client.ping();
    ready = true;
    return client;
  } catch (error) {
    lastError ||= error instanceof Error ? error.message : String(error);
    client?.disconnect();
    client = null;
    ready = false;
    logger.warn(`Redis unavailable; continuing without Redis features (${lastError})`);
    return null;
  }
}

/**
 * Why: Returns the current Redis client instance.
 * When: Internal helpers need direct Redis operations.
 * Where: Cache/session/queue/events modules.
 * How: Returns nullable singleton without creating a new connection.
 */
export function redis() {
  return client;
}

/**
 * Why: Indicates whether Redis is connected and usable.
 * When: Features need to branch on Redis availability.
 * Where: Cache/session/queue/event internals.
 * How: Combines readiness flag with client presence.
 */
export function redisReady() {
  return ready && client !== null;
}

/**
 * Why: Provides a single ready-checked Redis client accessor.
 * When: Redis-backed modules need quick availability guard.
 * Where: Cache/session/queue/events/BullBoard internals.
 * How: Returns connected client or null when Redis is unavailable.
 */
export function redisClientIfReady() {
  return redisReady() ? client : null;
}

/**
 * Why: Exposes last Redis error for diagnostics.
 * When: Startup or health logs need failure detail.
 * Where: Runtime status output.
 * How: Returns cached error message string.
 */
export function redisError() {
  return lastError;
}

/**
 * Why: Closes Redis connection during graceful shutdown.
 * When: Process stop hooks for server/worker/scheduler.
 * Where: Runtime lifecycle files.
 * How: Attempts quit, falls back to disconnect, then resets state.
 */
export async function closeRedis() {
  if (!client) return;

  try {
    await client.quit();
  } catch {
    client.disconnect();
  } finally {
    client = null;
    ready = false;
  }
}
