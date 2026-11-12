// ./src/framework/http/__tests__/logger.test.ts

import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tier 1: access-log filtering and request ids.
 *
 * Two contracts that Hono and Express already satisfy and Fastify used to miss:
 * probes (`/health`, `/ready`, `/live`) must not reach the access log, and the
 * request id must be a UUID rather than Fastify's `req-1` counter. Both are
 * pinned here so neither can regress silently.
 */

const { info } = vi.hoisted(() => ({ info: vi.fn() }));

vi.mock("@/framework/support/logger.js", () => ({
  logger: { info, warn: vi.fn(), error: vi.fn() }
}));

import { registerRequestLogger } from "@/framework/http/logger.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function buildApp() {
  const app = Fastify({ logger: false, genReqId: () => crypto.randomUUID() });

  registerRequestLogger(app);

  for (const url of ["/health", "/ready", "/live", "/api/ping", "/queues/anything"]) {
    app.get(url, async () => ({ ok: true }));
  }

  await app.ready();
  return app;
}

describe("registerRequestLogger", () => {
  beforeEach(() => {
    info.mockClear();
  });

  it.each(["/health", "/ready", "/live", "/queues/anything"])("skips the access log for %s", async (url) => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url });

    expect(response.statusCode).toBe(200);
    expect(info).not.toHaveBeenCalled();
    await app.close();
  });

  it("logs an application request with a UUID request id", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/ping" });

    expect(info).toHaveBeenCalledOnce();
    const [message, context] = info.mock.calls[0];

    expect(message).toBe("HTTP Request");
    expect(context).toMatchObject({ method: "GET", path: "/api/ping", status: 200 });
    expect(context.requestId).toMatch(UUID_RE);
    expect(response.headers["x-request-id"]).toBe(context.requestId);
    await app.close();
  });
});
