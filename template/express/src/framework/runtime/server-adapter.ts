import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Express } from "express";
import { closeRealtime, initRealtime } from "@/framework/realtime/socket.js";

export type HttpServerHandle = {
  address(): string | AddressInfo | null;
  close(): Promise<void>;
  native: unknown;
};

async function startNode(app: Express, port: number): Promise<HttpServerHandle> {
  const server = createServer(app);

  // 1. Attach Socket.IO BEFORE starting the server
  await initRealtime({ httpServer: server });

  // 2. Start listening
  await new Promise<void>((resolve, reject) => {
    server.listen(port, () => resolve());
    server.on("error", (err) => reject(err));
  });

  return {
    native: server,
    address: () => server.address(),
    close: async () => {
      // 3. Close Socket.IO safely, then the HTTP server
      await closeRealtime();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  };
}

export async function startHttpServer(app: Express, port: number): Promise<HttpServerHandle> {
  // Express runs natively on Node.js.
  // Even if you run Express on Bun, Bun's Node compatibility layer handles http.createServer.
  return startNode(app, port);
}
