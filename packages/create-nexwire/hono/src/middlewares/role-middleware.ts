// ./src/middlewares/role-middleware.ts

import type { Context, Next } from "hono";
import { HttpStatusCodes } from "@/framework/facade.js";

export function requireRole(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);

    if (!allowedRoles.includes(auth.role?.name)) {
      return c.json({ message: "Forbidden: Insufficient permissions" }, HttpStatusCodes.FORBIDDEN);
    }

    return await next();
  };
}
