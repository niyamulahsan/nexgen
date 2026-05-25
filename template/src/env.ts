import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { z } from "zod";

expand(config({ override: true }));

const envSchema = z
  .object({
    APP_NAME: z.string().default("nexgen"),
    APP_ENV: z.enum(["development", "production", "test"]).default("development"),
    APP_PORT: z.coerce.number().default(3000),
    APP_URL: z.string().trim().min(1, "APP_URL is required in .env"),
    FRONTEND_URL: z.string().optional().transform((value) => value?.trim() || undefined),
    OPEN_API: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("debug"),
    CORS_ORIGIN: z.string().default("*"),
    DATABASE_URL: z.string().default("sqlite:./src/storage/database/nexgen.sqlite"),
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    STORAGE_DISK: z.enum(["public", "private", "tmp"]).default("public"),
    STORAGE_BUCKET: z.string().optional().transform((value) => value?.trim() || undefined),
    STORAGE_REGION: z.string().default("us-east-1"),
    STORAGE_ENDPOINT: z.string().optional().transform((value) => value?.trim() || undefined),
    STORAGE_ACCESS_KEY_ID: z.string().optional().transform((value) => value?.trim() || undefined),
    STORAGE_SECRET_ACCESS_KEY: z.string().optional().transform((value) => value?.trim() || undefined),
    STORAGE_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
    STORAGE_SIGNED_URL_TTL_SECONDS: z.coerce.number().default(900),
    REDIS: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
    REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
    REDIS_PREFIX: z.string().default("nexgen").transform((value) => value.trim()),
    BULLMQ_UI_ALLOWED_EMAILS: z.string().default(""),
    SOCKET: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
    FRONTEND: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
    JWT_ACCESS_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),
    JWT_ACCESS_EXPIRY: z.coerce.number().default(900),
    JWT_REFRESH_EXPIRY: z.coerce.number().default(2592000),
    JWT_REFRESH_REMEMBER_EXPIRY: z.coerce.number().default(604800),
    COOKIE_NAME: z.string().default("nexgen"),
    COOKIE_SECRET: z.string(),
    SESSION_COOKIE: z.string().trim().min(1, "SESSION_COOKIE is required in .env"),
    SESSION_TTL_SECONDS: z.coerce.number(),
    CACHE_TTL_SECONDS: z.coerce.number().default(3600),
    REDIS_COMMANDER_PORT: z.coerce.number().default(1369),
    MAIL_PORT: z.coerce.number().default(1089),
    MAILDEV_WEB_PORT: z.coerce.number().default(1080),
    MAIL_HOST: z.string().default("127.0.0.1"),
    MAIL_USERNAME: z.string().default(""),
    MAIL_PASSWORD: z.string().default(""),
    MAIL_FROM_ADDRESS: z.string().default("noreply@nexgen.local"),
    MAIL_FAIL_SILENT: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
    AUTH_REQUIRE_EMAIL_VERIFICATION: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  }).superRefine((data, ctx) => {
    if (data.STORAGE_DRIVER === "s3") {
      if (!data.STORAGE_BUCKET) {
        ctx.addIssue({
          code: "custom",
          path: ["STORAGE_BUCKET"],
          message: "STORAGE_BUCKET is required when STORAGE_DRIVER=s3"
        });
      }

      if (!data.STORAGE_ACCESS_KEY_ID) {
        ctx.addIssue({
          code: "custom",
          path: ["STORAGE_ACCESS_KEY_ID"],
          message: "STORAGE_ACCESS_KEY_ID is required when STORAGE_DRIVER=s3"
        });
      }

      if (!data.STORAGE_SECRET_ACCESS_KEY) {
        ctx.addIssue({
          code: "custom",
          path: ["STORAGE_SECRET_ACCESS_KEY"],
          message: "STORAGE_SECRET_ACCESS_KEY is required when STORAGE_DRIVER=s3"
        });
      }
    }

    for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "COOKIE_SECRET"] as const) {
      if (!(data as any)[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required`
        });
      }
    }

    if (!data.REDIS) return;

    if (!data.REDIS_PREFIX) {
      ctx.addIssue({
        code: "custom",
        path: ["REDIS_PREFIX"],
        message: "REDIS_PREFIX is required when REDIS=true"
      });
    }
  });

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  FRONTEND_URL: parsedEnv.FRONTEND_URL
};

export type Env = typeof env;
