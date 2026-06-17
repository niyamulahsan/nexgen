import type { Context, MiddlewareHandler, Next } from "hono";
import { MemoryStore, RedisStore, rateLimiter } from "hono-rate-limiter";
import { env } from "@/env.js";
import { redisClientIfReady } from "@/framework/redis/client.js";

/**
 * Why: Protects API from burst abuse and accidental flooding.
 * When: Applied globally in HTTP middleware chain.
 * Where: App bootstrap middleware stack.
 * How: Limits requests per-user (authenticated) or per-session (guest)
 *      using Redis store when available, falling back to in-memory.
 *      Sends standard RateLimit-* headers so clients can back off.
 */

function adaptRedis(raw: any) {
  return {
    scriptLoad: (script: string) => raw.script("load", script),
    evalsha: (sha1: string, keys: string[], args: unknown[]) =>
      raw.evalsha(sha1, keys.length, ...keys, ...args),
    decr: (key: string) => raw.decr(key),
    del: (key: string) => raw.del(key)
  };
}

function createStore(raw: any) {
  return raw
    ? new RedisStore({ client: adaptRedis(raw), prefix: `${env.REDIS_PREFIX}:rl` })
    : new MemoryStore();
}

let middleware: MiddlewareHandler | null = null;

export const rateLimiterMiddleware = async (c: Context, next: Next) => {
  if (!middleware) {
    middleware = rateLimiter({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      keyGenerator: (c: any) => {
        const sessionId = c.get("sessionId");
        if (sessionId) return `session:${sessionId}`;
        return c.req.header("x-forwarded-for") ?? "unknown";
      },
      store: createStore(redisClientIfReady()),
      standardHeaders: "draft-6"
    });
  }

  return middleware(c, next);
};

let loginLimiterMiddleware: MiddlewareHandler | null = null;

export const loginLimiter = async (c: Context, next: Next) => {
  if (!loginLimiterMiddleware) {
    loginLimiterMiddleware = rateLimiter({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_LOGIN_MAX,
      keyGenerator: (c: any) => {
        const ip = c.req.header("x-forwarded-for") ?? "unknown";
        return `login:${ip}`;
      },
      store: createStore(redisClientIfReady()),
      standardHeaders: "draft-6"
    });
  }

  return loginLimiterMiddleware(c, next);
};
