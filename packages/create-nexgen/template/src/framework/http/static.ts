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

/**
 * Why: Serves built frontend static assets.
 * When: SPA build exists in `public` directory.
 * Where: Kernel frontend integration.
 * How: Uses node static middleware rooted at `./public`.
 */
export const frontendStaticMiddleware = serveStatic({ root: "./public" });

/**
 * Why: Serves SPA entry file for client-side routed paths.
 * When: Non-API frontend route fallback is needed.
 * Where: Kernel catch-all frontend route.
 * How: Always returns `public/index.html`.
 */
export const frontendIndexMiddleware = serveStatic({ path: "./public/index.html" });
