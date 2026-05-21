import { initRedis, redisError, redisReady } from "@/framework/redis/client.js";
import { logger } from "@/framework/support/logger.js";
import { clearQueue } from "@/framework/queue/queue.js";

/**
 * Why: Clears Redis queue keys used by BullMQ runtime.
 * When: CLI executes `queue:clear` maintenance command.
 * Where: Framework queue maintenance script.
 * How: Initializes Redis, skips safely if unavailable, then deletes prefixed keys.
 */
await initRedis();
if (!redisReady()) {
  logger.warn("Queue clear skipped because Redis is unavailable", {
    error: redisError()
  });
  process.exit(0);
}

await clearQueue();
console.log("Queue cleared");
