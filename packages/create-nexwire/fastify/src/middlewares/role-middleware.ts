import type { FastifyReply, FastifyRequest } from "fastify";
import { HttpStatusCodes } from "@/framework/facade.js";

type AuthPayload = {
  role?: string | null;
};

/**
 * Why: Restricts a route (or route group) to users holding one of the roles.
 * When: Declared after `authMiddleware` in a route's `preHandler` list.
 * Where: `modules/<name>/routes/*.ts`.
 * How: Reads `request.auth`, which `authMiddleware` populates.
 */
export function requireRole(...allowedRoles: string[]) {
  const roles = allowedRoles.map((role) => role.toLowerCase());

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = request.auth as AuthPayload | undefined | null;

    if (!auth) {
      return reply.code(HttpStatusCodes.UNAUTHORIZED).send({ message: "Unauthorized" });
    }

    const userRole = String(auth.role ?? "").toLowerCase();
    if (!roles.includes(userRole)) {
      return reply.code(HttpStatusCodes.FORBIDDEN).send({ message: "Forbidden: Insufficient permissions" });
    }
  };
}
