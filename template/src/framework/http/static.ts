import fsSync from "node:fs";
import { serveStatic } from "@hono/node-server/serve-static";

export function hasFrontendBuild() {
  return fsSync.existsSync("public/index.html");
}

/**
 * Why: Serves public storage files under `/storage/*` URL space.
 * When: Clients request uploaded public assets.
 * Where: App middleware stack.
 * How: Maps `/storage` path prefix to local storage public directory.
 */
export const storageStaticMiddleware = serveStatic({
  root: "./src/storage/app/public",
  rewriteRequestPath: (path) => path.replace(/^\/storage/, "")
});

let _frontendStaticMiddleware: ReturnType<typeof serveStatic> | null = null;
let _frontendIndexMiddleware: ReturnType<typeof serveStatic> | null = null;

function ensurePublicDir() {
  if (!fsSync.existsSync("public")) {
    fsSync.mkdirSync("public", { recursive: true });
  }
}

function frontendStaticMiddleware(c: any, next: any) {
  ensurePublicDir();
  if (!_frontendStaticMiddleware) {
    _frontendStaticMiddleware = serveStatic({ root: "./public" });
  }
  return _frontendStaticMiddleware(c, next);
}

function frontendIndexMiddleware(c: any, next: any) {
  ensurePublicDir();
  if (!_frontendIndexMiddleware) {
    _frontendIndexMiddleware = serveStatic({ path: "./public/index.html" });
  }
  return _frontendIndexMiddleware(c, next);
}

export { frontendStaticMiddleware, frontendIndexMiddleware, ensurePublicDir };
