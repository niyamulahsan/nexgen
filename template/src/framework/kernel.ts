import { env } from "@/env.js";
import { initDatabase } from "@/framework/database/connection.js";
import { createHttpApp } from "@/framework/http/app.js";
import {
  ensurePublicDir,
  frontendIndexMiddleware,
  frontendStaticMiddleware,
  hasFrontendBuild
} from "@/framework/http/static.js";
import { registerModuleRoutes } from "@/framework/modules/routes.js";
import { bootQueueJobs } from "@/framework/queue/queue.js";
import { setupBullBoard } from "@/framework/queue/ui.js";
import { initRedis } from "@/framework/redis/client.js";
import { storage } from "@/framework/storage/storage.js";

/**
 * Why: Assembles app kernel and boots all framework dependencies.
 * When: HTTP server startup.
 * Where: Called by server runtime entrypoint.
 * How: Initializes storage/db/redis/queues/events/routes and optional frontend.
 */
export async function createKernel() {
  await storage.init();

  await initRedis();

  const app = createHttpApp();

  await initDatabase();
  await bootQueueJobs();
  await registerModuleRoutes(app);

  const bullBoard = await setupBullBoard();
  if (typeof bullBoard.route === "function") {
    bullBoard.route(app);
  } else {
    app.route(bullBoard.basePath, bullBoard.route);
  }

  if (env.FRONTEND) {
    ensurePublicDir();
  }

  if (env.FRONTEND && hasFrontendBuild()) {
    app.use("/*", frontendStaticMiddleware);
    app.get("/*", frontendIndexMiddleware);
  }

  return { app, bullBoard };
}
