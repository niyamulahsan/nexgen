import { serve } from "@hono/node-server";
import type { AddressInfo } from "node:net";
import { createServer } from "node:http";
import chalk from "chalk";
import { env } from "@/env.js";
import { createKernel } from "@/framework/kernel.js";
import { stopQueueRuntime } from "@/framework/queue/queue.js";
import { closeRealtime, initRealtime } from "@/framework/realtime/index.js";
import { setupSocketAdminUI } from "@/framework/realtime/ui.js";
import { closeRedis, redisError, redisReady } from "@/framework/redis/client.js";
import { parseCsvOrFallback, registerShutdownSignals, type ShutdownSignal } from "@/framework/support/lifecycle.js";
import { logger } from "@/framework/support/logger.js";

const redisBackedServices = "cache, session, queue, events, BullBoard";

/**
 * Why: Builds reliable local URL string for runtime service output.
 * When: Printing API/docs/BullBoard endpoints at startup.
 * Where: Server runtime logging.
 * How: Derives bound port from server address and normalizes hostname.
 */
function serverUrl(server: { address(): string | AddressInfo | null; }, pathname = "") {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : env.APP_PORT;

  try {
    const currentUrl = new URL(env.APP_URL);
    currentUrl.port = String(port);
    if (currentUrl.hostname === "0.0.0.0" || currentUrl.hostname === "::") {
      currentUrl.hostname = "localhost";
    }

    return `${currentUrl.toString().replace(/\/$/, "")}${pathname}`;
  } catch {
    return `http://localhost:${port}${pathname}`;
  }
}

const { app, bullBoard } = await createKernel();

/**
 * Why: Parses optional dev sidecar views requested by dev command.
 * When: Server starts and prints local tooling URLs.
 * Where: Runtime startup output logic.
 * How: Reads `NEXGEN_DEV_VIEWS` comma-separated env and returns a set.
 */
function devViews() {
  return new Set(parseCsvOrFallback(process.env.NEXGEN_DEV_VIEWS, []).map((view) => view.toLowerCase()));
}

const server = serve({
  fetch: app.fetch,
  port: env.APP_PORT,
  createServer
});

let shuttingDown = false;

/**
 * Why: Gracefully closes HTTP server listener.
 * When: Shutdown signal handling.
 * Where: Server runtime teardown.
 * How: Wraps callback-based close in a promise.
 */
async function closeHttpServer() {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}

/**
 * Why: Coordinates full process shutdown for API runtime.
 * When: SIGINT/SIGTERM received.
 * Where: Server entrypoint lifecycle.
 * How: Stops realtime/events/queue/redis/http resources then exits.
 */
async function shutdown(signal: ShutdownSignal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info("Shutdown signal received", { signal });
  await Promise.allSettled([
    closeRealtime(),
    stopQueueRuntime(),
    closeRedis(),
    closeHttpServer()
  ]);

  process.exit(0);
}

registerShutdownSignals(shutdown);

const io = await initRealtime(server);
const socketAdmin = setupSocketAdminUI(io);
const views = devViews();
let redisWarnColor: ((text: string) => string) | null = null;
console.log(`API Docs: ${serverUrl(server, "/api-docs")}`);

if (views.has("studio")) {
  console.log("Drizzle Studio requested: https://local.drizzle.studio (see dev process status)");
}

if (!env.REDIS) {
  redisWarnColor = chalk.cyan;
  console.log(chalk.cyan("Redis disabled (REDIS=false)"));
  console.log(chalk.cyan(`Redis-backed services disabled: ${redisBackedServices}`));
} else if (redisReady()) {
  console.log(chalk.green(`Redis connected: ${env.REDIS_URL}`));
  console.log(chalk.green(`Redis-backed services enabled: ${redisBackedServices}`));
} else {
  redisWarnColor = chalk.yellow;
  console.log(chalk.yellow(`Redis unavailable: ${redisError() || "not connected"}`));
  console.log(chalk.yellow(`Redis-backed services unavailable: ${redisBackedServices}`));
}

const bullboardLine = `${bullBoard.enabled ? "BullBoard UI enabled" : "BullBoard UI unavailable"}: ${serverUrl(server, bullBoard.basePath)}`;
console.log(redisWarnColor ? redisWarnColor(bullboardLine) : bullboardLine);

const socketLine = env.SOCKET
  ? `Socket.IO enabled: ${env.APP_URL}${socketAdmin.enabled ? " | Admin UI: https://admin.socket.io" : ""}`
  : "Socket.IO disabled";
console.log(socketLine);

if (views.has("maildev")) {
  const maildevLine = `MailDev: http://localhost:${env.MAILDEV_WEB_PORT} (SMTP ${env.MAIL_PORT})`;
  const line = `${maildevLine} (requested; see dev process status)`;
  console.log(redisWarnColor ? redisWarnColor(line) : line);
}

if (views.has("redis")) {
  const redisUiLine = `Redis UI: http://localhost:${env.REDIS_COMMANDER_PORT}`;
  const line = `${redisUiLine} (requested; see dev process status)`;
  console.log(redisWarnColor ? redisWarnColor(line) : line);
}

if (env.FRONTEND) {
  if (process.env.NEXGEN_FRONTEND_URL) {
    console.log("Frontend UI: " + process.env.NEXGEN_FRONTEND_URL);
  } else {
    console.log("Frontend enabled");
  }
} else {
  console.log("Frontend disabled (FRONTEND=false)");
}

console.log(`${env.APP_NAME} API running on ${serverUrl(server)}`);
