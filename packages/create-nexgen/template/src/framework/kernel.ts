import { env } from "@/env.js";
import { createHttpApp } from "@/framework/http/app.js";
import { registerModuleRoutes } from "@/framework/modules/routes.js";
import { initDatabase } from "@/framework/database/connection.js";
import { initRedis } from "@/framework/redis/client.js";
import { bootQueueJobs } from "@/framework/queue/queue.js";
import { setupBullBoard } from "@/framework/queue/ui.js";
import { frontendIndexMiddleware, frontendStaticMiddleware, hasFrontendBuild } from "@/framework/http/static.js";
import { storage } from "@/framework/storage/storage.js";

/**
 * Why: Assembles app kernel and boots all framework dependencies.
 * When: HTTP server startup.
 * Where: Called by server runtime entrypoint.
 * How: Initializes storage/db/redis/queues/events/routes and optional frontend.
 */
export async function createKernel() {
  await storage.init();

  const app = createHttpApp();

  await initDatabase();
  await initRedis();
  await bootQueueJobs();
  await registerModuleRoutes(app);

  const bullBoard = setupBullBoard();
  if (typeof bullBoard.route === "function") {
    bullBoard.route(app);
  } else {
    app.route(bullBoard.basePath, bullBoard.route);
  }

  if (env.FRONTEND && hasFrontendBuild()) {
    app.use("/*", frontendStaticMiddleware);
    app.get("/*", frontendIndexMiddleware);
  }

  return { app, bullBoard };
}
