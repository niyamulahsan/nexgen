import type { FastifyReply, FastifyRequest } from "fastify";
import { cookie, HttpStatusCodes } from "@/framework/facade.js";
import type {
  ForgotPasswordType,
  LoginType,
  RefreshTokenType,
  RegisterType,
  ResetPasswordType,
  VerifyEmailType
} from "@/modules/auth/schemas/auth.js";
import { registerService } from "@/modules/auth/services/register.js";
import { forgotPasswordService } from "../services/forgetpassword.js";
import { loginService } from "../services/login.js";
import { logoutService } from "../services/logout.js";
import { logoutAllDevicesService } from "../services/logoutalldevices.js";
import { meService } from "../services/me.js";
import { refreshTokenService } from "../services/refreshtoken.js";
import { resetPasswordService } from "../services/resetpassword.js";
import { verifyEmailService } from "../services/verifyemail.js";

type Body<T> = FastifyRequest<{ Body: T }>;

/**
 * Why: Creates a new user, issues tokens, and triggers signup side effects.
 * When: Used on first-time account creation.
 * Where: POST auth register route.
 */
export const register = async (request: Body<RegisterType>, reply: FastifyReply) => {
  try {
    const result = await registerService.register(request, reply, request.body);

    switch (result.kind) {
      case "email_exists":
        return reply.code(HttpStatusCodes.UNPROCESSABLE_ENTITY).send({ message: result.message });

      case "verification_required":
        return reply.code(HttpStatusCodes.CREATED).send({ message: result.message });

      case "registered":
        return reply.code(HttpStatusCodes.CREATED).send({
          message: result.message,
          data: result.data
        });
    }
  } catch (error) {
    console.error("Register error:", error);
    return reply.code(HttpStatusCodes.INTERNAL_SERVER_ERROR).send({ message: "Failed to register user" });
  }
};

/**
 * Why: Authenticates user credentials and rotates active login cookies/tokens.
 * When: Used whenever a user signs in.
 * Where: POST auth login route.
 */
export const login = async (request: Body<LoginType>, reply: FastifyReply) => {
  try {
    const result = await loginService.login(request, reply, request.body);

    switch (result.kind) {
      case "invalid_credentials":
        return reply.code(HttpStatusCodes.UNAUTHORIZED).send({ message: result.message });

      case "email_not_verified":
        return reply.code(HttpStatusCodes.FORBIDDEN).send({ message: result.message });

      case "logged_in":
        return reply.code(HttpStatusCodes.OK).send({
          message: result.message,
          data: result.data
        });
    }
  } catch (error) {
    console.error("Login error:", error);
    return reply.code(HttpStatusCodes.INTERNAL_SERVER_ERROR).send({ message: "Failed to login" });
  }
};

/**
 * Why: Returns the currently authenticated user profile.
 * When: Used by clients to bootstrap session/user state.
 * Where: GET auth me route.
 */
export const me = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const auth = request.auth as { id: number };
    const result = await meService.me(auth.id);

    switch (result.kind) {
      case "not_found":
        return reply.code(HttpStatusCodes.NOT_FOUND).send({ message: result.message });

      case "found":
        return reply.code(HttpStatusCodes.OK).send({
          message: result.message,
          data: result.data
        });
    }
  } catch (error) {
    console.error("Me error:", error);
    return reply.code(HttpStatusCodes.INTERNAL_SERVER_ERROR).send({ message: "Failed to fetch user" });
  }
};

/**
 * Why: Revokes current refresh token and clears auth cookies.
 * When: Used when the active device logs out.
 * Where: POST auth logout route.
 */
export const logout = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const result = await logoutService.logout(request, reply);

    // cookie cleanup is an HTTP concern — stays in the controller
    cookie.deleteAuth(reply);
    cookie.deleteRefresh(reply);

    return reply.code(HttpStatusCodes.OK).send({ message: result.message });
  } catch (error) {
    console.error("Logout error:", error);

    cookie.deleteAuth(reply);
    cookie.deleteRefresh(reply);

    return reply.code(HttpStatusCodes.INTERNAL_SERVER_ERROR).send({ message: "Failed to logout" });
  }
};

/**
 * Why: Starts password reset flow and queues email delivery event.
 * When: Used when user requests a forgot-password link.
 * Where: POST auth forgot-password route.
 */
