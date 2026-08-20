# Introduction

## What is nexgen?

nexgen is a full-stack TypeScript framework that combines a **Hono** API server, a **Vite** frontend (Vue 3 by default, swappable for React/Svelte/Solid/etc.), **Drizzle ORM** for the database, and **Redis** for caching, sessions, queues, and realtime — all wired together with a single CLI.

Here is a minimal example (with `OPEN_API=true`):

```ts
// src/modules/posts/routes/api.ts
import {
  createRoute,
  group,
  HttpStatusCodes,
  jsonContent,
} from "@/framework/facade.js";

const listRoute = createRoute({
  path: "/",
  method: "get",
  tags: ["Posts"],
  responses: { [HttpStatusCodes.OK]: jsonContent(z.array(PostSchema), "list") },
});

export default group().api(listRoute, (c) =>
  c.json([{ id: 1, title: "Hello" }]),
);
```

With `OPEN_API=false`, the same route looks like:

```ts
import { group } from "@/framework/facade.js";

export default group().get("/", (c) => c.json([{ id: 1, title: "Hello" }]));
```

The above example auto-registers the route — no manual wiring needed. Create a file, export a group, and it works.

## Who is nexgen for?

nexgen is built for developers who want to ship full-stack TypeScript applications without gluing together dozens of separate libraries and configs. It is a good fit if you:

- **Solo developers** building SaaS products, internal tools, or client projects who want a batteries-included stack that works out of the box.
- **Small teams** that need a consistent project structure everyone can follow without spending weeks on architecture decisions.
- **Backend developers** moving into full-stack who want a familiar server setup (Hono + Drizzle + Redis) with a frontend that just works.
- **Startup founders** who need to move fast — scaffold a project, run `dev`, and start building features immediately.
- **Laravel / Rails / Django developers** looking for a TypeScript equivalent that covers routing, ORM, queue, cache, auth, realtime, and deployment in one package.

nexgen may **not** be the best choice if you need fine-grained control over every dependency, prefer a meta-framework like Next.js or Nuxt, or are building something that only needs a static site.

## API-Only Mode

You don't have to use the built-in frontend. Set `FRONTEND=false` in `.env` and nexgen becomes a pure API server — perfect if you already have a React, Next.js, Flutter, or mobile app that needs a backend.

```bash
# .env
FRONTEND=false
```

The API runs standalone at `http://localhost:3000` with OpenAPI docs at `/api-docs`. Your separate frontend connects via HTTP, WebSocket, or both.

## Separate Frontend

If your frontend lives in a different repo or uses a different framework, nexgen still gives you everything you need out of the box:

- **Cache** — avoid hitting the database on every request
- **Session** — server-side sessions with cross-origin cookie support
- **Queue** — background jobs processed by workers
- **Realtime** — push events to connected clients via WebSocket
- **Scheduler** — cron jobs with distributed locking

```ts
// Your separate frontend connects to the API
const res = await fetch("http://localhost:3000/api/posts");
```

The CORS middleware automatically allows your `FRONTEND_URL`, so there's no extra config needed.

## Cache

Redis-backed caching with a cache-aside pattern. If Redis is down, every operation silently falls back to the database — no crashes, no errors.

```ts
import { cache } from "@/framework/facade.js";

// Cache-aside: compute once, serve from cache
const posts = await cache.remember("posts:all", 600, async () => {
  return await db.query.posts.findMany();
});

// Manual control
await cache.put("config:sitemap", sitemapXml, 3600);
const cached = await cache.get("config:sitemap");
await cache.forget("config:sitemap");
```

## Session

Server-side sessions stored in Redis with automatic cookie management. Supports cross-origin setups where your API and frontend run on different domains.

```ts
import { session } from "@/framework/facade.js";

// In a route handler
const sessionId = session.start({ userId: user.id, role: "admin" });
const user = session.get(sessionId, "user");
session.put(sessionId, "lastSeen", new Date().toISOString());
session.destroy(sessionId); // logout
```

## Queue with Durable Jobs

BullMQ-powered background processing with a web dashboard. Jobs can be durable — if the worker crashes mid-job, it resumes from the last checkpoint instead of starting over.

