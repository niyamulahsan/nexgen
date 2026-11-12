// ./src/config/validate.ts

import { databaseConfig } from "./database.js";
import { mailConfig } from "./mail.js";
import { redisConfig } from "./redis.js";
import { storageConfig } from "./storage.js";

/**
 * Why: Validates that resolved configs are internally consistent at startup.
 * When: Called before any framework subsystem initializes.
 * Where: kernel.ts, before storage.init() and initRedis().
 * How: Checks cross-config dependencies and throws clear errors for inconsistencies.
 */
export function validateConfig(): void {
  if (!databaseConfig.url) {
    throw new Error("DATABASE_URL is required but is empty");
  }

  if (storageConfig.driver === "s3") {
    if (!storageConfig.bucket) {
      throw new Error("STORAGE_BUCKET is required when storage driver is s3");
    }
    if (!storageConfig.accessKeyId || !storageConfig.secretAccessKey) {
      throw new Error("STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY are required when storage driver is s3");
    }
  }

  if (redisConfig.enabled) {
    try {
      const url = new URL(redisConfig.url);

      // Ensure it starts with redis:// or rediss://
      if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
        throw new Error("URL must start with redis:// or rediss://");
      }

      // Hostname is mandatory (e.g., localhost, 127.0.0.1, redis-container)
      if (!url.hostname) {
        throw new Error("URL must include a valid hostname");
      }

      // Note: We do NOT check if the port is empty.
      // ioredis automatically defaults to 6379 if no port is provided.
    } catch (error) {
      throw new Error(`REDIS_URL is invalid: "${redisConfig.url}" — ${error instanceof Error ? error.message : error}`);
    }
  }

  if (!mailConfig.failSilent && !mailConfig.username) {
    throw new Error("MAIL_USERNAME is required when MAIL_FAIL_SILENT is false");
  }
}
