import { randomUUID } from "node:crypto";
import { env } from "@/env.js";
import { databaseDialect, databasePool } from "@/framework/database/connection.js";
import { redis, redisReady } from "@/framework/redis/client.js";

type LockOptions = { ttlMs?: number; tableName?: string };

function table(name?: string) {
  return name || "scheduler_locks";
}

async function ensureTable(tableName?: string) {
  const pool = databasePool();
  const dialect = databaseDialect();
  const lockTable = table(tableName);

  if (dialect === "mysql") {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS \`${lockTable}\` (name VARCHAR(191) PRIMARY KEY, owner VARCHAR(191) NOT NULL, expires_at BIGINT NOT NULL)`
    );
    return;
  }

  if (dialect === "postgresql") {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS "${lockTable}" (name VARCHAR(191) PRIMARY KEY, owner VARCHAR(191) NOT NULL, expires_at BIGINT NOT NULL)`
    );
    return;
  }

  pool.exec(
    `CREATE TABLE IF NOT EXISTS "${lockTable}" (name TEXT PRIMARY KEY, owner TEXT NOT NULL, expires_at INTEGER NOT NULL)`
  );
}

async function acquireDbLock(name: string, owner: string, ttlMs: number, tableName?: string) {
  await ensureTable(tableName);
  const pool = databasePool();
  const dialect = databaseDialect();
  const lockTable = table(tableName);
  const now = Date.now();
  const expiresAt = now + ttlMs;

  if (dialect === "postgresql") {
    const result = await pool.query(
      `INSERT INTO "${lockTable}" (name, owner, expires_at) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET owner = EXCLUDED.owner, expires_at = EXCLUDED.expires_at WHERE "${lockTable}".expires_at < $4 RETURNING owner`,
      [name, owner, expiresAt, now]
    );
    return result.rows?.[0]?.owner === owner;
  }

  if (dialect === "mysql") {
    await pool.query(
      `INSERT INTO \`${lockTable}\` (name, owner, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE owner = IF(expires_at < ?, VALUES(owner), owner), expires_at = IF(expires_at < ?, VALUES(expires_at), expires_at)`,
      [name, owner, expiresAt, now, now]
    );
    const [rows] = await pool.query(`SELECT owner FROM \`${lockTable}\` WHERE name = ?`, [name]);
    return rows?.[0]?.owner === owner;
  }

  pool
    .prepare(
      `INSERT INTO "${lockTable}" (name, owner, expires_at) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET owner = excluded.owner, expires_at = excluded.expires_at WHERE "${lockTable}".expires_at < ?`
    )
    .run(name, owner, expiresAt, now);
  return pool.prepare(`SELECT owner FROM "${lockTable}" WHERE name = ?`).get(name)?.owner === owner;
}

async function releaseDbLock(name: string, owner: string, tableName?: string) {
  const pool = databasePool();
  const dialect = databaseDialect();
  const lockTable = table(tableName);

  if (dialect === "postgresql")
    return await pool.query(`DELETE FROM "${lockTable}" WHERE name = $1 AND owner = $2`, [
      name,
      owner
    ]);
  if (dialect === "mysql")
    return await pool.query(`DELETE FROM \`${lockTable}\` WHERE name = ? AND owner = ?`, [
      name,
      owner
    ]);
  return pool.prepare(`DELETE FROM "${lockTable}" WHERE name = ? AND owner = ?`).run(name, owner);
}

/**
 * Why: Runs a handler with distributed lock to prevent duplicate execution.
 * When: Scheduled tasks may run across multiple processes/instances.
 * Where: Scheduler runtime around each cron job.
 * How: Uses Redis NX lock when available, otherwise falls back to DB lock table.
 */
export async function runWithLock<T>(
  name: string,
  handler: () => Promise<T>,
  options: LockOptions = {}
) {
  const owner = randomUUID();
  const ttlMs = options.ttlMs || 60_000;
  const client = redis();

  if (redisReady() && client) {
    const key = `${env.REDIS_PREFIX}:lock:${name}`;
    const ok = await client.set(key, owner, "PX", ttlMs, "NX");
    if (!ok) return { ran: false, backend: "redis" as const };

    try {
      const result = await handler();
      return { ran: true, backend: "redis" as const, result };
    } finally {
      await client.del(key);
    }
  }

  const ok = await acquireDbLock(name, owner, ttlMs, options.tableName);
  if (!ok) return { ran: false, backend: "db" as const };

  try {
    const result = await handler();
    return { ran: true, backend: "db" as const, result };
  } finally {
    await releaseDbLock(name, owner, options.tableName);
  }
}