export const forgotPassword = async (request: Body<ForgotPasswordType>, reply: FastifyReply) => {
  try {
    const result = await forgotPasswordService.forgotPassword(request.body);

    // Single success path — intentionally identical whether or not the email exists.
    return reply.code(HttpStatusCodes.OK).send({ message: result.message });
  } catch (error) {
    console.error("Forgot password error:", error);
    return reply.code(HttpStatusCodes.INTERNAL_SERVER_ERROR).send({ message: "Failed to process forgot password request" });
  }
};

/**
 * Why: Verifies reset token and persists the new password.
 * When: Used after user submits reset token + new password.
 * Where: POST auth reset-password route.
 */
export const resetPassword = async (request: Body<ResetPasswordType>, reply: FastifyReply) => {
  try {
    const result = await resetPasswordService.resetPassword(request.body);

    switch (result.kind) {
      case "invalid_token":
        return reply.code(HttpStatusCodes.UNPROCESSABLE_ENTITY).send({ message: result.message });

      case "reset":
        return reply.code(HttpStatusCodes.OK).send({ message: result.message });
    }
  } catch (error) {
    console.error("Reset password error:", error);
    return reply.code(HttpStatusCodes.INTERNAL_SERVER_ERROR).send({ message: "Failed to reset password" });
  }
};

/**
 * Why: Validates email verification token and marks user as verified.
 * When: Used when user opens verification link from inbox.
 * Where: POST auth verify-email route.
 */
export const verifyEmail = async (request: Body<VerifyEmailType>, reply: FastifyReply) => {
  try {
    const result = await verifyEmailService.verifyEmail(request.body);

    switch (result.kind) {
      case "not_required":
        return reply.code(HttpStatusCodes.OK).send({ message: result.message });

      case "invalid_token":
        return reply.code(HttpStatusCodes.UNPROCESSABLE_ENTITY).send({ message: result.message });

      case "verified":
        return reply.code(HttpStatusCodes.OK).send({ message: result.message });
    }
  } catch (error) {
    console.error("Verify email error:", error);
    return reply.code(HttpStatusCodes.INTERNAL_SERVER_ERROR).send({ message: "Failed to verify email" });
  }
};

/**
 * Why: Rotates refresh token and reissues access credentials.
 * When: Used when access token expires but refresh token is still valid.
 * Where: POST auth refresh-token route.
 */
export const refreshToken = async (request: Body<RefreshTokenType>, reply: FastifyReply) => {
  try {
    const result = await refreshTokenService.refreshToken(request.body);

    switch (result.kind) {
      case "invalid_token":
      case "revoked":
      case "expired":
      case "user_not_found":
        return reply.code(HttpStatusCodes.UNAUTHORIZED).send({ message: result.message });

      case "refreshed": {
        // Cookie handling stays in the controller — it's an HTTP concern.
        await cookie.setAuth(reply, result.cookies.accessToken);
        await cookie.setRefresh(reply, result.cookies.refreshToken, result.cookies.refreshExpiry);

        return reply.code(HttpStatusCodes.OK).send({
          message: result.message,
          data: result.data
        });
      }
    }
  } catch (error) {
    console.error("Refresh token error:", error);
    return reply.code(HttpStatusCodes.UNAUTHORIZED).send({ message: "Invalid or expired refresh token" });
  }
};

/**
 * Why: Revokes all refresh tokens for account-wide logout.
 * When: Used for "logout from all devices" security action.
 * Where: POST auth logout-all-devices route.
 */
export const logoutAllDevices = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const auth = request.auth as { id: number } | undefined | null;

    if (!auth) {
      return reply.code(HttpStatusCodes.UNAUTHORIZED).send({ message: "Unauthorized" });
    }

    const result = await logoutAllDevicesService.logoutAllDevices(auth.id);

    // cookie cleanup is an HTTP concern — stays in the controller
    cookie.deleteAuth(reply);
    cookie.deleteRefresh(reply);

    return reply.code(HttpStatusCodes.OK).send({ message: result.message });
  } catch (error) {
    console.error("Logout all devices error:", error);
    return reply.code(HttpStatusCodes.INTERNAL_SERVER_ERROR).send({ message: "Failed to logout from all devices" });
  }
};
