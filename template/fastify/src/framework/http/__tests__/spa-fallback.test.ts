// ./src/framework/http/__tests__/spa-fallback.test.ts

import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerSpaFallback, resolveSpaFallback } from "@/framework/http/static.js";

/**
 * Tier 1: SPA fallback routing.
 *
 * Express serves the SPA shell for client-side routes but keeps API paths as
 * JSON 404s. Fastify's static wildcard would otherwise swallow `/api/*`, so the
 * fallback handler is the single place that decides between the two.
 */
async function buildApp() {
  const app = Fastify();
  app.decorateReply("sendFile", function (this: import("fastify").FastifyReply) {
    return this.type("text/html").send("SHELL");
  });
  registerSpaFallback(app);
  return app;
}

describe("resolveSpaFallback", () => {
  it("serves the shell for a GET client-side route when a build exists", () => {
    expect(resolveSpaFallback("GET", "/dashboard", true)).toBe("spa");
  });

  it("does not serve the shell when no build exists", () => {
    expect(resolveSpaFallback("GET", "/dashboard", false)).toBe("json");
  });

  it.each(["/api/nope", "/api/auth/me", "/storage/missing.png", "/queues/unknown", "/socket.io/", "/metrics"])(
    "returns JSON for infrastructure path %s",
    (pathname) => {
      expect(resolveSpaFallback("GET", pathname, true)).toBe("json");
    }
  );

  it("returns JSON for a non-GET client-side route", () => {
    expect(resolveSpaFallback("POST", "/dashboard", true)).toBe("json");
  });
});

describe("registerSpaFallback", () => {
  it("returns a JSON 404 for an unknown API route", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/nope" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: "Route not found: GET /api/nope" });

    await app.close();
  });

  it("strips the query string before reporting the path", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/nope?x=1" });

    expect(response.json()).toEqual({ message: "Route not found: GET /api/nope" });

    await app.close();
  });
});
