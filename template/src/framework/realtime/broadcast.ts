import { socketServer } from "@/framework/realtime/index.js";

export type BroadcastOptions = {
  users?: Array<string | number>;
  roles?: string[];
  rooms?: string[];
  auth?: boolean;
  all?: boolean;
};

/**
 * Why: Emits realtime events to targeted audiences.
 * When: Domain events need websocket fan-out.
 * Where: Event dispatcher and module jobs.
 * How: Emits to all/auth/users/roles/custom rooms using Socket.IO rooms.
 */
export function broadcast(event: string, payload: any, options: BroadcastOptions = {}) {
  const io = socketServer();
  if (!io) return;

  if (options.all) io.emit(event, payload);
  if (options.auth) io.to("auth").emit(event, payload);

  for (const user of options.users || []) io.to(`user:${user}`).emit(event, payload);
  for (const role of options.roles || []) io.to(`role:${role}`).emit(event, payload);
  for (const room of options.rooms || []) io.to(room).emit(event, payload);
}
