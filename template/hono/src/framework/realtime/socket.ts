import { createAdapter } from "@socket.io/redis-adapter";
import { Server as SocketIOServer } from "socket.io";
import { appConfig, realtimeConfig, redisConfig } from "@/config/index.js";
import { createCircuitBreaker, isCircuitBreakerError } from "@/framework/circuit-breaker/cb.js";
import { registerRoomHandlers } from "@/framework/realtime/rooms.js";
import { authFromSocketHandshake, unauthenticatedRealtimeAuth } from "@/framework/realtime/socket-cookie.js";
import type { RealtimeAuthContext } from "@/framework/realtime/types.js";
import { redisClientIfReady } from "@/framework/redis/client.js";
import { isBun } from "@/framework/runtime/runtime.js";
import { logger } from "@/framework/support/logger.js";

export const WS_PATH = "/socket.io";

// Create a breaker for the Socket.IO Redis adapter
const socketAdapterBreaker = createCircuitBreaker({
  name: "Socket.IO Redis Adapter",
  failureThreshold: 3,
  resetTimeout: 30000
});

/**
 * Why: Describes runtime-specific WebSocket wiring for the HTTP server adapter.
 * When: startHttpServer needs Bun websocket handlers from the bun engine.
 * Where: Cross-runtime server bootstrap.
 * How: `bun` carries the bun-engine handler's websocket options; `node` attaches
 *      Socket.IO directly to the http server so no node field is needed.
 */
export type RealtimeServeWebSocket = {
  node?: any;
  bun?: {
    websocket: any;
    idleTimeout?: number;
    maxRequestBodySize?: number;
  };
};

export type RealtimeInit = {
  io: SocketIOServer;
  websocketServe: RealtimeServeWebSocket;
};

let io: SocketIOServer | null = null;
let adapterSubClient: ReturnType<typeof redisClientIfReady> | null = null;
let serveWebSocket: RealtimeServeWebSocket = {};

function socketAllowedOrigins() {
  const origins = [appConfig.url, appConfig.frontendUrl].filter(Boolean) as string[];
  if (realtimeConfig.enabled) origins.push("https://admin.socket.io");
  return [...new Set(origins)];
}

function socketCors() {
  return { origin: socketAllowedOrigins(), credentials: true };
}

/**
 * Why: Attaches the Redis pub/sub adapter so broadcasts span processes.
 * When: Redis is available at realtime boot.
 * Where: Realtime bootstrap.
 * How: Duplicates the shared client for the adapter's subscription leg.
 */
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
  }
}

/**
 * Why: Registers auth middleware and connection handling for the singleton.
 * When: Realtime server is created.
 * Where: Realtime bootstrap.
 * How: Resolves auth from handshake cookies and joins user/role/auth rooms.
 */
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
 * Why: Boots the singleton Socket.IO server with auth-aware room assignment.
 * When: HTTP server starts and realtime is enabled.
 * Where: Framework server lifecycle.
 * How: On node attaches to the created http server; on bun binds the bun-engine
 *      and registers its `/socket.io` route on the Hono app, returning the
 *      websocket options the Bun server needs.
 */
export async function initRealtime(target: { app?: any; httpServer?: any }): Promise<RealtimeInit | null> {
  if (!realtimeConfig.enabled) {
    logger.debug("Socket.IO disabled (disabled in config)");
    return null;
  }

  if (io) return { io, websocketServe: serveWebSocket };

  if (isBun()) {
    const { Server: Engine } = await import("@socket.io/bun-engine");
    const engine = new Engine({ path: WS_PATH, cors: socketCors() });
    io = new SocketIOServer();
    io.bind(engine);

    const handler = engine.handler();

    serveWebSocket.bun = {
      websocket: handler.websocket,
      idleTimeout: handler.idleTimeout || 120,
      maxRequestBodySize: handler.maxRequestBodySize || 1024 * 1024
    };

    // Store engine in app for later use
    if (target.app) {
      (target.app as any)._engine = engine;
    }
  } else {
    io = new SocketIOServer(target.httpServer, { cors: socketCors() });
  }

  await attachRedisAdapter();
  registerAuthAndRooms();

  logger.debug(`Socket.IO enabled at ${WS_PATH}`);
  return { io, websocketServe: serveWebSocket };
}

/**
 * Why: Returns the active Socket.IO server instance.
 * When: Broadcast helpers need emitter access.
 * Where: Realtime broadcast/event internals.
 * How: Returns nullable singleton created by initRealtime.
 */
export function socketServer() {
  return io;
}

/**
 * Why: Alias for socketServer for facade ergonomics.
 * When: Existing consumers use `io` naming.
 * Where: Framework facade export compatibility.
 * How: Returns same singleton Socket.IO instance.
 */
export function ioServer() {
  return io;
}

/**
 * Why: Closes the Socket.IO server gracefully on shutdown.
 * When: Server stop hooks.
 * Where: Framework runtime teardown.
 * How: Awaits close callback and clears the singleton reference.
 */
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
  serveWebSocket = {};
}
