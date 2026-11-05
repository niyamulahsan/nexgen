import { env } from "@/env.js";
import { createCircuitBreaker, isCircuitBreakerError } from "@/framework/circuit-breaker/cb.js";
import { socketServer } from "@/framework/realtime/socket.js";
import { redisClientIfReady } from "@/framework/redis/client.js";
import { logger } from "@/framework/support/logger.js";

export type BroadcastOptions = {
  users?: Array<string | number>;
  roles?: string[];
  rooms?: string[];
  auth?: boolean;
  all?: boolean;
};

// Circuit breaker for the pub/sub relay (used by workers that don't have Socket.IO)
const broadcastBreaker = createCircuitBreaker({
  name: "Realtime Broadcast Relay",
  failureThreshold: 3,
  resetTimeout: 30000
});

/**
 * Why: Emits realtime events to targeted audiences.
 * When: Domain events need websocket fan-out.
 * Where: Event dispatcher and module jobs.
 * How: Emits via Socket.IO if available; otherwise relays through Redis pub/sub
 *      so the main process (which has Socket.IO) can broadcast it.
 */
function emitViaIo(event: string, payload: any, options: BroadcastOptions) {
  const io = socketServer();
  if (!io) return;

  if (options.all) io.emit(event, payload);
  if (options.auth) io.to("auth").emit(event, payload);

  for (const user of options.users || []) io.to(`user:${user}`).emit(event, payload);
  for (const role of options.roles || []) io.to(`role:${role}`).emit(event, payload);
  for (const room of options.rooms || []) io.to(room).emit(event, payload);
}

export async function broadcast(event: string, payload: any, options: BroadcastOptions = {}) {
  const io = socketServer();

  // If this process has Socket.IO (the main API server), emit directly
  if (io) {
    try {
      emitViaIo(event, payload, options);
    } catch (error) {
      logger.error("Failed to broadcast event via Socket.IO", { error, event });
    }
    return;
  }

  // If this is a background worker, relay through Redis
  const redis = redisClientIfReady();
  if (!redis) return;

  try {
    await broadcastBreaker.exec(async () => {
      const channel = `${env.REDIS_PREFIX}:broadcast`;
      await redis.publish(channel, JSON.stringify({ event, payload, options }));
    });
  } catch (error) {
    if (isCircuitBreakerError(error)) {
      logger.warn("Broadcast relay skipped: Circuit breaker is open");
    } else {
      logger.error("Failed to relay broadcast via Redis", { error, event });
    }
  }
}
