import type { FastifyReply, FastifyRequest } from "fastify";
import { securityConfig } from "@/config/index.js";

/**
 * Why: Sets browser security response headers (CSP, HSTS, X-Frame).
 * When: Every incoming HTTP request.
 * Where: App request lifecycle, after CORS and session.
 * How: All headers disabled when securityConfig.enabled is false.
 *      HSTS only applied when the request is HTTPS.
 */
export async function securityHook(request: FastifyRequest, reply: FastifyReply) {
  if (!securityConfig.enabled) return;

  reply.header("Content-Security-Policy", securityConfig.csp);

  const forwardedProto = request.headers["x-forwarded-proto"];
  const isHttps = forwardedProto === "https" || request.protocol === "https";
  if (securityConfig.hsts && isHttps) {
    reply.header("Strict-Transport-Security", securityConfig.hstsMaxAge);
  }

  reply.header("X-Frame-Options", securityConfig.xFrame);
  reply.header("X-Content-Type-Options", "nosniff");
  reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
}
