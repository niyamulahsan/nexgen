// ./src/framework/runtime/server-adapter.ts

import type { AddressInfo } from "node:net";
import type { FastifyInstance } from "fastify";
import { closeRealtime, initRealtime } from "@/framework/realtime/socket.js";

export type HttpServerHandle = {
  address(): string | AddressInfo | null;
  close(): Promise<void>;
  native: unknown;
};

async function startNode(app: FastifyInstance, port: number): Promise<HttpServerHandle> {
  // 1. Attach Socket.IO BEFORE starting the server
  await initRealtime({ httpServer: app.server });

  // 2. Start listening. Fastify defaults to localhost; bind all interfaces to
  //    match Express's `server.listen(port)` behaviour.
  await app.listen({ port, host: "0.0.0.0" });

  return {
    native: app.server,
    address: () => app.server.address(),
    close: async () => {
      // 3. Close Socket.IO safely, then the HTTP server
      await closeRealtime();
      await app.close();
    }
  };
}

export async function startHttpServer(app: FastifyInstance, port: number): Promise<HttpServerHandle> {
  // Fastify runs natively on Node.js; its `.server` is the underlying http.Server.
  return startNode(app, port);
}
