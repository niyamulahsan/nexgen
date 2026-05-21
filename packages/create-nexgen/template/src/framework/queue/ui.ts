import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { env } from "@/env.js";
import { redisClientIfReady } from "@/framework/redis/client.js";
import { ensureQueues, getAllQueues } from "@/framework/queue/queue.js";
import { parseCsvOrFallback } from "@/framework/support/lifecycle.js";
import { authMiddleware } from "@/middlewares/auth-middleware.js";

function redisAvailable() {
  return redisClientIfReady() !== null;
}

function allowedBullmqEmails() {
  const emails = parseCsvOrFallback(env.BULLMQ_UI_ALLOWED_EMAILS, []);
  return new Set(emails.map((email) => email.toLowerCase()));
}

/**
 * Why: Initializes BullBoard dashboard with auth protection.
 * When: HTTP kernel boots queue UI integration.
 * Where: Kernel startup and `/bullmq` route mounting.
 * How: Builds protected route; returns unavailable page when Redis is down.
 */
export function setupBullBoard() {
  const basePath = "/bullmq";
  const allowedEmails = allowedBullmqEmails();

  const protectRoute = (app: any) => {
    const guard = async (c: any, next: any) => {
      const response = await authMiddleware(c, async () => {
        const auth = c.get("auth");
        const email = String(auth?.email || "")
          .trim()
          .toLowerCase();

        if (allowedEmails.size > 0 && !allowedEmails.has(email)) {
          return c.json({ message: "Forbidden" }, 403);
        }

        await next();
      });

      return response;
    };

    app.use(basePath, guard);
    app.use(`${basePath}/*`, guard);
  };

  if (!redisAvailable()) {
    const route = (app: any) => {
      protectRoute(app);
      app.get(basePath, (c: any) =>
        c.html(`
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
            <p>Redis is not connected. Check REDIS_URL and make sure Redis is running.</p>
            <p>Redis URL: ${env.REDIS_URL}</p>
          </body>
        </html>
      `)
      );

      app.get(`${basePath}/*`, (c: any) => c.redirect(basePath));
    };

    return { basePath, enabled: false, route };
  }

  ensureQueues(["default", "mail"]);

  const serverAdapter = new HonoAdapter(serveStatic);
  serverAdapter.setBasePath(basePath);

  createBullBoard({
    queues: getAllQueues().map((queue) => new BullMQAdapter(queue)),
    serverAdapter,
    options: {
      uiConfig: {
        boardTitle: "Queue Dashboard",
        hideRedisDetails: true
      }
    }
  });

  const pluginRoute = serverAdapter.registerPlugin();
  const route = (app: any) => {
    protectRoute(app);
    app.route(basePath, pluginRoute);
  };

  return { basePath, enabled: true, route };
}
