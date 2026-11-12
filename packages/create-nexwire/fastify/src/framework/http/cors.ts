// ./src/framework/http/cors.ts

import { corsConfig } from "@/config/index.js";
import { parseCsvOrFallback } from "@/framework/support/lifecycle.js";

const allowed = parseCsvOrFallback(corsConfig.origin, []);

/**
 * Why: Applies credential-aware CORS policy.
 * When: Global HTTP request processing.
 * Where: App plugin stack.
 * How: `true` reflects the request origin in wildcard mode; otherwise only
 *      origins from the configured allowlist receive CORS headers.
 */
export const corsOrigins = corsConfig.origin === "*" ? true : allowed;
