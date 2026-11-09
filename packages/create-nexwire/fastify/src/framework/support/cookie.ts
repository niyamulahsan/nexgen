import type { FastifyReply, FastifyRequest } from "fastify";
import { appConfig, cookieConfig, jwtConfig } from "@/config/index.js";

function originOf(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function needsCrossSiteCookie() {
  const appOrigin = originOf(appConfig.url);
  const frontendOrigin = originOf(appConfig.frontendUrl);
  return Boolean(appOrigin && frontendOrigin && appOrigin !== frontendOrigin);
}

function baseOptions() {
  const crossSiteCookie = needsCrossSiteCookie();
  const sameSite: "none" | "lax" = crossSiteCookie ? "none" : "lax";
  return {
    httpOnly: true,
    secure: crossSiteCookie,
    sameSite,
    path: "/"
  };
}

/** Reads a signed cookie, returning the value only when the signature is valid. */
function readSigned(request: FastifyRequest, name: string) {
  const raw = request.cookies?.[name];
  if (!raw) return undefined;
  const result = request.unsignCookie(raw);
  return result.valid ? result.value : undefined;
}

export const cookie = {
  async setAuth(reply: FastifyReply, token: string) {
    reply.setCookie(`${cookieConfig.name}_access`, token, {
      ...baseOptions(),
      // @fastify/cookie expects maxAge in seconds.
      maxAge: jwtConfig.accessExpirySeconds,
      signed: true
    });
  },

  async setRefresh(reply: FastifyReply, token: string, maxAge?: number) {
    reply.setCookie(`${cookieConfig.name}_refresh`, token, {
      ...baseOptions(),
      maxAge: typeof maxAge === "number" ? maxAge : jwtConfig.refreshExpirySeconds,
      signed: true
    });
  },

  async getAuth(request: FastifyRequest) {
    return readSigned(request, `${cookieConfig.name}_access`);
  },

  async getRefresh(request: FastifyRequest) {
    return readSigned(request, `${cookieConfig.name}_refresh`);
  },

  deleteAuth(reply: FastifyReply) {
    reply.clearCookie(`${cookieConfig.name}_access`, { path: "/" });
  },

  deleteRefresh(reply: FastifyReply) {
    reply.clearCookie(`${cookieConfig.name}_refresh`, { path: "/" });
  }
};
