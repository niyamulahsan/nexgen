import { cacheConfig, redisConfig } from "@/config/index.js";
import { createCircuitBreaker, isCircuitBreakerError } from "@/framework/circuit-breaker/cb.js";
import { redisClientIfReady } from "@/framework/redis/client.js";

function cacheKey(key: string) {
  return `${cacheConfig.keyPrefix}:${key}`;
}

// Initialize the circuit breaker specifically for Cache operations
const cacheBreaker = createCircuitBreaker({
  name: "Redis Cache",
  failureThreshold: 3,
  resetTimeout: 30000
});

/**
 * Why: Provides Redis-backed cache helpers with graceful fallback behavior.
 * When: Controllers/jobs need temporary computed data caching.
 * Where: Application module code via facade.
 * How: Uses namespaced Redis keys and JSON serialization.
 */
export const cache = {
  /**
   * Why: Reads cached JSON value by key.
   * When: A feature wants fast lookup before recomputing.
   * Where: Controllers/jobs/services using shared cache.
   * How: Fetches namespaced Redis key and parses JSON.
   */
  async get<T>(key: string, fallback: T | null = null) {
    const client = redisClientIfReady();
    // If the client isn't connected at all, fail fast to fallback
    if (!client) return fallback;

    try {
      return await cacheBreaker.exec(async () => {
        const value = await client.get(cacheKey(key));
        return value ? (JSON.parse(value) as T) : fallback;
      });
    } catch (error) {
      // If the circuit is open, or a Redis error occurs, return the fallback safely
      if (isCircuitBreakerError(error)) return fallback;
      return fallback;
    }
  },

  async set(key: string, value: unknown, ttl = cacheConfig.ttlSeconds) {
    const client = redisClientIfReady();
    if (!client) return false;

    try {
      return await cacheBreaker.exec(async () => {
        await client.set(cacheKey(key), JSON.stringify(value), "EX", ttl);
        return true;
      });
    } catch (error) {
      // If the circuit is open, or a Redis error occurs, silently fail
      if (isCircuitBreakerError(error)) return false;
      return false;
    }
  },

  /**
   * @deprecated Use set() instead.
   */
  async put(key: string, value: unknown, ttl = cacheConfig.ttlSeconds) {
    return this.set(key, value, ttl);
  },

  /**
   * Why: Deletes a cached value by key.
   * When: Cached data becomes stale or must be invalidated.
   * Where: Write/update flows that change source data.
   * How: Removes namespaced Redis cache key.
   */
  async forget(key: string) {
    const client = redisClientIfReady();
    if (!client) return false;

    try {
      return await cacheBreaker.exec(async () => {
        await client.del(cacheKey(key));
        return true;
      });
    } catch (error) {
      if (isCircuitBreakerError(error)) return false;
      return false;
    }
  },

  /**
   * Why: Returns cached value or computes/stores a fresh one.
   * When: A feature needs cache-aside behavior.
   * Where: Read paths with potentially expensive callbacks.
   * How: Attempts get first, then executes callback and put.
   */
  async remember<T>(key: string, ttl: number, callback: () => Promise<T>) {
    const cached = await cache.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await callback();
    await this.set(key, fresh, ttl);
    return fresh;
  },

  /**
   * Why: Indicates whether Redis cache backend is currently usable.
   * When: Runtime checks need to branch on cache availability.
   * Where: Health/status endpoints and conditional flows.
   * How: Confirms REDIS flag and ready Redis client instance.
   */
  isAvailable() {
    return redisConfig.enabled && redisClientIfReady() !== null && cacheBreaker.getState() !== "open";
  }
};
