import { env } from "@/env.js";

/**
 * Why: Database connection settings.
 * When: Database bootstrap and dialect detection.
 * Where: src/config/database.ts.
 * How: Only DATABASE_URL is required. Pool settings use generic,
 *      provider-agnostic defaults.
 */

const rawUrl = env.DATABASE_URL;
const isSqlite = rawUrl.startsWith("sqlite:") || rawUrl.startsWith("file:");

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
   * Default to false. Users can append `?sslmode=require` to their
   * DATABASE_URL for Postgres/MySQL if their provider requires it.
   */
  ssl: false
};

export type DatabaseConfig = typeof databaseConfig;

export function detectDialectFrom(connectionUrl: string): "sqlite" | "mysql" | "postgresql" {
  const value = connectionUrl.toLowerCase();
  if (value.startsWith("mysql")) return "mysql";
  if (value.startsWith("postgres")) return "postgresql";
  return "sqlite";
}

export const databaseDialect = detectDialectFrom(rawUrl);
