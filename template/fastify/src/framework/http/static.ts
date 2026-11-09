import fs from "node:fs";
import path from "node:path";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";

const publicDir = path.resolve(process.cwd(), "public");
const storageDir = path.resolve(process.cwd(), "src/storage/app/public");

export function hasUiBuild() {
  return fs.existsSync(path.join(publicDir, "index.html"));
}

export function ensurePublicDir() {
  fs.mkdirSync(publicDir, { recursive: true });
}

/**
 * Why: Serves uploaded public files and, when present, the built SPA.
 * When: App boot.
 * Where: HTTP app setup.
 * How: `@fastify/static` mounts storage under `/storage/`; the UI build is
 *      served with `wildcard: false`, so only real build files get a route. An
 *      unknown `/api/...` path therefore falls through to the JSON 404 handler
 *      instead of being swallowed by a catch-all static route.
 */
export function registerStatic(app: FastifyInstance) {
  if (fs.existsSync(storageDir)) {
    app.register(fastifyStatic, {
      root: storageDir,
      prefix: "/storage/",
      decorateReply: false
    });
  }

  if (hasUiBuild()) {
    app.register(fastifyStatic, { root: publicDir, wildcard: false, redirect: true });
  }
}

/**
 * Why: Identifies paths that must never receive the SPA shell.
 * When: A request reaches the not-found handler.
 * Where: SPA fallback resolution.
 * How: API, storage, queue, socket, and metrics paths all keep JSON 404s.
 */
export function isInfrastructurePath(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/storage") ||
    pathname.startsWith("/queues") ||
    pathname.startsWith("/socket.io") ||
    pathname === "/metrics"
  );
}

/**
 * Why: Decides between the SPA shell and a JSON 404.
 * When: A request reaches the not-found handler.
 * Where: `registerSpaFallback`.
 * How: Only GET requests outside infrastructure paths get the shell, and only
 *      when a build actually exists.
 */
export function resolveSpaFallback(method: string, pathname: string, hasBuild: boolean) {
  return method === "GET" && !isInfrastructurePath(pathname) && hasBuild ? "spa" : "json";
}

/**
 * Why: Falls back to the SPA shell for client-side routes and returns JSON 404
 *      for API paths.
 * When: No route or static file matched.
 * Where: End of the HTTP setup.
 */
export function registerSpaFallback(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => {
    const pathname = (request.url || "").split("?")[0];

    if (resolveSpaFallback(request.method, pathname, hasUiBuild()) === "spa") {
      return reply.sendFile("index.html");
    }

    return reply.code(404).send({ message: `Route not found: ${request.method} ${pathname}` });
  });
}
