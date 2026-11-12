// ./src/framework/realtime/__tests__/rooms.test.ts

import { describe, expect, it } from "vitest";
import { canJoinRoom, registerRoomHandlers } from "@/framework/realtime/rooms.js";
import type { RealtimeAuthContext } from "@/framework/realtime/types.js";

const guest: RealtimeAuthContext = { isAuthenticated: false, userId: null, roles: [], payload: null };
const member: RealtimeAuthContext = { isAuthenticated: true, userId: "42", roles: ["admin"], payload: null };

describe("canJoinRoom", () => {
  it("keeps identity rooms out of reach for guests", () => {
    // The failure this prevents: a guest emitting `join` with `auth`,
    // `role:admin` or another user's room and receiving their broadcasts.
    for (const room of ["auth", "guest", "role:admin", "user:42", "private:team"]) {
      expect(canJoinRoom(room, guest)).toBe(false);
    }
  });

  it("lets guests join public channels", () => {
    expect(canJoinRoom("room:chat:general", guest)).toBe(true);
    expect(canJoinRoom("public", guest)).toBe(true);
  });

  it("lets an authenticated user join only their own user room", () => {
    expect(canJoinRoom("user:42", member)).toBe(true);
    expect(canJoinRoom("user:43", member)).toBe(false);
    expect(canJoinRoom("user:", member)).toBe(false);
  });

  it("only lets a client re-join a role room it already holds", () => {
    // Roles come from the verified token, so a client must not be able to
    // subscribe to a role it does not hold. Re-joining a held role is a
    // no-op the server already performed at connect, so it stays allowed.
    expect(canJoinRoom("role:admin", member)).toBe(true);
    expect(canJoinRoom("role:owner", member)).toBe(false);
    expect(canJoinRoom("role:admin", guest)).toBe(false);
  });

  it("requires authentication for private rooms", () => {
    // `pulse.private(name)` maps to `private:<name>`; it is private from
    // guests, while per-user delivery belongs in `user:<id>`.
    expect(canJoinRoom("private:team", guest)).toBe(false);
    expect(canJoinRoom("private:team", member)).toBe(true);
    expect(canJoinRoom("private:", member)).toBe(false);
  });

  it("scopes private user rooms to the user they name", () => {
    // `pulse.private(\`user:${id}\`)` joins `private:user:<id>`; that must not
    // become a way to read another user's stream.
    expect(canJoinRoom("private:user:42", member)).toBe(true);
    expect(canJoinRoom("private:user:43", member)).toBe(false);
    expect(canJoinRoom("private:user:42", guest)).toBe(false);
    expect(canJoinRoom("private:user:", member)).toBe(false);
  });

  it("trims room names and refuses empty ones", () => {
    expect(canJoinRoom(" user:42 ", member)).toBe(true);
    expect(canJoinRoom("   ", member)).toBe(false);
    expect(canJoinRoom("", guest)).toBe(false);
  });
});

/** Captures the handlers a real Socket.IO socket would receive. */
function fakeSocket() {
  const handlers = new Map<string, (room: unknown) => void>();
  const joined: string[] = [];
  const left: string[] = [];
  const emitted: Array<{ event: string; args: unknown[] }> = [];

  const socket = {
    on: (event: string, handler: (room: unknown) => void) => {
      handlers.set(event, handler);
      return socket;
    },
    join: (room: string) => {
      joined.push(room);
      return socket;
    },
    leave: (room: string) => {
      left.push(room);
      return socket;
    },
    emit: (event: string, ...args: unknown[]) => {
      emitted.push({ event, args });
      return socket;
    }
  };

  return {
    socket,
    joined,
    left,
    emitted,
    fire: (event: string, room: unknown) => handlers.get(event)?.(room)
  };
}

describe("registerRoomHandlers", () => {
  it("joins an allowed room and reports a refused one", () => {
    const fake = fakeSocket();
    const rejected: string[] = [];
    registerRoomHandlers(fake.socket, member, { onRejected: (room) => rejected.push(room) });

    fake.fire("join", "user:42");
    fake.fire("join", "user:43");

    expect(fake.joined).toEqual(["user:42"]);
    expect(rejected).toEqual(["user:43"]);
    expect(fake.emitted).toEqual([{ event: "join:error", args: [{ room: "user:43", reason: "forbidden" }] }]);
  });

  it("tells the server to leave the room", () => {
    // Removing listeners on the client is not enough: the socket stays
    // subscribed and keeps receiving that room's events.
    const fake = fakeSocket();
    registerRoomHandlers(fake.socket, member);

    fake.fire("leave", " private:team ");

    expect(fake.left).toEqual(["private:team"]);
  });
});
