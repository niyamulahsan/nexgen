import type { Context, Next } from "hono";
import { eq } from "drizzle-orm";
import { cookie, db, jwt } from "@/framework/facade.js";
import { refreshTokens, users } from "@/modules/auth/database/models/user.js";

export async function authMiddleware(c: Context, next: Next) {
  const accessToken = await cookie.getAuth(c);

  if (accessToken) {
    const accessPayload = await jwt.verifyToken(accessToken, "access");

    if (accessPayload) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, accessPayload.id as number),
        with: { role: true }
      });

      if (!user) {
        cookie.deleteAuth(c);
        cookie.deleteRefresh(c);
        return c.json({ message: "Unauthorized" }, 401);
      }

      c.set("auth", {
        ...accessPayload,
        id: user.id,
        email: user.email,
        roleId: user.role?.id ?? null,
        role: user.role?.name ?? null
      });
      return await next();
    }
  }

  const refreshToken = await cookie.getRefresh(c);

  if (!refreshToken) {
    cookie.deleteAuth(c);
    cookie.deleteRefresh(c);
    return c.json({ message: "Unauthorized" }, 401);
  }

  const refreshPayload = await jwt.verifyToken(refreshToken, "refresh");

  if (!refreshPayload?.jti) {
    cookie.deleteAuth(c);
    cookie.deleteRefresh(c);
    return c.json({ message: "Invalid token" }, 401);
  }

  const storedToken = await db.query.refreshTokens.findFirst({
    where: eq(refreshTokens.jti, refreshPayload.jti as string)
  });

  if (!storedToken || storedToken.revoked === 1) {
    cookie.deleteAuth(c);
    cookie.deleteRefresh(c);
    return c.json({ message: "Invalid token" }, 401);
  }

  if (storedToken.expiresAt.getTime() < Date.now()) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));
    cookie.deleteAuth(c);
    cookie.deleteRefresh(c);
    return c.json({ message: "Invalid token" }, 401);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, refreshPayload.id as number),
    with: { role: true }
  });

  if (!user) {
    cookie.deleteAuth(c);
    cookie.deleteRefresh(c);
    return c.json({ message: "Unauthorized" }, 401);
  }

  const newAccessToken = await jwt.generateToken(
    {
      id: user.id,
      email: user.email,
      roleId: user.role?.id ?? null,
      role: user.role?.name ?? null
    },
    "access"
  );

  await cookie.setAuth(c, newAccessToken.token);
  c.set("auth", {
    id: user.id,
    email: user.email,
    roleId: user.role?.id ?? null,
    role: user.role?.name ?? null,
    type: "access"
  });
  return await next();
}
