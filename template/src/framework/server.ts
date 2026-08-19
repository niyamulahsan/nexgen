import chalk from "chalk";
import { appConfig, mailConfig, realtimeConfig, redisConfig } from "@/config/index.js";
import { createKernel } from "@/framework/kernel.js";
import { stopQueueRuntime } from "@/framework/queue/queue.js";
import { stopQueueDashboard } from "@/framework/queue/ui.js";
import { broadcast, closeRealtime, initRealtime, WS_PATH } from "@/framework/realtime/index.js";
import { setupSocketAdminUI } from "@/framework/realtime/ui.js";
import { closeRedis, redisClientIfReady, redisError, redisReady } from "@/framework/redis/client.js";
import { isBun } from "@/framework/runtime/runtime.js";
import { type HttpServerHandle, startHttpServer } from "@/framework/runtime/server-adapter.js";
import { parseCsvOrFallback, registerShutdownSignals, type ShutdownSignal } from "@/framework/support/lifecycle.js";
import { logger } from "@/framework/support/logger.js";

const redisBackedServices = "cache, session, queue, events, Queue Dashboard";

/**
 * Why: Builds reliable local URL string for runtime service output.
 * When: Printing API/docs/Queue Dashboard endpoints at startup.
 * Where: Server runtime logging.
 * How: Derives bound port from server address and normalizes hostname.
 */
function serverUrl(server: HttpServerHandle, pathname = "") {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : appConfig.port;

  try {
    const currentUrl = new URL(appConfig.url);
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

let realtime = null as Awaited<ReturnType<typeof initRealtime>>;
let server: HttpServerHandle;

if (isBun()) {
  realtime = await initRealtime({ app });
  server = await startHttpServer(app, appConfig.port, realtime?.websocketServe);
} else {
  server = await startHttpServer(app, appConfig.port);
  realtime = await initRealtime({ httpServer: server.native });
}

const socketAdmin = setupSocketAdminUI(realtime?.io ?? null);

let shuttingDown = false;
let broadcastSubClient: ReturnType<typeof redisClientIfReady> | null = null;

/**
 * Why: Gracefully closes HTTP server listener.
 * When: Shutdown signal handling.
 * Where: Server runtime teardown.
 * How: Awaits runtime-appropriate server close.
 */
async function closeHttpServer() {
  await server.close();
}

/**
 * Why: Coordinates full process shutdown for API runtime.
 * When: SIGINT/SIGTERM received.
 * Where: Server entrypoint lifecycle.
 * How: Stops realtime/broadcast/queue/redis/http resources then exits.
 */
async function shutdown(signal: ShutdownSignal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info("Shutdown signal received", { signal });
  if (broadcastSubClient) {
    try {
      await broadcastSubClient.quit();
    } catch {
      broadcastSubClient.disconnect();
    }
    broadcastSubClient = null;
  }
  await Promise.allSettled([closeRealtime(), stopQueueRuntime(), closeHttpServer()]);
  stopQueueDashboard();
  await closeRedis();

  process.exit(0);
}

registerShutdownSignals(shutdown);

if (redisConfig.enabled && realtime) {
  const redis = redisClientIfReady();
  if (redis) {
    broadcastSubClient = redis.duplicate();
    await broadcastSubClient.connect();
    const channel = `${redisConfig.prefix}:broadcast`;
    await broadcastSubClient.subscribe(channel);
    broadcastSubClient.on("message", (_channel: string, message: string) => {
      try {
        const { event, payload, options } = JSON.parse(message);
        if (event) broadcast(event, payload, options);
      } catch (error) {
        logger.error("Broadcast relay error", { error });
      }
    });
  }
}

/**
 * Why: Parses optional dev sidecar views requested by dev command.
 * When: Server starts and prints local tooling URLs.
 * Where: Runtime startup output logic.
 * How: Reads `NEXGEN_DEV_VIEWS` comma-separated env and returns a set.
 */
function devViews() {
  return new Set(parseCsvOrFallback(process.env.NEXGEN_DEV_VIEWS, []).map((view) => view.toLowerCase()));
}

const views = devViews();
let redisWarnColor: ((text: string) => string) | null = null;
console.log(`API Docs: ${serverUrl(server, "/api-docs")}`);

if (views.has("studio")) {
  console.log("Drizzle Studio requested: https://local.drizzle.studio (see dev process status)");
}

if (!redisConfig.enabled) {
  redisWarnColor = chalk.cyan;
  console.log(chalk.cyan("Redis disabled (configured in src/config/redis.ts)"));
  console.log(chalk.cyan(`Redis-backed services disabled: ${redisBackedServices}`));
} else if (redisReady()) {
  console.log(chalk.green(`Redis connected: ${redisConfig.url}`));
  console.log(chalk.green(`Redis-backed services enabled: ${redisBackedServices}`));
} else {
  redisWarnColor = chalk.yellow;
  console.log(chalk.yellow(`Redis unavailable: ${redisError() || "not connected"}`));
  console.log(chalk.yellow(`Redis-backed services unavailable: ${redisBackedServices}`));
}

const bullboardLine = `${bullBoard.enabled ? "Queue Dashboard enabled" : "Queue Dashboard unavailable"}: ${serverUrl(server, bullBoard.basePath)}`;
console.log(redisWarnColor ? redisWarnColor(bullboardLine) : bullboardLine);

const socketLine = !realtimeConfig.enabled
  ? "Realtime (Socket.IO) disabled"
  : realtime
    ? `Realtime (Socket.IO) enabled: ${serverUrl(server, WS_PATH).replace(/^http/, "ws")}${socketAdmin.enabled ? " | Admin UI: https://admin.socket.io" : ""}`
    : "Realtime (Socket.IO) unavailable";
console.log(socketLine);

if (views.has("maildev")) {
  const maildevLine = `MailDev: http://localhost:${mailConfig.maildev.webPort} (SMTP ${mailConfig.maildev.smtpPort})`;
  const line = `${maildevLine} (requested; see dev process status)`;
  console.log(redisWarnColor ? redisWarnColor(line) : line);
}

if (views.has("redis")) {
  const redisUiLine = `Redis UI: http://localhost:${redisConfig.commanderPort}`;
  const line = `${redisUiLine} (requested; see dev process status)`;
  console.log(redisWarnColor ? redisWarnColor(line) : line);
}

if (appConfig.frontendEnabled) {
  if (process.env.NEXGEN_FRONTEND_URL) {
    console.log(`Frontend UI: ${process.env.NEXGEN_FRONTEND_URL}`);
  } else {
    console.log("Frontend enabled");
  }
} else {
  console.log("Frontend disabled (disabled in src/config/app.ts)");
}

console.log(`${appConfig.name} API running on ${serverUrl(server)}`);
