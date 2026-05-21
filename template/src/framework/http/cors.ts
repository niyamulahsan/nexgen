import { cors } from "hono/cors";
import { env } from "@/env.js";
import { parseCsvOrFallback } from "@/framework/support/lifecycle.js";

const corsOrigins = parseCsvOrFallback(env.CORS_ORIGIN, []);

/**
 * Why: Applies credential-aware CORS policy.
 * When: Global HTTP middleware processing.
 * Where: App middleware stack.
 * How: Reflects origin for wildcard mode or validates against allowlist.
 */
export const corsMiddleware = cors({
  origin: (origin) => {
    if (env.CORS_ORIGIN === "*") return origin;
    return corsOrigins.includes(origin) ? origin : undefined;
  },
  credentials: true
});
