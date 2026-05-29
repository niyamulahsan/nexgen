import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { env } from "@/env.js";

function originOf(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function needsCrossSiteCookie() {
  const appOrigin = originOf(env.APP_URL);
  const frontendOrigin = originOf(env.FRONTEND_URL);
  return Boolean(appOrigin && frontendOrigin && appOrigin !== frontendOrigin);
}

function baseOptions() {
  const crossSiteCookie = needsCrossSiteCookie();
  const sameSite: "None" | "Lax" = crossSiteCookie ? "None" : "Lax";
  return {
    httpOnly: true,
    secure: crossSiteCookie,
    sameSite,
    path: "/"
  };
}

export const cookie = {
  /**
   * Why: Stores short-lived access token cookie for authenticated requests.
   * When: Login/register/refresh responses.
   * Where: Auth controllers/helpers.
   * How: Sets httpOnly cookie with configured access expiry.
   */
  async setAuth(c: Context, token: string) {
    await setSignedCookie(c, `${env.COOKIE_NAME}_access`, token, env.COOKIE_SECRET, {
      ...baseOptions(),
      maxAge: env.JWT_ACCESS_EXPIRY
    });
  },

  /**
   * Why: Stores refresh token cookie for token rotation.
   * When: Login/register/refresh responses.
   * Where: Auth controllers/helpers.
   * How: Sets httpOnly cookie with explicit or default refresh maxAge.
   */
  async setRefresh(c: Context, token: string, maxAge?: number) {
    await setSignedCookie(c, `${env.COOKIE_NAME}_refresh`, token, env.COOKIE_SECRET, {
      ...baseOptions(),
      maxAge: typeof maxAge === "number" ? maxAge : env.JWT_REFRESH_EXPIRY
    });
  },

  /**
   * Why: Reads access token cookie from request context.
   * When: Auth middleware validates request identity.
   * Where: Middleware and auth helpers.
   * How: Resolves cookie by configured access cookie name.
   */
  async getAuth(c: Context) {
    const token = await getSignedCookie(c, env.COOKIE_SECRET, `${env.COOKIE_NAME}_access`);
    return token || undefined;
  },

  /**
   * Why: Reads refresh token cookie from request context.
   * When: Refresh and logout flows.
   * Where: Auth middleware/controllers.
   * How: Resolves cookie by configured refresh cookie name.
   */
  async getRefresh(c: Context) {
    const token = await getSignedCookie(c, env.COOKIE_SECRET, `${env.COOKIE_NAME}_refresh`);
    return token || undefined;
  },

  /**
   * Why: Clears access token cookie.
   * When: Logout or invalid token handling.
   * Where: Auth middleware/controllers.
   * How: Deletes cookie path-scoped to root.
   */
  deleteAuth(c: Context) {
    deleteCookie(c, `${env.COOKIE_NAME}_access`, { path: "/" });
  },

  /**
   * Why: Clears refresh token cookie.
   * When: Logout or invalid token handling.
   * Where: Auth middleware/controllers.
   * How: Deletes cookie path-scoped to root.
   */
  deleteRefresh(c: Context) {
    deleteCookie(c, `${env.COOKIE_NAME}_refresh`, { path: "/" });
  }
};
