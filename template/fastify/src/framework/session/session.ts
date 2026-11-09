import { randomUUID } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { appConfig, redisConfig, sessionConfig } from "@/config/index.js";
import { createCircuitBreaker, isCircuitBreakerError } from "@/framework/circuit-breaker/cb.js";
import { redisClientIfReady } from "@/framework/redis/client.js";

// Initialize the breaker for Session operations
const sessionBreaker = createCircuitBreaker({
  name: "Redis Session",
  failureThreshold: 3,
  resetTimeout: 30000
});

function originOf(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function needsCrossSiteCookie() {
  const appOrigin = originOf(appConfig.url);
  const frontendOrigin = originOf(appConfig.frontendUrl);
  return Boolean(appOrigin && frontendOrigin && appOrigin !== frontendOrigin);
}

function sessionKey(id: string) {
  return `${sessionConfig.keyPrefix}:${id}`;
}

/**
 * Global hook that ensures every request has a session cookie.
 *
 * Runs in an onRequest hook, after `@fastify/cookie` has parsed the header, so
 * `request.cookies` is available. The session id is exposed on the request for
 * downstream handlers, mirroring Express's `res.locals.sessionId`.
 */
export async function sessionMiddleware(request: FastifyRequest, reply: FastifyReply) {
  let sessionId = request.cookies?.[sessionConfig.cookieName];

  if (!sessionId) {
    sessionId = randomUUID();
    const crossSiteCookie = needsCrossSiteCookie();
    reply.setCookie(sessionConfig.cookieName, sessionId, {
      httpOnly: true,
      sameSite: crossSiteCookie ? "none" : "lax",
      secure: crossSiteCookie,
      path: "/",
      // @fastify/cookie expects maxAge in seconds.
      maxAge: sessionConfig.ttlSeconds
    });
  }

  request.sessionId = sessionId;

  // Refresh is safely wrapped in the breaker internally
  await session.refresh(sessionId);
}

/** Redis-backed server-side session store. */
export const session = {
  async start(data: Record<string, unknown> = {}) {
    const client = redisClientIfReady();
    if (!client) return "";

    try {
      return await sessionBreaker.exec(async () => {
        const id = randomUUID();
        await client.set(sessionKey(id), JSON.stringify(data), "EX", sessionConfig.ttlSeconds);
        return id;
      });
    } catch (error) {
      if (isCircuitBreakerError(error)) return "";
      return "";
    }
  },

  async all<T = Record<string, unknown>>(id: string): Promise<T | null> {
    const client = redisClientIfReady();
    if (!client) return null;

    try {
      return await sessionBreaker.exec(async () => {
        const data = await client.get(sessionKey(id));
        return data ? (JSON.parse(data) as T) : null;
      });
    } catch (error) {
      if (isCircuitBreakerError(error)) return null;
      return null;
    }
  },

  async get<T>(id: string, key: string): Promise<T | null> {
    const data = await session.all<Record<string, T>>(id);
    return data?.[key] ?? null;
  },

  async set(id: string, key: string, value: unknown) {
    const client = redisClientIfReady();
    if (!client) return false;

    try {
      return await sessionBreaker.exec(async () => {
        // Read through the client directly rather than `session.all()`. Calling
        // another breaker-wrapped method from inside `exec` deadlocks the
        // half-open probe: the inner call sees the outer probe in flight and
        // rejects, so a `set` could never be the call that closes the breaker.
        const raw = await client.get(sessionKey(id));
        const data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        data[key] = value;
        await client.set(sessionKey(id), JSON.stringify(data), "EX", sessionConfig.ttlSeconds);
        return true;
      });
    } catch (error) {
      if (isCircuitBreakerError(error)) return false;
      return false;
    }
  },

  /** @deprecated Use set() instead. */
  async put(id: string, key: string, value: unknown) {
    return this.set(id, key, value);
  },

  async refresh(id: string) {
    const client = redisClientIfReady();
    if (!client) return false;

    try {
      return await sessionBreaker.exec(async () => {
        await client.expire(sessionKey(id), sessionConfig.ttlSeconds);
        return true;
      });
    } catch (error) {
      if (isCircuitBreakerError(error)) return false;
      return false;
    }
  },

  async destroy(id: string) {
    const client = redisClientIfReady();
    if (!client) return false;

    try {
      return await sessionBreaker.exec(async () => {
        await client.del(sessionKey(id));
        return true;
      });
    } catch (error) {
      if (isCircuitBreakerError(error)) return false;
      return false;
    }
  },

  isAvailable() {
    return redisConfig.enabled && redisClientIfReady() !== null && sessionBreaker.getState() !== "open";
  }
};
