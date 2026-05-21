import { initDatabase } from "@/framework/database/connection.js";
import { stopQueueRuntime, bootQueueJobs } from "@/framework/queue/queue.js";
import { closeRedis, initRedis } from "@/framework/redis/client.js";
import { startScheduler, stopScheduler } from "@/framework/scheduler/scheduler.js";
import { registerShutdownSignals, type ShutdownSignal } from "@/framework/support/lifecycle.js";
import { logger } from "@/framework/support/logger.js";

await initDatabase();
await initRedis();
await bootQueueJobs();
await startScheduler();
console.log("Scheduler started");

let shuttingDown = false;

async function shutdown(signal: ShutdownSignal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info("Scheduler shutdown signal received", { signal });
  await Promise.allSettled([Promise.resolve(stopScheduler()), stopQueueRuntime(), closeRedis()]);

  process.exit(0);
}

registerShutdownSignals(shutdown);
