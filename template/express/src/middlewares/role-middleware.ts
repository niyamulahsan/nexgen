// ./src/middlewares/role-middleware.ts

import type { NextFunction, Request, Response } from "express";
import { HttpStatusCodes } from "@/framework/facade.js";

export function requireRole(...allowedRoles: string[]) {
  return async (_req: Request, res: Response, next: NextFunction) => {
    const auth = res.locals.auth;
    if (!auth) return res.status(HttpStatusCodes.UNAUTHORIZED).json({ message: "Unauthorized" });

    if (!allowedRoles.includes(auth.role?.name)) {
      return res.status(HttpStatusCodes.FORBIDDEN).json({ message: "Forbidden: Insufficient permissions" });
    }

    return next();
  };
}
