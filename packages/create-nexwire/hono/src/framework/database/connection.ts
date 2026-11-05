import fs from "node:fs/promises";
import path from "node:path";
import { databaseConfig, detectDialectFrom } from "@/config/index.js";
import { loadAppSchema } from "@/framework/database/app-schema.js";

export type Dialect = "sqlite" | "mysql" | "postgresql";

let databaseInstance: any;
let pool: any;
let dialect: Dialect;

async function optionalImport<T = any>(name: string): Promise<T> {
  return import(name) as Promise<T>;
}

export function detectDialect(): Dialect {
  return detectDialectFrom(databaseConfig.url);
}

export async function initDatabase() {
  if (databaseInstance) return databaseInstance;

  dialect = detectDialect();
  const schema = await loadAppSchema();

  // --- SQLite (libsql) ---
  if (dialect === "sqlite") {
    let drizzleSqlite: any;
    let createClient: any;
    try {
      [{ drizzle: drizzleSqlite }, { createClient }] = await Promise.all([
        optionalImport("drizzle-orm/libsql"),
        optionalImport("@libsql/client")
      ]);
    } catch {
      throw new Error("Missing sqlite dependencies. Install with: npm/pnpm/yarn/bun add drizzle-orm @libsql/client");
    }

    const url = databaseConfig.url;

    if (!url.includes(":memory:")) {
      const rawPath = url.replace(/^file:/i, "");
      if (!rawPath.startsWith("//")) {
        const file = path.resolve(process.cwd(), rawPath);
        await fs.mkdir(path.dirname(file), { recursive: true });
      }
    }

    pool = createClient({ url });
    databaseInstance = drizzleSqlite(pool, { schema });
    return databaseInstance;
  }

  // --- MySQL ---
  if (dialect === "mysql") {
    let drizzleMysql: any;
    let mysql: any;
    try {
      [{ drizzle: drizzleMysql }, mysql] = await Promise.all([optionalImport("drizzle-orm/mysql2"), optionalImport("mysql2/promise")]);
    } catch {
      throw new Error("Missing mysql dependencies. Install with: bun add drizzle-orm mysql2");
    }

    pool = mysql.createPool({
      uri: databaseConfig.url,
      connectionLimit: databaseConfig.pool.max,
      connectTimeout: databaseConfig.pool.connectTimeout,
      enableKeepAlive: databaseConfig.pool.keepAlive
    });

    databaseInstance = drizzleMysql(pool, { schema, mode: "default" });
    return databaseInstance;
  }

  // --- PostgreSQL ---
  let drizzlePg: any;
  let postgres: any;
  try {
    [{ drizzle: drizzlePg }, { default: postgres }] = await Promise.all([
      optionalImport("drizzle-orm/postgres-js"),
      optionalImport("postgres")
    ]);
  } catch {
    throw new Error("Missing postgres dependencies. Install with: bun add drizzle-orm postgres");
  }

  pool = postgres(databaseConfig.url, {
    max: databaseConfig.pool.max,
    idle_timeout: Math.floor(databaseConfig.pool.idleTimeout / 1000),
    connect_timeout: Math.floor(databaseConfig.pool.connectTimeout / 1000),
    prepare: databaseConfig.prepare
  });

  databaseInstance = drizzlePg(pool, { schema });
  return databaseInstance;
}

export function database() {
  if (!databaseInstance) throw new Error("Database is not initialized");
  return databaseInstance;
}

export function databasePool() {
  if (!pool) throw new Error("Database pool is not initialized");
  return pool;
}

export async function closeDatabase() {
  if (!pool) return;

  const activeDialect = databaseDialect();

  try {
    if (activeDialect === "sqlite") {
      await pool.close?.();
    } else if (activeDialect === "mysql") {
      await pool.end();
    } else {
      await pool.end();
    }
  } catch (error) {
    console.error("Error closing database pool:", error);
  } finally {
    pool = undefined;
    databaseInstance = undefined;
  }
}

export function databaseDialect(): Dialect {
  return dialect || detectDialect();
}

function normalizeExecuteResult(result: unknown): unknown {
  if (Array.isArray(result)) {
    if (result.length === 2 && Array.isArray(result[1])) {
      return { rows: result[0], fields: result[1] };
    }
    const isRowList = result.length === 0 || result.every((row) => row != null && typeof row === "object" && !Array.isArray(row));
    if (isRowList) {
      return { rows: result };
    }
  }
  return result;
}

export const db = new Proxy(
  {},
  {
    get(_target, property) {
      const instance = database();

      if (property === "execute") {
        return async (query: unknown, params?: unknown) => {
          if (!instance.execute) {
            throw new Error("The current driver does not support raw execute.");
          }
          const raw = await instance.execute(query, params);
          return normalizeExecuteResult(raw);
        };
      }

      const value = instance[property as keyof typeof instance];
      return typeof value === "function" ? value.bind(instance) : value;
    }
  }
) as any;
