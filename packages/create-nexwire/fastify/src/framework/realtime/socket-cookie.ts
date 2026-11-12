// ./src/framework/realtime/socket-cookie.ts

import { unsign } from "@fastify/cookie";
import type { Socket } from "socket.io";
import { cookieConfig } from "@/config/index.js";
import type { RealtimeAuthContext } from "@/framework/realtime/types.js";
import { jwt } from "@/framework/support/jwt.js";

export function unauthenticatedRealtimeAuth(): RealtimeAuthContext {
  return { isAuthenticated: false, userId: null, roles: [], payload: null };
}

function parseCookieHeader(header: string | undefined) {
  if (!header) return {} as Record<string, string>;

  const cookies: Record<string, string> = {};
  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName || rawValue.length === 0) continue;
    cookies[rawName] = decodeURIComponent(rawValue.join("="));
  }

  return cookies;
}

function userIdFromPayload(payload: Record<string, unknown>) {
  const candidate = payload.userId ?? payload.id ?? payload.sub;
  if (candidate === null || candidate === undefined) return null;
  return String(candidate);
}

function rolesFromPayload(payload: Record<string, unknown>) {
  const direct = payload.roles;
  if (Array.isArray(direct)) return direct.map((role) => String(role));

  const single = payload.role;
  if (single === null || single === undefined) return [];
  return [String(single)];
}

/**
 * Why: Resolves auth context for websocket connections from the access cookie
 *      or the Socket.IO handshake `auth` payload.
 * When: Socket.IO handshake middleware executes.
 * Where: Realtime server auth pipeline.
 * How: Verifies the signed access cookie with @fastify/cookie, or reads the
 *      bare JWT sent by desktop and native clients in the handshake, then
 *      normalizes user/role claims.
 */
export async function authFromSocketHandshake(socket: Socket): Promise<RealtimeAuthContext> {
  const cookies = parseCookieHeader(socket.handshake.headers.cookie);
  const cookieToken = cookies[`${cookieConfig.name}_access`];

  // Desktop and native clients cannot send the httpOnly cookie, so they pass the
  // access token through the Socket.IO handshake `auth` payload instead.
  const handshakeToken = socket.handshake.auth?.token;

  let token: string | null = null;
  if (cookieToken) {
    const unsigned = unsign(cookieToken, cookieConfig.secret);
    if (!unsigned.valid) {
      return unauthenticatedRealtimeAuth();
    }
    token = unsigned.value;
  } else if (typeof handshakeToken === "string" && handshakeToken.length > 0) {
    token = handshakeToken;
  }

  if (!token) {
    return unauthenticatedRealtimeAuth();
  }

  const payload = await jwt.verifyToken(token, "access");
  if (!payload) {
    return unauthenticatedRealtimeAuth();
  }

  const normalizedPayload = payload as Record<string, unknown>;

  return {
    isAuthenticated: true,
    userId: userIdFromPayload(normalizedPayload),
    roles: rolesFromPayload(normalizedPayload),
    payload: normalizedPayload
  };
}
