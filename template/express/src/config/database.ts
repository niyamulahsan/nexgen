import { env } from "@/env.js";

/**
 * Why: Database connection settings.
 * When: Database bootstrap and dialect detection.
 * Where: src/config/database.ts.
 * How: Only DATABASE_URL is required. Pool settings use generic,
 *      provider-agnostic defaults.
 */

const rawUrl = env.DATABASE_URL;

export const databaseConfig = {
  // If it's sqlite, convert "sqlite:./db.sqlite" to "file:./db.sqlite"
  url: rawUrl.startsWith("sqlite:") ? `file:${rawUrl.slice("sqlite:".length)}` : rawUrl,

  /** Generic, sensible pool defaults for any provider */
  pool: {
    max: 10,
    idleTimeout: 20000, // ms
    connectTimeout: 10000, // ms
    keepAlive: true
  },

  /**
   * Default to true. If a provider (like a pooler) doesn't support it,
   * they usually indicate this in the connection string or require the user
   * to handle it at the driver level.
   */
  prepare: true,

  /**
   * Require TLS for MySQL and PostgreSQL connections. Set this to true, or
   * append `?sslmode=require` to DATABASE_URL if your provider documents that.
   */
  ssl: false
};

export type DatabaseConfig = typeof databaseConfig;

export function detectDialectFrom(url: string): "sqlite" | "mysql" | "postgresql" {
  const value = url.toLowerCase();
  if (value.startsWith("mysql")) return "mysql";
  if (value.startsWith("postgres")) return "postgresql";
  return "sqlite";
}

export const databaseDialect = detectDialectFrom(rawUrl);
