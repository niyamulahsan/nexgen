import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "@/env.js";
import { logger } from "@/framework/support/logger.js";
import {
  authFromSocketHandshake,
  unauthenticatedRealtimeAuth
} from "@/framework/realtime/socket-cookie.js";
import type { RealtimeAuthContext } from "@/framework/realtime/types.js";
import { redisClientIfReady } from "@/framework/redis/client.js";

let io: Server | null = null;
let adapterSubClient: ReturnType<typeof redisClientIfReady> | null = null;

function socketAllowedOrigins() {
  const origins = [env.APP_URL, env.FRONTEND_URL].filter(Boolean) as string[];
  if (env.SOCKET) origins.push("https://admin.socket.io");
  return [...new Set(origins)];
}

/**
 * Why: Boots singleton Socket.IO server with auth-aware room assignment.
 * When: HTTP server starts and realtime is enabled.
 * Where: Framework server lifecycle.
 * How: Configures CORS, resolves auth from cookies, and joins role/user rooms.
 */
export async function initRealtime(server: any) {
  if (!env.SOCKET) {
    logger.info("Socket.IO disabled (SOCKET=false)");
    return null;
  }

  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: socketAllowedOrigins(),
      credentials: true
    }
  });

  if (env.REDIS) {
    const pubClient = redisClientIfReady();
    if (pubClient) {
      adapterSubClient = pubClient.duplicate();
      await adapterSubClient.connect();
      io.adapter(createAdapter(pubClient, adapterSubClient));
    }
  }

  io.use(async (socket, next) => {
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

  io.on("connection", (socket) => {
    const auth = (socket.data.auth || unauthenticatedRealtimeAuth()) as RealtimeAuthContext;

    logger.debug("Socket connected", {
      socketId: socket.id,
      authenticated: auth.isAuthenticated,
      userId: auth.userId
    });

    socket.on("join", (room) => socket.join(String(room)));
    socket.on("disconnect", (reason) => {
      logger.info("Socket disconnected", {
        socketId: socket.id,
        reason,
        authenticated: auth.isAuthenticated,
        userId: auth.userId
      });
    });
  });

  return io;
}

/**
 * Why: Returns active Socket.IO server instance.
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
 * Why: Closes Socket.IO server gracefully on shutdown.
 * When: Server stop hooks.
 * Where: Framework runtime teardown.
 * How: Awaits close callback and clears singleton reference.
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
}
