import { appConfig } from "@/config/index.js";
import { initDatabase } from "@/framework/database/connection.js";
import { createHttpApp } from "@/framework/http/app.js";
import { ensurePublicDir, frontendIndexMiddleware, frontendStaticMiddleware, hasFrontendBuild } from "@/framework/http/static.js";
import { registerModuleRoutes } from "@/framework/modules/routes.js";
import { bootQueueJobs } from "@/framework/queue/queue.js";
import { setupQueueDashboard } from "@/framework/queue/ui.js";
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

  const queueDashboard = await setupQueueDashboard();
  if (typeof queueDashboard.route === "function") {
    queueDashboard.route(app);
  } else {
    app.route(queueDashboard.basePath, queueDashboard.route);
  }

  if (appConfig.frontendEnabled) {
    ensurePublicDir();
  }

  if (appConfig.frontendEnabled && hasFrontendBuild()) {
    app.use("/*", frontendStaticMiddleware);
    app.get("/*", frontendIndexMiddleware);
  }

  return { app, bullBoard: queueDashboard };
}
