import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { HttpStatusCodes, loginLimiter, ValidationErrorSchema, z } from "@/framework/facade.js";
import { authMiddleware } from "@/middlewares/auth-middleware.js";
import {
  forgotPassword,
  login,
  logout,
  logoutAllDevices,
  me,
  refreshToken,
  register,
  resetPassword,
  verifyEmail
} from "@/modules/auth/controllers/auth.js";
import {
  AuthResponseSchema,
  ForgotPasswordSchema,
  LoginSchema,
  MeResponseSchema,
  MessageSchema,
  RefreshTokenSchema,
  RegisterResponseSchema,
  RegisterSchema,
  ResetPasswordSchema,
  VerifyEmailSchema
} from "@/modules/auth/schemas/auth.js";

const ErrorSchema = z.object({ message: z.string() });

/**
 * Why: Auth HTTP surface, split into public and protected scopes.
 * When: Mounted by the module route loader at `/api/auth`.
 * Where: `src/modules/auth/routes/index.ts`.
 * How: Public routes use the strict login rate limit; protected routes live in
 *      a child plugin whose scoped `preHandler` hook resolves `request.auth`.
 */
const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: "POST",
    url: "/register",
    schema: {
      tags: ["Auth"],
      description: "Register a new user",
      body: RegisterSchema,
      response: {
        [HttpStatusCodes.CREATED]: RegisterResponseSchema,
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: ValidationErrorSchema
      }
    },
    config: { rateLimit: loginLimiter },
    handler: register
  });

  app.route({
    method: "POST",
    url: "/login",
    schema: {
      tags: ["Auth"],
      description: "Login user",
      body: LoginSchema,
      response: {
        [HttpStatusCodes.OK]: AuthResponseSchema,
        [HttpStatusCodes.UNAUTHORIZED]: ErrorSchema,
        [HttpStatusCodes.FORBIDDEN]: ErrorSchema,
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: ValidationErrorSchema
      }
    },
    config: { rateLimit: loginLimiter },
    handler: login
  });

  app.route({
    method: "POST",
    url: "/forgot-password",
    schema: {
      tags: ["Auth"],
      description: "Send reset password email",
      body: ForgotPasswordSchema,
      response: {
        [HttpStatusCodes.OK]: MessageSchema,
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: ValidationErrorSchema
      }
    },
    config: { rateLimit: loginLimiter },
    handler: forgotPassword
  });

  app.route({
    method: "POST",
    url: "/reset-password",
    schema: {
      tags: ["Auth"],
      description: "Reset password using token",
      body: ResetPasswordSchema,
      response: {
        [HttpStatusCodes.OK]: MessageSchema,
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: ValidationErrorSchema
      }
    },
    config: { rateLimit: loginLimiter },
    handler: resetPassword
  });

  app.route({
    method: "POST",
    url: "/verify-email",
    schema: {
      tags: ["Auth"],
      description: "Verify user email using token",
      body: VerifyEmailSchema,
      response: {
        [HttpStatusCodes.OK]: MessageSchema,
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: ValidationErrorSchema
      }
    },
    config: { rateLimit: loginLimiter },
    handler: verifyEmail
  });

  app.route({
    method: "POST",
    url: "/refresh-token",
    schema: {
      tags: ["Auth"],
      description: "Refresh access token",
      body: RefreshTokenSchema,
      response: {
        [HttpStatusCodes.OK]: AuthResponseSchema,
        [HttpStatusCodes.UNAUTHORIZED]: ErrorSchema,
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: ValidationErrorSchema
      }
    },
    config: { rateLimit: loginLimiter },
    handler: refreshToken
  });

  await app.register(async (protectedScope) => {
    protectedScope.addHook("preHandler", authMiddleware);

    protectedScope.route({
      method: "GET",
      url: "/me",
      schema: {
        tags: ["Auth"],
        description: "Get authenticated user",
        response: {
          [HttpStatusCodes.OK]: MeResponseSchema,
          [HttpStatusCodes.UNAUTHORIZED]: ErrorSchema,
          [HttpStatusCodes.NOT_FOUND]: ErrorSchema
        }
      },
      handler: me
    });

    protectedScope.route({
      method: "POST",
      url: "/logout",
      schema: {
        tags: ["Auth"],
        description: "Logout user from current device",
        response: {
          [HttpStatusCodes.OK]: MessageSchema,
          [HttpStatusCodes.UNAUTHORIZED]: ErrorSchema
        }
      },
      handler: logout
    });

    protectedScope.route({
      method: "POST",
      url: "/logout-all",
      schema: {
        tags: ["Auth"],
        description: "Logout user from all devices",
        response: {
          [HttpStatusCodes.OK]: MessageSchema,
          [HttpStatusCodes.UNAUTHORIZED]: ErrorSchema
        }
      },
      handler: logoutAllDevices
    });
  });
};

export default authRoutes;