```ts
import { queueJob, shouldQueue } from "@/framework/facade.js";

// Register a durable handler (survives crashes)
shouldQueue("send-email", async (ctx, data) => {
  await ctx.step("validate", async () => {
    validateEmailData(data);
  });
  await ctx.step("send", async () => {
    await mail.sendMail({ to: data.to, subject: data.subject, html: data.body });
  });
}, { durable: true });

// Enqueue a job
await queueJob("send-email", { to: "user@example.com", subject: "Welcome!", body: "<h1>Welcome</h1>" });

// With delay, priority, and retry
await queueJob("send-email", data, { delay: 5000, priority: 1, attempts: 3 });
```

The queue dashboard is available at `/queues` with email-based access control.

## Scheduler with Distributed Locking

Cron-based task scheduling with a Redis lock that prevents duplicate runs across multiple server instances. If Redis is unavailable, it falls back to a database lock automatically.

```ts
import { defineSchedule } from "@/framework/facade.js";

// Run every hour — never duplicates across instances
defineSchedule({
  name: "cleanup-sessions",
  expression: "0 * * * *",
  handler: async () => {
    const deleted = await session.cleanup expired();
    logger.info(`Cleaned ${deleted} expired sessions`);
  },
});

// Or dispatch to a queue worker
defineSchedule({
  name: "daily-reports",
  expression: "0 8 * * *",
  queue: "reports",
  job: "generate-daily",
});
```

## Storage

Unified file storage that works with the local filesystem or any S3-compatible service (AWS S3, MinIO, etc.). Switch drivers by changing an environment variable.

```ts
import { storage } from "@/framework/facade.js";

// Write a file
await storage.put("avatars/user-1.jpg", fileBuffer);

// Upload from a browser File object
await storage.putFile("uploads", browserFile, "report.pdf");

// Read, check, delete
const content = await storage.get("avatars/user-1.jpg");
const exists = await storage.exists("avatars/user-1.jpg");
await storage.delete("avatars/user-1.jpg");

// Generate a signed URL for temporary access
const url = await storage.temporaryUrl("private/report.pdf", 3600);
```

## Realtime

Socket.IO-powered WebSocket communication with automatic authentication. Clients are placed into rooms based on their user ID and roles — broadcast to everyone, specific users, or specific roles.

```ts
import { broadcast } from "@/framework/facade.js";

// Send to everyone
broadcast("post.created", { id: 1, title: "New Post" }, { all: true });

// Send to specific users
broadcast("notification", { message: "You have a new order" }, { users: ["user-123"] });

// Send to a role
broadcast("announcement", { text: "System maintenance" }, { roles: ["admin"] });
```

On the frontend, the Socket.IO client automatically connects and authenticates using the session cookie.

## Notifications

Multi-channel notifications that persist to the database, broadcast via WebSocket, and optionally send an email — all in one call.

```ts
import { notify } from "@/framework/facade.js";

// Database + realtime broadcast
await notify(userId, {
  type: "order",
  title: "Order Shipped",
  body: "Your order #1234 has been shipped.",
  link: "/orders/1234",
  broadcast: true,
});

// Also send an email
await notify(userId, {
  type: "welcome",
  title: "Welcome!",
  body: "Thanks for signing up.",
  broadcast: true,
  mail: { subject: "Welcome to our platform", html: "<h1>Welcome!</h1>" },
});
```

## Database

Drizzle ORM with support for **SQLite**, **MySQL**, and **PostgreSQL** — just change `DATABASE_URL` and it auto-detects the dialect. Includes pagination, topological seeding, and migration hooks.

```ts
import { db, paginate } from "@/framework/facade.js";

// Query
const posts = await db.query.posts.findMany({ with: { author: true } });

// Paginated list (reads page/per_page from query string)
const result = await paginate(c, db.query.posts, 20);
// Returns: { current_page, data, total, links, ... }
```

Seeders are auto-discovered and sorted by foreign key dependencies — no manual ordering needed.

## Authentication

JWT-based auth with signed HTTP-only cookies. Separate tokens for access and refresh, with automatic cross-origin cookie handling.

