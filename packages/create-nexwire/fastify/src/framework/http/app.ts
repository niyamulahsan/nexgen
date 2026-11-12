// ./src/framework/http/app.ts

import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import fastifyPlugin from "fastify-plugin";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { appConfig, cookieConfig, loggingConfig, rateLimitConfig, redisConfig } from "@/config/index.js";
import { database } from "@/framework/database/connection.js";
import { corsOrigins } from "@/framework/http/cors.js";
import { registerErrorHandler, registerRequestLogger } from "@/framework/http/logger.js";
import { getMetrics, incrementRequestCount } from "@/framework/http/metrics.js";
import { configureOpenApi } from "@/framework/http/openapi.js";
import { registerRateLimit } from "@/framework/http/ratelimiter.js";
import { securityHook } from "@/framework/http/security.js";
import { hasUiBuild, registerStatic } from "@/framework/http/static.js";
import { redisClientIfReady } from "@/framework/redis/client.js";
import { sessionMiddleware } from "@/framework/session/session.js";

const HealthSchema = z.object({
  message: z.string()
});

const ReadySchema = z.object({
  status: z.enum(["ready", "not_ready"]),
  checks: z.record(z.string(), z.string())
});

const RootSchema = z.object({
  name: z.string(),
  ok: z.boolean()
});

/**
 * Why: Wraps the request lifecycle hooks in one plugin so they load after the
 *      cookie/cors/rate-limit plugins. fastify-plugin breaks encapsulation, so
 *      the hooks and request decorators still reach every route on the root.
 * When: App boot, before route registration.
 * Where: HTTP app setup.
 * How: Session first (needs parsed cookies), then security, metrics, logging.
 */
const infrastructure = fastifyPlugin(async (app) => {
  app.decorateRequest("auth", null);
  app.decorateRequest("sessionId", null);

  app.addHook("onRequest", sessionMiddleware);
  app.addHook("onRequest", securityHook);
  app.addHook("onRequest", async () => {
    incrementRequestCount();
  });

  if (loggingConfig.httpRequests) {
    registerRequestLogger(app);
  }
});

/**
 * Why: Builds the main HTTP app with plugins, health, and fallbacks.
 * When: Kernel creates the application server instance.
 * Where: Framework bootstrap path.
 * How: Native Fastify plugins and hooks; no Express/Hono compatibility layer.
 */
export function createHttpApp() {
  const app = Fastify({
    logger: false,
    // Match Hono and Express: a UUID per request instead of Fastify's `req-1`
    // counter, so request ids are comparable across engines and log sinks.
    genReqId: () => crypto.randomUUID()
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Error handling must exist before child route scopes are created, otherwise
  // those scopes inherit Fastify's default handler and return 400 for Zod errors.
  registerErrorHandler(app);

  app.register(cookie, { secret: cookieConfig.secret });
  app.register(cors, { origin: corsOrigins, credentials: true });
  registerRateLimit(app);

  app.register(infrastructure);

  if (appConfig.openApiEnabled) {
    configureOpenApi(app);
  }

  app.get(
    "/health",
    {
      schema: {
        tags: ["System"],
        description: "Application health status",
        response: { 200: HealthSchema }
      }
    },
    async () => ({ message: "Application is healthy" })
  );

  app.get(
    "/ready",
    {
      schema: {
        tags: ["System"],
        description: "Readiness probe",
        response: { 200: ReadySchema, 503: ReadySchema }
      }
    },
    async (_request, reply) => {
      const checks: Record<string, string> = {};
      let allOk = true;
      try {
        database();
        checks.database = "ok";
      } catch {
        checks.database = "error";
        allOk = false;
      }
      if (redisConfig.enabled) {
        if (redisClientIfReady()) {
          checks.redis = "ok";
        } else {
          checks.redis = "error";
          allOk = false;
        }
      } else {
        checks.redis = "disabled";
      }
      reply.code(allOk ? 200 : 503);
      return { status: allOk ? "ready" : "not_ready", checks } as const;
    }
  );

  app.get(
    "/live",
    {
      schema: {
        tags: ["System"],
        description: "Liveness probe",
        response: { 200: z.object({ status: z.literal("alive") }) }
      }
    },
    async () => ({ status: "alive" as const })
  );

  app.get("/metrics", async (_request, reply) => {
    const m = getMetrics();
    const output = [
      "# HELP http_requests_total Total HTTP requests",
      "# TYPE http_requests_total counter",
      `http_requests_total ${m.requestCount}`,
      "# HELP http_errors_total Total HTTP errors",
      "# TYPE http_errors_total counter",
      `http_errors_total ${m.errorCount}`
    ].join("\n");
    reply.type("text/plain").send(output);
  });

  if (!hasUiBuild()) {
    app.get(
      "/",
      {
        schema: {
          tags: ["System"],
          description: "API identity",
          response: { 200: RootSchema }
        }
      },
      async () => ({ name: appConfig.name, ok: true })
    );
  }

  registerStatic(app);

  return app;
}
