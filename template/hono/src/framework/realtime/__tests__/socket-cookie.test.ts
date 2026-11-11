import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  verified: [] as string[],
  payload: null as Record<string, unknown> | null
}));

vi.mock("@/config/index.js", () => ({
  cookieConfig: { name: "nexwire", secret: "test-secret" }
}));

vi.mock("@/framework/support/jwt.js", () => ({
  jwt: {
    verifyToken: async (token: string) => {
      state.verified.push(token);
      return state.payload;
    }
  }
}));

async function auth(handshake: { headers?: Record<string, string>; auth?: Record<string, unknown> }) {
  const { authFromSocketHandshake } = await import("@/framework/realtime/socket-cookie.js");
  return authFromSocketHandshake({ handshake: { headers: {}, auth: {}, ...handshake } } as never);
}

describe("authFromSocketHandshake", () => {
  beforeEach(() => {
    state.verified.length = 0;
    state.payload = { userId: 7, roles: ["admin"] };
  });

  it("accepts a bare JWT from the Socket.IO handshake", async () => {
    // Desktop and native clients cannot send the httpOnly cookie, so this is
    // their only way in. Before the fix the handshake was ignored entirely and
    // every such socket landed in the guest room.
    const context = await auth({ auth: { token: "header.payload.signature" } });

    expect(state.verified).toEqual(["header.payload.signature"]);
    expect(context.isAuthenticated).toBe(true);
    expect(context.userId).toBe("7");
  });

  it("does not strip the signature from a handshake token", async () => {
    await auth({ auth: { token: "header.payload.signature" } });

    // A handshake token is already the bare JWT; only the cookie carries the
    // extra signed-cookie HMAC segment.
    expect(state.verified[0]).toBe("header.payload.signature");
  });

  it("accepts a signed cookie and strips only its HMAC segment", async () => {
    await auth({ headers: { cookie: "nexwire_access=aaa.bbb.ccc" }, auth: { token: "ignored" } });

    expect(state.verified).toEqual(["aaa.bbb"]);
  });

  it("prefers the cookie when both a cookie and a handshake token are present", async () => {
    await auth({ headers: { cookie: "nexwire_access=aaa.bbb.ccc" }, auth: { token: "handshake" } });

    expect(state.verified).toEqual(["aaa.bbb"]);
  });

  it("stays unauthenticated when no token is present", async () => {
    const context = await auth({});

    expect(state.verified).toEqual([]);
    expect(context).toMatchObject({ isAuthenticated: false, userId: null });
  });

  it("rejects a handshake token the JWT verifier does not accept", async () => {
    state.payload = null;

    const context = await auth({ auth: { token: "tampered" } });

    expect(context.isAuthenticated).toBe(false);
  });
});
