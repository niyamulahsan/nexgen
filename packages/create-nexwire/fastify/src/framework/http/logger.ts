// ./src/framework/http/logger.ts

import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from "fastify-type-provider-zod";
import { openApiConfig } from "@/config/index.js";
import { logger } from "@/framework/support/logger.js";

function requestIp(request: FastifyRequest) {
  const forwarded = request.headers["x-forwarded-for"];
  return String(request.headers["cf-connecting-ip"] || forwarded || request.headers["x-real-ip"] || request.ip || "");
}

// Probe endpoints and the queue dashboard are infrastructure traffic, not
// application requests. Skip them on every engine so the access log stays
// useful (the dev CLI polls /health while it boots).
const PROBE_PATHS = new Set(["/health", "/ready", "/live"]);

function shouldSkipHttpLog(pathname: string) {
  return (
    PROBE_PATHS.has(pathname) ||
    pathname.startsWith("/queues") ||
    pathname === "/favicon.ico" ||
    pathname === openApiConfig.scalar.specUrl ||
    pathname === openApiConfig.scalar.docsPath ||
    pathname.startsWith(`${openApiConfig.scalar.docsPath}/`)
  );
}

/**
 * Why: Logs each HTTP request with latency and request metadata.
 * When: Applied globally to app routes.
 * Where: HTTP request lifecycle.
 * How: An onResponse hook reads Fastify's built-in elapsed time, so no
 *      per-request start timestamp has to be stored.
 */
export function registerRequestLogger(app: FastifyInstance) {
  app.addHook("onRequest", async (request, reply) => {
    reply.header("X-Request-ID", request.id);
  });

  app.addHook("onResponse", async (request, reply) => {
    const pathname = (request.url || "").split("?")[0];
    if (shouldSkipHttpLog(pathname)) return;

    logger.info("HTTP Request", {
      requestId: request.id,
      method: request.method,
      path: pathname,
      url: request.url,
      status: reply.statusCode,
      duration_ms: Math.round(reply.elapsedTime),
      ip: requestIp(request),
      userAgent: request.headers["user-agent"] || null
    });
  });
}

function zodIssues(error: FastifyError) {
  return (error.validation ?? []).map((issue) => ({
    path: issue.instancePath.split("/").filter(Boolean),
    message: issue.message,
    code: issue.keyword
  }));
}

/**
 * Why: Normalizes every error into the same JSON contract as Hono and Express.
 * When: Any route or hook throws.
 * Where: App error boundary.
 * How: Zod failures become 422 with `{ success:false, error:{ name, issues } }`;
 *      response serialization failures stay 500; everything else uses statusCode.
 */
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const issues = zodIssues(error);
      logger.warn("Request validation failed", { status: 422, issues });
      return reply.code(422).send({
        success: false,
        error: { name: "ZodError", issues }
      });
    }

    if (isResponseSerializationError(error)) {
      request.log.error({ err: error }, "Response serialization failed");
      logger.error("Response serialization failed", { err: error });
      return reply.code(500).send({ message: "Internal server error" });
    }

    const status =
      typeof error.statusCode === "number" ? error.statusCode : typeof (error as any).status === "number" ? (error as any).status : 500;

    const applicationError = error as any;
    if (applicationError.success === false && applicationError.error?.issues) {
      logger.warn("Request validation failed", { status, issues: applicationError.error.issues });
      return reply.code(status).send({
        success: false,
        error: {
          name: applicationError.error.name ?? "ZodError",
          issues: applicationError.error.issues
        }
      });
    }

    const message = status === 500 ? "Internal server error" : (error.message ?? "Internal server error");
    const stack = process.env.NODE_ENV === "production" ? undefined : error.stack;

    logger.error("Request failed", { status, message, stack: error.stack });

    return reply.code(status).send({ message, ...(stack ? { stack } : {}) });
  });
}
