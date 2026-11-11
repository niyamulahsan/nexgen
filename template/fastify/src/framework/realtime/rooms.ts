import type { RealtimeAuthContext } from "@/framework/realtime/types.js";

/**
 * Why: A socket used to join any room name it asked for, so a guest (or any
 *      authenticated user) could subscribe to `user:<someone-else>`,
 *      `role:admin`, `auth` or `private:<room>` and receive their events.
 * When: A client emits the Socket.IO `join` event.
 * Where: Realtime server room handling.
 * How: Rooms that encode identity are only joined by the server from the
 *      verified token (`auth`, `guest`, `user:*`, `role:*`). Clients may join
 *      their own `user:<id>`, a role room they already hold, any
 *      authenticated-only `private:*` room, and public channel names.
 */

/** Rooms the server assigns itself; clients must never pick these. */
const SERVER_ASSIGNED_ROOMS = new Set(["auth", "guest"]);

const USER_PREFIX = "user:";
const ROLE_PREFIX = "role:";
const PRIVATE_PREFIX = "private:";

/**
 * Why: Decides whether a client-requested room is safe to join.
 * When: Before `socket.join(...)` for a client-emitted `join`.
 * Where: `registerRoomHandlers` in this module.
 * How: Compares identity rooms against the auth context; treats everything
 *      else as a public channel.
 */
export function canJoinRoom(room: string, auth: RealtimeAuthContext): boolean {
  const name = String(room ?? "").trim();
  if (!name) return false;

  // `auth` and `guest` are derived from the handshake, not requested.
  if (SERVER_ASSIGNED_ROOMS.has(name)) return false;

  if (name.startsWith(USER_PREFIX)) {
    const userId = name.slice(USER_PREFIX.length);
    return auth.isAuthenticated && userId.length > 0 && userId === auth.userId;
  }

  if (name.startsWith(ROLE_PREFIX)) {
    // Role membership comes from the verified token, never from the client:
    // a socket may only re-join a role room it already holds (the server
    // assigned it at connect), which keeps `pulse.channel("role:admin")`
    // working for admins without letting anyone else in.
    const role = name.slice(ROLE_PREFIX.length);
    return auth.isAuthenticated && role.length > 0 && auth.roles.includes(role);
  }

  if (name.startsWith(PRIVATE_PREFIX)) {
    // "Private" means authenticated-only. `private:user:<id>` targets a single
    // user and is self-only; any other `private:<room>` is an authenticated
    // group room.
    if (!auth.isAuthenticated) return false;

    const body = name.slice(PRIVATE_PREFIX.length);
    if (!body) return false;

    if (body.startsWith(USER_PREFIX)) {
      const userId = body.slice(USER_PREFIX.length);
      return userId.length > 0 && userId === auth.userId;
    }

    return true;
  }

  return true;
}

/** Minimal socket surface, so the handlers are testable without Socket.IO. */
export type RoomSocket = {
  on: (event: string, handler: (room: unknown) => void) => unknown;
  join: (room: string) => unknown;
  leave: (room: string) => unknown;
  emit: (event: string, ...args: unknown[]) => unknown;
};

export type RoomHandlerOptions = {
  /** Called when a join is refused, so the host can log it. */
  onRejected?: (room: string, auth: RealtimeAuthContext) => void;
};

/**
 * Why: Wires the client-controlled `join`/`leave` events with authorization.
 * When: A socket connects (after auth middleware ran).
 * Where: Realtime server connection handler.
 * How: `join` validates with `canJoinRoom` and reports `join:error`; `leave`
 *      only touches this socket, so it needs no authorization.
 */
export function registerRoomHandlers(socket: RoomSocket, auth: RealtimeAuthContext, options: RoomHandlerOptions = {}) {
  socket.on("join", (room) => {
    const name = String(room ?? "").trim();

    if (!canJoinRoom(name, auth)) {
      options.onRejected?.(name, auth);
      socket.emit("join:error", { room: name, reason: "forbidden" });
      return;
    }

    socket.join(name);
  });

  socket.on("leave", (room) => {
    socket.leave(String(room ?? "").trim());
  });
}
