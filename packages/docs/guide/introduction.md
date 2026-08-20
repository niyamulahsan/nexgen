# Introduction

## What is nexgen?

nexgen is a full-stack TypeScript framework that combines a **Hono** API server, a **Vite** frontend (Vue 3 by default, swappable for React/Svelte/Solid/etc.), **Drizzle ORM** for the database, and **Redis** for caching, sessions, queues, and realtime — all wired together with a single CLI.

Here is a minimal example (with `OPEN_API=true`):

```ts
// src/modules/posts/routes/api.ts
import { createRoute, group, HttpStatusCodes, jsonContent } from "@/framework/facade.js";

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

export default group()
  .get("/", (c) => c.json([{ id: 1, title: "Hello" }]));
```

The above example auto-registers the route — no manual wiring needed. Create a file, export a group, and it works.

## The Full-Stack Approach

Most JavaScript frameworks focus on either the frontend or the backend. nexgen covers both with a unified developer experience:

- **API layer** — Hono router with Zod OpenAPI validation, middleware, rate limiting, and auto-generated Scalar docs at `/api-docs`.
- **Frontend** — Vite SPA (Vue 3 by default, swap for React, Solid, Svelte, etc.) with HMR, API proxy, and built-in plugins.
- **Database** — Drizzle ORM with auto-generated schema, migrations, and seeders for SQLite, MySQL, or PostgreSQL.
- **Services** — Redis-backed cache, session, BullMQ queue, Socket.IO realtime, cron scheduler, file storage, and notifications — all accessible through a single facade.

```ts
import { db, cache, session, queue, dispatchEvent, notify, storage, jwt, mail, password, urls, logger } from "@/framework/facade.js";
```

## Module System

Every feature is a self-contained module under `src/modules/<name>/`:

```
src/modules/posts/
├── controllers/       # Request handlers
├── routes/            # HTTP route definitions (auto-discovered)
├── database/
│   ├── models/        # Drizzle schema definitions
│   └── seeders/       # Test data
├── jobs/              # BullMQ queue handlers
├── console/           # CLI commands
└── schedules/         # Cron jobs
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

| Component | URL |
|---|---|
| API server | `http://localhost:3000` |
| API docs (Scalar) | `http://localhost:3000/api-docs` |
| Queue dashboard | `http://localhost:3000/queues` |
| Vue 3 frontend (HMR) | `http://localhost:5173` |

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
