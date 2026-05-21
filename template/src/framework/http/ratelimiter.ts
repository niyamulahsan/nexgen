import { rateLimiter } from "hono-rate-limiter";

/**
 * Why: Protects API from burst abuse and accidental flooding.
 * When: Applied globally in HTTP middleware chain.
 * Where: App bootstrap middleware stack.
 * How: Limits requests per IP window using forwarded IP key.
 */
export const rateLimiterMiddleware = rateLimiter({
  windowMs: 60_000,
  limit: 60,
  keyGenerator: (c) => c.req.header("x-forwarded-for") ?? ""
});
