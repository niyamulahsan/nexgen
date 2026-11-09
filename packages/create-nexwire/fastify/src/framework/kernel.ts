import { appConfig } from "@/config/index.js";
import { validateConfig } from "@/config/validate.js";
import { initDatabase } from "@/framework/database/connection.js";
import { createHttpApp } from "@/framework/http/app.js";
import { ensurePublicDir, registerSpaFallback } from "@/framework/http/static.js";
import { registerModuleRoutes } from "@/framework/modules/routes.js";
import { loadProviders } from "@/framework/providers/loader.js";
import { bootQueueJobs } from "@/framework/queue/queue.js";
import { setupQueueDashboard } from "@/framework/queue/ui.js";
import { initRedis } from "@/framework/redis/client.js";
import { storage } from "@/framework/storage/storage.js";

/**
 * Why: Assembles app kernel and boots all framework dependencies.
 * When: HTTP server startup.
 * Where: Called by server runtime entrypoint.
 * How: Initializes storage/db/redis/queues/events/routes and optional UI.
 */
export async function createKernel() {
  validateConfig();

  await storage.init();

  await initRedis();

  const app = createHttpApp();

  await initDatabase();
  await loadProviders();
  await bootQueueJobs();
  await registerModuleRoutes(app);

  const queueDashboard = await setupQueueDashboard();
  await queueDashboard.route(app);

  if (appConfig.uiEnabled) {
    ensurePublicDir();
  }

  registerSpaFallback(app);

  return { app, bullBoard: queueDashboard };
}