```ts
import { jwt, cookie, password } from "@/framework/facade.js";

// Hash a password
const hash = await password.hashPassword("user-password");

// Verify
const valid = await password.verifyPassword("user-password", hash);

// Generate tokens
const access = await jwt.generateToken({ userId: 1 }, "access", 3600);
const refresh = await jwt.generateToken({ userId: 1 }, "refresh", 604800);

// Set cookies (handles SameSite automatically for cross-origin)
cookie.setAuth(c, access.token);
cookie.setRefresh(c, refresh.token);
```

## Rate Limiting

Automatic rate limiting with a Redis-backed store that falls back to in-memory when Redis is unavailable. Includes a separate stricter limiter for login attempts.

```ts
// Applied globally via middleware — no code needed
// Uses session ID for authenticated users, IP for guests
// Returns standard RateLimit-* headers (draft-6)

// Login-specific limiter (applied automatically to login routes)
// 5 attempts per 15 minutes per IP
```

## Structured Logging

Pino-based structured JSON logging with colorized console output and rotating log files. Catches uncaught exceptions and unhandled rejections automatically.

```ts
import { logger } from "@/framework/facade.js";

logger.info("User signed in", { userId: 123, ip: "192.168.1.1" });
logger.error("Payment failed", { orderId: "abc", error: err.message });
```

Logs rotate at 10MB — 5 app log files and 3 fatal log files are kept.

## Everything in One Import

All features are accessible from a single facade:

```ts
import {
  db,
  cache,
  session,
  queue,
  queueJob,
  shouldQueue,
  defineSchedule,
  broadcast,
  notify,
  storage,
  jwt,
  cookie,
  mail,
  password,
  logger,
  urls,
  paginate,
  validate,
  createRouter,
  group,
  createRoute,
  z,
} from "@/framework/facade.js";
```

## Module System

Every feature is a self-contained module under `src/modules/<name>/`:

```
src/modules/posts/
├── console/           # CLI commands
├── controllers/       # Request handlers
├── database/
│   ├── models/        # Drizzle schema definitions
│   └── seeders/       # Test data
├── jobs/              # BullMQ queue handlers
├── routes/            # HTTP route definitions (auto-discovered)
└── __test__/          # Unit testing
```

Modules are auto-discovered — no manual registration needed. Create one with the CLI:

::: code-group

```bash [npm]
npm run maker module:make blog
npm run maker module:make-controller blog post
npm run maker module:make-route blog post
npm run maker module:make-model blog post
```

```bash [pnpm]
pnpm maker module:make blog
pnpm maker module:make-controller blog post
pnpm maker module:make-route blog post
pnpm maker module:make-model blog post
```

```bash [yarn]
yarn maker module:make blog
yarn maker module:make-controller blog post
yarn maker module:make-route blog post
yarn maker module:make-model blog post
```

```bash [bun]
bun maker module:make blog
bun maker module:make-controller blog post
bun maker module:make-route blog post
bun maker module:make-model blog post
```

:::

## Single Command Dev

The `dev` command starts everything you need at once:

::: code-group

```bash [npm]
npm run maker dev
```

```bash [pnpm]
pnpm maker dev
```

```bash [yarn]
yarn maker dev
```

```bash [bun]
bun maker dev
```

:::

| Component            | URL                              |
| -------------------- | -------------------------------- |
| API server           | `http://localhost:3000`          |
| API docs (Scalar)    | `http://localhost:3000/api-docs` |
| Queue dashboard      | `http://localhost:3000/queues`   |
| Vue 3 frontend (HMR) | `http://localhost:5173`          |

## Pick Your Learning Path

Different developers have different learning styles. Feel free to pick a path that suits your preference.

<div class="vt-doc-intro-cards" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 20px;">
  <a href="/nexgen/guide/quick-start" style="display: block; padding: 20px; border: 1px solid var(--vp-c-divider); border-radius: 8px; text-decoration: none; color: inherit; transition: border-color 0.25s;">
    <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">Quick Start →</div>
    <div style="font-size: 14px; color: var(--vp-c-text-2);">Get a project running in under 5 minutes.</div>
  </a>
  <a href="/nexgen/guide/architecture" style="display: block; padding: 20px; border: 1px solid var(--vp-c-divider); border-radius: 8px; text-decoration: none; color: inherit; transition: border-color 0.25s;">
    <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">Read the Guide →</div>
    <div style="font-size: 14px; color: var(--vp-c-text-2);">Walk through every part of the framework in detail.</div>
  </a>
</div>
