import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { env } from "@/env.js";

const baseOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "Lax" as const,
  path: "/"
};

export const cookie = {
  /**
   * Why: Stores short-lived access token cookie for authenticated requests.
   * When: Login/register/refresh responses.
   * Where: Auth controllers/helpers.
   * How: Sets httpOnly cookie with configured access expiry.
   */
  setAuth(c: Context, token: string) {
    setCookie(c, `${env.COOKIE_NAME}_access`, token, {
      ...baseOptions,
      maxAge: env.JWT_ACCESS_EXPIRY
    });
  },

  /**
   * Why: Stores refresh token cookie for token rotation.
   * When: Login/register/refresh responses.
   * Where: Auth controllers/helpers.
   * How: Sets httpOnly cookie with explicit or default refresh maxAge.
   */
  setRefresh(c: Context, token: string, maxAge?: number) {
    setCookie(c, `${env.COOKIE_NAME}_refresh`, token, {
      ...baseOptions,
      maxAge: typeof maxAge === "number" ? maxAge : env.JWT_REFRESH_EXPIRY
    });
  },

  /**
   * Why: Reads access token cookie from request context.
   * When: Auth middleware validates request identity.
   * Where: Middleware and auth helpers.
   * How: Resolves cookie by configured access cookie name.
   */
  getAuth(c: Context) {
    return getCookie(c, `${env.COOKIE_NAME}_access`);
  },

  /**
   * Why: Reads refresh token cookie from request context.
   * When: Refresh and logout flows.
   * Where: Auth middleware/controllers.
   * How: Resolves cookie by configured refresh cookie name.
   */
  getRefresh(c: Context) {
    return getCookie(c, `${env.COOKIE_NAME}_refresh`);
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
