import type { Context, Next } from "hono";

type AuthPayload = {
  role?: string | null;
};

export function requireRole(...allowedRoles: string[]) {
  const roles = allowedRoles.map((role) => role.toLowerCase());

  return async (c: Context, next: Next) => {
    const auth = c.get("auth") as AuthPayload | undefined;

    if (!auth) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const userRole = String(auth.role ?? "").toLowerCase();
    if (!roles.includes(userRole)) {
      return c.json({ message: "Forbidden: Insufficient permissions" }, 403);
    }

    return await next();
  };
}
