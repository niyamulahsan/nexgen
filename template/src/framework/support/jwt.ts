import { sign, verify } from "hono/jwt";
import { randomUUID } from "node:crypto";
import { env } from "@/env.js";

export const jwt = {
  /**
   * Why: Creates signed JWT access/refresh tokens with project claims.
   * When: Auth flows issue or rotate credentials.
   * Where: Auth controllers/helpers.
   * How: Builds payload with iat/exp/type (+jti for refresh) and signs HS256.
   */
  async generateToken(payload: any, type: "access" | "refresh", expirySeconds?: number) {
    const now = Math.floor(Date.now() / 1000);
    const exp = now
      + (typeof expirySeconds === "number"
        ? expirySeconds
        : type === "refresh"
          ? env.JWT_REFRESH_EXPIRY
          : env.JWT_ACCESS_EXPIRY);
    const secret = type === "refresh" ? env.JWT_REFRESH_SECRET : env.JWT_ACCESS_SECRET;
    const jti = type === "refresh" ? randomUUID() : undefined;

    const tokenPayload = { ...payload, type, iat: now, exp, ...(jti ? { jti } : {}) };
    const token = await sign(tokenPayload, secret, "HS256");

    return { token, jti, exp };
  },

  /**
   * Why: Validates JWT and enforces token type.
   * When: Middleware and refresh flows verify credentials.
   * Where: Auth and realtime handshake.
   * How: Verifies signature/expiry with type-specific secret and checks payload type.
   */
  async verifyToken(token: string, type: "access" | "refresh") {
    try {
      const secret = type === "refresh" ? env.JWT_REFRESH_SECRET : env.JWT_ACCESS_SECRET;
      const payload = await verify(token, secret, "HS256");
      return payload.type === type ? payload : null;
    } catch {
      return null;
    }
  }
};

