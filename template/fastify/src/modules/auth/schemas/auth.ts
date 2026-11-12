// ./src/modules/auth/schemas/auth.ts

import { z } from "@/framework/facade.js";

export const MessageSchema = z.object({
  message: z.string()
});

export const RoleSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.email(),
  roleId: z.number().nullable().optional(),
  role: RoleSchema.nullable().optional(),
  emailVerifiedAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const RegisterSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.email(),
    password: z
      .string()
      .min(6)
      .max(100)
      .regex(/[a-z]/, "Password must contain lowercase letter")
      .regex(/[A-Z]/, "Password must contain uppercase letter")
      .regex(/[^A-Za-z0-9]/, "Password must contain special character"),
    password_confirmation: z.string(),
    remember: z.boolean().optional().default(false)
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.password_confirmation) {
      ctx.addIssue({
        code: "custom",
        path: ["password_confirmation"],
        message: "Password confirmation does not match"
      });
    }
  });

export type RegisterType = z.input<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  remember: z.boolean().optional().default(false)
});

export type LoginType = z.input<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.email()
});

export type ForgotPasswordType = z.input<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    email: z.email(),
    token: z.string().min(1),
    password: z
      .string()
      .min(6)
      .max(100)
      .regex(/[a-z]/, "Password must contain lowercase letter")
      .regex(/[A-Z]/, "Password must contain uppercase letter")
      .regex(/[^A-Za-z0-9]/, "Password must contain special character"),
    password_confirmation: z.string()
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.password_confirmation) {
      ctx.addIssue({
        code: "custom",
        path: ["password_confirmation"],
        message: "Password confirmation does not match"
      });
    }
  });

export type ResetPasswordType = z.input<typeof ResetPasswordSchema>;

export const RefreshTokenSchema = z.object({
  refresh_token: z.string().min(1)
});

export type RefreshTokenType = z.input<typeof RefreshTokenSchema>;

export const VerifyEmailSchema = z.object({
  email: z.email(),
  token: z.string().min(1)
});

export type VerifyEmailType = z.input<typeof VerifyEmailSchema>;

export const AuthResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    user: UserSchema,
    access_token: z.string(),
    refresh_token: z.string(),
    token_type: z.literal("Bearer")
  })
});

/**
 * Register returns 201 with only `message` when email verification is required,
 * so `data` must be optional. Fastify enforces response schemas at runtime.
 */
export const RegisterResponseSchema = z.object({
  message: z.string(),
  data: AuthResponseSchema.shape.data.optional()
});

export const MeResponseSchema = z.object({
  message: z.string(),
  data: UserSchema
});

export const IdParamsSchema = z.object({
  id: z.coerce.number()
});
