import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { appConfig, redisConfig, sessionConfig } from "@/config/index.js";
import { redisClientIfReady } from "@/framework/redis/client.js";
import { createCircuitBreaker, isCircuitBreakerError } from "@/framework/circuit-breaker/cb.js";

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
 * Global middleware that ensures every request has a session cookie.
 */
export async function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  let sessionId = req.cookies?.[sessionConfig.cookieName];

  if (!sessionId) {
    sessionId = randomUUID();
    const crossSiteCookie = needsCrossSiteCookie();
    res.cookie(sessionConfig.cookieName, sessionId, {
      httpOnly: true,
      sameSite: crossSiteCookie ? "none" : "lax",
      secure: crossSiteCookie,
      path: "/",
      maxAge: sessionConfig.ttlSeconds * 1000
    });
  }

  res.locals.sessionId = sessionId;

  // Refresh is safely wrapped in the breaker internally
  await session.refresh(sessionId);

  next();
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
        const data = (await session.all<Record<string, unknown>>(id)) || {};
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
    return (
      redisConfig.enabled &&
      redisClientIfReady() !== null &&
      sessionBreaker.getState() !== "open"
    );
  }
};
