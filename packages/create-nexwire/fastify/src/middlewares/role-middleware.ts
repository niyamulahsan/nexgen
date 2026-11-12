// ./src/middlewares/role-middleware.ts

import type { FastifyReply, FastifyRequest } from "fastify";
import { HttpStatusCodes } from "@/framework/facade.js";

/**
 * Why: Restricts a route (or route group) to users holding one of the roles.
 * When: Declared after `authMiddleware` in a route's `preHandler` list.
 * Where: `modules/<name>/routes/*.ts`.
 * How: Reads `request.auth`, which `authMiddleware` populates.
 */
export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = request.auth;
    if (!auth) return reply.code(HttpStatusCodes.UNAUTHORIZED).send({ message: "Unauthorized" });

    if (!allowedRoles.includes(auth.role?.name)) {
      return reply.code(HttpStatusCodes.FORBIDDEN).send({ message: "Forbidden: Insufficient permissions" });
    }
  };
}
