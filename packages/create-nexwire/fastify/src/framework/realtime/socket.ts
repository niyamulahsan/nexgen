import { createAdapter } from "@socket.io/redis-adapter";
import { Server as SocketIOServer } from "socket.io";
import { appConfig, realtimeConfig, redisConfig } from "@/config/index.js";
import { createCircuitBreaker, isCircuitBreakerError } from "@/framework/circuit-breaker/cb.js";
import { registerRoomHandlers } from "@/framework/realtime/rooms.js";
import { authFromSocketHandshake, unauthenticatedRealtimeAuth } from "@/framework/realtime/socket-cookie.js";
import type { RealtimeAuthContext } from "@/framework/realtime/types.js";
import { redisClientIfReady } from "@/framework/redis/client.js";
import { logger } from "@/framework/support/logger.js";

export const WS_PATH = "/socket.io";

// Create a breaker for the Socket.IO Redis adapter
const socketAdapterBreaker = createCircuitBreaker({
  name: "Socket.IO Redis Adapter",
  failureThreshold: 3,
  resetTimeout: 30000
});

export type RealtimeServeWebSocket = Record<string, never>;

export type RealtimeInit = {
  io: SocketIOServer;
  websocketServe: RealtimeServeWebSocket;
};

let io: SocketIOServer | null = null;
let adapterSubClient: ReturnType<typeof redisClientIfReady> | null = null;

function socketAllowedOrigins() {
  const origins = [appConfig.url, appConfig.frontendUrl].filter(Boolean) as string[];
  if (realtimeConfig.enabled) origins.push("https://admin.socket.io");
  return [...new Set(origins)];
}

async function attachRedisAdapter() {
  if (!redisConfig.enabled) return;

  try {
    await socketAdapterBreaker.exec(async () => {
      const pubClient = redisClientIfReady();
      if (!pubClient) throw new Error("Redis client not ready");

      // Socket.IO requires a duplicate connection for subscriptions
      adapterSubClient = pubClient.duplicate();
      await adapterSubClient.connect();

      io?.adapter(createAdapter(pubClient, adapterSubClient));
      logger.debug("Socket.IO Redis adapter attached successfully");
    });
  } catch (error) {
    if (isCircuitBreakerError(error)) {
      logger.warn("Socket.IO Redis adapter skipped due to circuit breaker");
    } else {
      logger.error("Failed to attach Socket.IO Redis adapter", { error });
    }
    // Fallback: Socket.IO will automatically use its default in-memory adapter.
  }
}

function registerAuthAndRooms() {
  io?.use(async (socket, next) => {
    const auth = await authFromSocketHandshake(socket);
    socket.data.auth = auth as RealtimeAuthContext;

    if (auth.isAuthenticated) {
      socket.join("auth");
      if (auth.userId) socket.join(`user:${auth.userId}`);
      for (const role of auth.roles) socket.join(`role:${role}`);
    } else {
      socket.join("guest");
    }

    next();
  });

  io?.on("connection", (socket) => {
    const auth = (socket.data.auth || unauthenticatedRealtimeAuth()) as RealtimeAuthContext;

    logger.debug("Socket connected", {
      socketId: socket.id,
      authenticated: auth.isAuthenticated,
      userId: auth.userId
    });

    registerRoomHandlers(socket, auth, {
      onRejected: (room) => {
        logger.debug("Rejected room join", {
          socketId: socket.id,
          room,
          authenticated: auth.isAuthenticated,
          userId: auth.userId
        });
      }
    });
    socket.on("disconnect", (reason) => {
      logger.info("Socket disconnected", {
        socketId: socket.id,
        reason,
        authenticated: auth.isAuthenticated,
        userId: auth.userId
      });
    });
  });
}

/**
 * Why: Boots the singleton Socket.IO server for Fastify.
 * When: Fastify HTTP server starts and realtime is enabled.
 * Where: Framework server lifecycle.
 * How: Attaches Socket.IO directly to Fastify's underlying Node httpServer.
 */
export async function initRealtime(target: { httpServer: any }): Promise<RealtimeInit | null> {
  if (!realtimeConfig.enabled) {
    logger.debug("Socket.IO disabled (disabled in config)");
    return null;
  }

  if (io) return { io, websocketServe: {} };

  // Fastify exposes the native Node.js httpServer as `app.server`
  io = new SocketIOServer(target.httpServer, {
    path: WS_PATH, // Keep the same path as the Hono and Express engines
    cors: { origin: socketAllowedOrigins(), credentials: true }
  });

  await attachRedisAdapter();
  registerAuthAndRooms();

  logger.debug(`Socket.IO enabled at ${WS_PATH}`);
  return { io, websocketServe: {} };
}

export function socketServer() {
  return io;
}

export function ioServer() {
  return io;
}

export async function closeRealtime() {
  if (!io) return;

  await new Promise<void>((resolve) => {
    io?.close(() => resolve());
  });

  if (adapterSubClient) {
    try {
      await adapterSubClient.quit();
    } catch {
      adapterSubClient.disconnect();
    }
    adapterSubClient = null;
  }

  io = null;
}
