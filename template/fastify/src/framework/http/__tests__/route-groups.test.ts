// ./src/framework/http/__tests__/route-groups.test.ts

import Fastify from "fastify";
import { describe, expect, it } from "vitest";

/**
 * Tier 1: scoped `preHandler` isolation.
 *
 * The failure class: a hook added in one route group leaking into a sibling
 * group mounted at the same prefix. Fastify plugins are encapsulated by
 * default, so each `register` scope keeps its own hooks. These tests pin that
 * contract: a rate limiter on public routes must never run for protected ones,
 * and an auth hook on protected routes must never run for public ones.
 */

async function buildApp(calls: string[]) {
  const app = Fastify();

  await app.register(
    async (scope) => {
      scope.addHook("preHandler", async () => {
        calls.push("limiter");
      });
      scope.get("/public", async () => ({ ok: true }));
    },
    { prefix: "/api" }
  );

  await app.register(
    async (scope) => {
      scope.addHook("preHandler", async (request, reply) => {
        if (request.headers["x-deny"] === "1") {
          return reply.code(401).send({ message: "Unauthorized" });
        }
        calls.push("auth");
      });
      scope.get("/protected", async () => ({ ok: true }));
    },
    { prefix: "/api" }
  );

  await app.ready();
  return app;
}

describe("scoped preHandler hooks", () => {
  it("does not leak the public group hook into a protected sibling", async () => {
    const calls: string[] = [];
    const app = await buildApp(calls);

    const response = await app.inject({ method: "GET", url: "/api/protected" });

    expect(response.statusCode).toBe(200);
    expect(calls).toEqual(["auth"]);
    await app.close();
  });

  it("does not leak the protected group hook into a public sibling", async () => {
    const calls: string[] = [];
    const app = await buildApp(calls);

    const response = await app.inject({ method: "GET", url: "/api/public" });

    expect(response.statusCode).toBe(200);
    expect(calls).toEqual(["limiter"]);
    await app.close();
  });

  it("lets a group hook short-circuit with its own status", async () => {
    const calls: string[] = [];
    const app = await buildApp(calls);

    const response = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { "x-deny": "1" }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ message: "Unauthorized" });
    expect(calls).toEqual([]);
    await app.close();
  });

  it("keeps per-route preHandlers local to that route", async () => {
    const calls: string[] = [];
    const app = Fastify();

    app.get(
      "/one",
      {
        preHandler: async () => {
          calls.push("one");
        }
      },
      async () => ({ ok: true })
    );
    app.get("/two", async () => ({ ok: true }));

    await app.ready();

    await app.inject({ method: "GET", url: "/one" });
    await app.inject({ method: "GET", url: "/two" });

    expect(calls).toEqual(["one"]);
    await app.close();
  });
});
