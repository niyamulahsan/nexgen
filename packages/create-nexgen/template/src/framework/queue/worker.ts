import { startQueueWorker, stopQueueRuntime } from "@/framework/queue/queue.js";
import { closeDatabase, initDatabase } from "@/framework/database/connection.js";
import { closeRedis, initRedis, redisError, redisReady } from "@/framework/redis/client.js";
import {
  parseCsvOrFallback,
  registerShutdownSignals,
  type ShutdownSignal
} from "@/framework/support/lifecycle.js";
import { logger } from "@/framework/support/logger.js";

const queuesArg = process.argv.find((arg) => arg.startsWith("--queue="));
const queueNames = queuesArg?.split("=")[1];
const queues = parseCsvOrFallback(queueNames, ["default"]);

await initDatabase();
await initRedis();
if (!redisReady()) {
  logger.error("Queue worker cannot start because Redis is unavailable", {
    error: redisError()
  });
  process.exit(1);
}

await startQueueWorker(queues);
console.log(`Queue worker started: ${queues.join(", ")}`);

let shuttingDown = false;

async function shutdown(signal: ShutdownSignal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info("Queue worker shutdown signal received", { signal });
  await Promise.allSettled([stopQueueRuntime(), closeDatabase(), closeRedis()]);

  process.exit(0);
}

registerShutdownSignals(shutdown);
