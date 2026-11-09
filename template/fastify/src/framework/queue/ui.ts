import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { queueConfig, redisConfig } from "@/config/index.js";
import { ensureQueues, getQueue } from "@/framework/queue/queue.js";
import { redisClientIfReady } from "@/framework/redis/client.js";
import { cookie } from "@/framework/support/cookie.js";
import { jwt } from "@/framework/support/jwt.js";
import { parseCsvOrFallback } from "@/framework/support/lifecycle.js";

const BASE_PATH = queueConfig.queueUi || "/queues";

const POLL_INTERVAL_MS = 5_000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let syncInFlight = false;

const dashboardQueueNames = new Set<string>();

const serverAdapter = new FastifyAdapter();
serverAdapter.setBasePath(BASE_PATH);

const bullBoard = createBullBoard({
  queues: [],
  serverAdapter,
  options: {
    uiConfig: {
      boardTitle: "Queue Dashboard"
    }
  }
});

export function stopQueueDashboard() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function refreshDashboardQueues() {
  if (syncInFlight) return;
  syncInFlight = true;

  try {
    const client = redisClientIfReady();
    if (!client) return;

    const discovered = (await discoverQueueNames()).sort();
    ensureQueues(discovered);

    for (const name of discovered) {
      if (dashboardQueueNames.has(name)) continue;
      const queue = getQueue(name);
      if (!queue) continue;
      bullBoard.addQueue(new BullMQAdapter(queue));
      dashboardQueueNames.add(name);
    }

    for (const name of Array.from(dashboardQueueNames)) {
      if (!discovered.includes(name)) {
        bullBoard.removeQueue(name);
        dashboardQueueNames.delete(name);
      }
    }
  } catch {
    // Keep the previous queue list if a refresh fails.
  } finally {
    syncInFlight = false;
  }
}

function queuePrefix() {
  return queueConfig.prefix;
}

function allowedQueueDashboardEmails() {
  const emails = parseCsvOrFallback(queueConfig.allowedEmails, []);
  return new Set(emails.map((email) => email.toLowerCase()));
}

function dashboardAuth() {
  const allowedEmails = allowedQueueDashboardEmails();

  return async (request: FastifyRequest, reply: FastifyReply) => {
    /**
     * Why: The email allowlist is the ONLY gate on the queue dashboard UI.
     * When: No `allowedEmails` configured → the dashboard is open to everyone
     *      in both dev and production (no login required). When configured,
     *      only the listed email(s) pass — everyone else is blocked.
     * Where: BullMQ dashboard route hook.
     * How: An empty allowlist short-circuits straight through; otherwise the
     *      requester's email (from the validated access token) must be in the
     *      set. This keeps BullMQ workers (mail delivery etc.) always running
     *      and gating strictly UI-only.
     */
    if (allowedEmails.size === 0) return;

    const rawToken = await cookie.getAuth(request);
    if (!rawToken) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const payload = await jwt.verifyToken(rawToken, "access");
    if (!payload) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const normalized = payload as Record<string, unknown>;
    const email = String(normalized.email ?? "")
      .trim()
      .toLowerCase();

    if (!allowedEmails.has(email)) {
      return reply.code(401).send({ message: "Unauthorized" });
    }
  };
}

async function discoverQueueNames(): Promise<string[]> {
  const client = redisClientIfReady();
  if (!client) return [];

  const prefix = `${queuePrefix()}:`;
  const names = new Set<string>();
  let cursor = 0;

  do {
    const [nextCursor, keys] = await client.scan(cursor, "MATCH", `${prefix}*:meta`, "COUNT", 100);
    cursor = Number(nextCursor);
    for (const key of keys) {
      const name = key.slice(prefix.length, -5);
      if (name) names.add(name);
    }
  } while (cursor !== 0);

  return Array.from(names);
}

function unavailableHtml() {
  return `
    <!doctype html>
    <html>
      <head>
        <title>Queue Dashboard Unavailable</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 48px; text-align: center; }
          h1 { color: #dc2626; }
        </style>
      </head>
      <body>
        <h1>Queue Dashboard Unavailable</h1>
        <p>Redis is not connected. Check the Redis URL in src/config/redis.ts and make sure Redis is running.</p>
        <p>Redis URL: ${redisConfig.url}</p>
      </body>
    </html>
  `;
}

/**
 * Why: Mounts the BullMQ dashboard, or a fallback page when Redis is down.
 * When: Kernel boots after queue jobs are registered.
 * Where: Framework startup.
 * How: Registers the BullBoard Fastify adapter at `BASE_PATH`, wrapped in a
 *      scope that applies the email allowlist hook before any dashboard route.
 */
export async function setupQueueDashboard() {
  if (!redisClientIfReady()) {
    const route = (app: FastifyInstance) => {
      const handler = async (_request: FastifyRequest, reply: FastifyReply) => reply.code(200).type("text/html").send(unavailableHtml());
      app.get(BASE_PATH, { schema: { hide: true } }, handler);
      app.get(`${BASE_PATH}/*`, { schema: { hide: true } }, handler);
    };

    return { basePath: BASE_PATH, enabled: false, route };
  }

  await refreshDashboardQueues();
  if (!pollTimer) {
    pollTimer = setInterval(refreshDashboardQueues, POLL_INTERVAL_MS);
  }

  const route = async (app: FastifyInstance) => {
    await app.register(
      async (scope) => {
        scope.addHook("onRequest", dashboardAuth());
        await scope.register(serverAdapter.registerPlugin());
      },
      { prefix: BASE_PATH }
    );
  };

  return { basePath: BASE_PATH, enabled: true, route };
}
