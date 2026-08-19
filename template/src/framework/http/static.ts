import fsSync from "node:fs";
import { runtime } from "@/framework/runtime/runtime.js";

export function hasFrontendBuild() {
  return fsSync.existsSync("public/index.html");
}

/**
 * Why: Loads the active runtime's Hono serveStatic implementation.
 * When: A static middleware is first invoked at request time.
 * Where: Framework HTTP static helpers.
 * How: Dynamically imports hono/bun or @hono/node-server/serve-static
 *      based on runtime(), so non-Node runtimes never load Node-only modules.
 */
export async function resolveServeStatic() {
  const activeRuntime = runtime();
  if (activeRuntime === "bun") {
    return (await import("hono/bun")).serveStatic;
  }
  return (await import("@hono/node-server/serve-static")).serveStatic;
}

let _storageStaticMiddleware: ReturnType<Awaited<ReturnType<typeof resolveServeStatic>>> | null = null;

/**
 * Why: Serves public storage files under `/storage/*` URL space.
 * When: Clients request uploaded public assets.
 * Where: App middleware stack.
 * How: Maps `/storage` path prefix to local storage public directory.
 */
export async function storageStaticMiddleware(c: any, next: any) {
  if (!_storageStaticMiddleware) {
    const serveStatic = await resolveServeStatic();
    _storageStaticMiddleware = serveStatic({
      root: "./src/storage/app/public",
      rewriteRequestPath: (path) => path.replace(/^\/storage/, "")
    });
  }
  return _storageStaticMiddleware(c, next);
}

let _frontendStaticMiddleware: ReturnType<Awaited<ReturnType<typeof resolveServeStatic>>> | null = null;
let _frontendIndexMiddleware: ReturnType<Awaited<ReturnType<typeof resolveServeStatic>>> | null = null;

function ensurePublicDir() {
  if (!fsSync.existsSync("public")) {
    fsSync.mkdirSync("public", { recursive: true });
  }
}

async function frontendStaticMiddleware(c: any, next: any) {
  ensurePublicDir();
  if (!_frontendStaticMiddleware) {
    const serveStatic = await resolveServeStatic();
    _frontendStaticMiddleware = serveStatic({ root: "./public" });
  }
  return _frontendStaticMiddleware(c, next);
}

async function frontendIndexMiddleware(c: any, next: any) {
  ensurePublicDir();
  if (!_frontendIndexMiddleware) {
    const serveStatic = await resolveServeStatic();
    _frontendIndexMiddleware = serveStatic({ path: "./public/index.html" });
  }
  return _frontendIndexMiddleware(c, next);
}

export { ensurePublicDir, frontendIndexMiddleware, frontendStaticMiddleware };
