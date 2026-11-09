import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { openApiConfig, rateLimitConfig } from "@/config/index.js";

const skipPaths = new Set([
  "/health",
  "/ready",
  "/live",
  "/metrics",
  openApiConfig.scalar.specUrl,
  openApiConfig.scalar.docsPath
]);

function isInfrastructurePath(pathname: string) {
  return (
    skipPaths.has(pathname) ||
    pathname.startsWith(`${openApiConfig.scalar.docsPath}/`) ||
    pathname.startsWith("/queues") ||
    pathname.startsWith("/storage") ||
    pathname.startsWith("/socket.io")
  );
}

/**
 * Why: Protects the API from burst abuse and accidental flooding.
 * When: Applied globally while the app boots.
 * Where: App plugin stack.
 * How: Fastify's rate-limit plugin uses an in-memory store, matching the Express
 *      engine. Infrastructure paths are excluded so probes and docs stay usable.
 */
export function registerRateLimit(app: FastifyInstance) {
  app.register(rateLimit, {
    global: true,
    max: rateLimitConfig.maxRequests,
    timeWindow: rateLimitConfig.windowMs,
    enableDraftSpec: true,
    allowList: (request) => isInfrastructurePath((request.url || "").split("?")[0])
  });
}

/**
 * Stricter limit for the login route. Passed as `config.rateLimit` on the route.
 */
export const loginLimiter = {
  max: rateLimitConfig.loginMaxRequests,
  timeWindow: rateLimitConfig.windowMs
};
