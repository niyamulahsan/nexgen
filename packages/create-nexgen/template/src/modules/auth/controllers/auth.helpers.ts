import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { env } from "@/env.js";
import { cookie, db, jwt } from "@/framework/facade.js";
import { refreshTokens } from "@/modules/auth/database/models/user.js";

/**
 * Why: Removes sensitive/internal fields before returning user payload.
 * When: Used in auth responses like register/login/me.
 * Where: Called by auth.controller handlers.
 */
export function sanitizeUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt ? String(user.emailVerifiedAt) : null,
    roleId: user.roleId ?? null,
    role: user.role || null,
    createdAt: user.createdAt ? String(user.createdAt) : null,
    updatedAt: user.updatedAt ? String(user.updatedAt) : null
  };
}

/**
 * Why: Creates a cryptographically secure password reset token.
 * When: Used during forgot-password flow before hashing/storing.
 * Where: Called by forgotPassword handler.
 */
export function makeResetToken() {
  return randomBytes(32).toString("hex");
}

export function makeEmailVerificationToken() {
  return randomBytes(32).toString("hex");
}

/**
 * Why: Hashes reset token so plain token is never stored in DB.
 * When: Used for insert and verification in reset flow.
 * Where: Called by forgotPassword/resetPassword handlers.
 */
export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Why: Revokes currently active refresh token from cookie context.
 * When: Used before issuing new tokens or during logout.
 * Where: Called by register/login/logout flows.
 */
export async function revokeCurrentRefreshToken(c: any) {
  const token = await cookie.getRefresh(c);
  if (!token) return;

  const payload = await jwt.verifyToken(token, "refresh");
  if (payload?.jti) {
    await db.delete(refreshTokens).where(eq(refreshTokens.jti, payload.jti as string));
  }
}

/**
 * Why: Issues access+refresh tokens, persists refresh token, sets cookies.
 * When: Used after successful auth actions (register/login/refresh patterns).
 * Where: Called by auth.controller handlers.
 */
export async function issueTokens(c: any, user: any, options?: { remember?: boolean }) {
  const remember = !!options?.remember;
  const refreshExpiry = remember ? env.JWT_REFRESH_REMEMBER_EXPIRY : env.JWT_REFRESH_EXPIRY;
  const role = user.role || null;
  const accessToken = await jwt.generateToken(
    {
      id: user.id,
      email: user.email,
      roleId: role?.id ?? null,
      role: role?.name ?? null,
      remember
    },
    "access"
  );
  const refreshToken = await jwt.generateToken(
    {
      id: user.id,
      email: user.email,
      roleId: role?.id ?? null,
      role: role?.name ?? null,
      remember
    },
    "refresh",
    refreshExpiry
  );

  if (refreshToken.jti) {
    await db.insert(refreshTokens).values({
      userId: user.id,
      jti: refreshToken.jti,
      revoked: 0,
      expiresAt: new Date(refreshToken.exp * 1000)
    });
  }

  await cookie.setAuth(c, accessToken.token);
  await cookie.setRefresh(c, refreshToken.token, refreshExpiry);

  return { accessToken: accessToken.token, refreshToken: refreshToken.token };
}
