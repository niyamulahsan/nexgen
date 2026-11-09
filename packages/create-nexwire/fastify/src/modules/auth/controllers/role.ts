import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db, HttpStatusCodes } from "@/framework/facade.js";
import { roles } from "@/modules/auth/database/models/role.js";

function sanitizeRole(role: any) {
  if (!role) return null;
  return {
    id: role.id,
    name: role.name,
    createdAt: role.createdAt ? String(role.createdAt) : null,
    updatedAt: role.updatedAt ? String(role.updatedAt) : null
  };
}

/**
 * Why: Returns role records for role-aware UI and authorization setup.
 * When: Used by admin/management screens that need available roles.
 * Where: Mounted under auth role routes.
 */
export const index = async (_request: FastifyRequest, reply: FastifyReply) => {
  const result = await db.query.roles.findMany();
  return reply.code(HttpStatusCodes.OK).send({ message: "Success", data: result.map(sanitizeRole) });
};

/**
 * Why: Fetches a single role to inspect role metadata by id.
 * When: Used for detail views or role validation checks.
 * Where: Mounted on auth role detail route with path param id.
 */
export const show = async (request: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) => {
  const { id } = request.params;
  const result = await db.query.roles.findFirst({ where: eq(roles.id, Number(id)) });
  return reply.code(HttpStatusCodes.OK).send({ message: "Success", data: sanitizeRole(result) });
};
