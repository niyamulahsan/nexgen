import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { HttpStatusCodes, ValidationErrorSchema, z } from "@/framework/facade.js";
import { authMiddleware } from "@/middlewares/auth-middleware.js";
import { requireRole } from "@/middlewares/role-middleware.js";
import { index, show } from "@/modules/auth/controllers/role.js";
import { IdParamsSchema, RoleSchema } from "@/modules/auth/schemas/auth.js";

const ErrorSchema = z.object({ message: z.string() });

/**
 * Why: Admin-only role lookup endpoints.
 * When: Mounted by the module route loader at `/api/auth`.
 * Where: `src/modules/auth/routes/role.ts`.
 * How: A scoped `preHandler` chain runs auth first, then the role check.
 */
const roleRoutes: FastifyPluginAsyncZod = async (app) => {
  await app.register(async (scope) => {
    scope.addHook("preHandler", authMiddleware);
    scope.addHook("preHandler", requireRole("admin"));

    scope.route({
      method: "GET",
      url: "/role",
      schema: {
        tags: ["Role"],
        description: "List all roles",
        response: {
          [HttpStatusCodes.OK]: z.object({ message: z.string(), data: z.array(RoleSchema) }),
          [HttpStatusCodes.UNAUTHORIZED]: ErrorSchema,
          [HttpStatusCodes.UNPROCESSABLE_ENTITY]: ValidationErrorSchema,
          [HttpStatusCodes.FORBIDDEN]: ErrorSchema
        }
      },
      handler: index
    });

    scope.route({
      method: "GET",
      url: "/role/:id",
      schema: {
        tags: ["Role"],
        description: "Show one role",
        params: IdParamsSchema,
        response: {
          [HttpStatusCodes.OK]: z.object({ message: z.string(), data: RoleSchema.nullable() }),
          [HttpStatusCodes.UNAUTHORIZED]: ErrorSchema,
          [HttpStatusCodes.UNPROCESSABLE_ENTITY]: ValidationErrorSchema,
          [HttpStatusCodes.FORBIDDEN]: ErrorSchema
        }
      },
      handler: show
    });
  });
};

export default roleRoutes;
