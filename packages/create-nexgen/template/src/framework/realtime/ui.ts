import { instrument } from "@socket.io/admin-ui";
import type { Server as SocketIOServer } from "socket.io";
import { env } from "@/env.js";

export function setupSocketAdminUI(io: SocketIOServer | null) {
  if (!io || !env.SOCKET || env.APP_ENV === "production") {
    return { enabled: false };
  }

  instrument(io, {
    auth: false,
    mode: "development"
  });

  return { enabled: true };
}
