# nexgen

**nexgen** is a full-stack TypeScript framework for building modern web applications. It combines a modular backend architecture with a Vue 3 single-page application frontend, providing everything you need out of the box:

- **API** — [Hono](https://hono.dev) HTTP server with Zod validation and OpenAPI docs
- **Frontend** — [Vue 3](https://vuejs.org) SPA with Pinia, Vue Router, and real-time Pulse integration
- **Database** — [Drizzle ORM](https://orm.drizzle.team) with SQLite, MySQL, and PostgreSQL support
- **Queue** — [BullMQ](https://docs.bullmq.io) for background job processing
- **Realtime** — [Socket.IO](https://socket.io) for bidirectional event broadcasting
- **Cache & Session** — Redis-backed with graceful fallback
- **CLI** — `maker` command for code generation, migrations, runtime, and deploy
- **Deploy** — Docker Compose with nginx-proxy, auto SSL, and supervisor

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Modules](#modules)
- [Database](#database)
- [Events & Queue](#events--queue)
- [Scheduler](#scheduler)
- [Realtime](#realtime)
- [Storage](#storage)
- [CLI Reference](#cli-reference)
- [Deploy](#deploy)
- [Optional Packages](#optional-packages)
- [Full Documentation](#full-documentation)

## Quick Start

```bash
cp .env.example .env
npm install
npm run maker db:schema
npm run maker db:seed
npm run maker dev
```

This starts the API server, Vue 3 frontend, and queue worker (if Redis enabled) in parallel.

### Package Manager

Commands in this README use `bun maker` as shorthand. Use the equivalent for your package manager:

| Manager | Command |
|---|---|
| npm | `npm run maker -- <command>` |
| pnpm | `pnpm maker <command>` |
| yarn | `yarn maker <command>` |
| bun | `bun maker <command>` |

## Architecture

```
src/
├── env.ts              # Environment configuration (Zod validated)
├── database/           # Drizzle schema, migrations, seeders
├── framework/          # Framework internals (reusable engine)
│   ├── server.ts       # HTTP server entrypoint
│   ├── kernel.ts       # App kernel (boots all subsystems)
│   ├── facade.ts       # Public API surface
│   ├── http/           # Router, middleware, OpenAPI, static files
│   ├── database/       # Connection, pagination
│   ├── events/         # Command & event dispatcher
│   ├── queue/          # BullMQ queue, worker, dashboard
│   ├── realtime/       # Socket.IO server, broadcast
│   ├── cache/          # Redis cache
│   ├── session/        # Session management
│   ├── scheduler/      # Cron scheduler
│   ├── storage/        # File storage (local/S3)
│   ├── redis/          # Redis client
│   ├── support/        # JWT, mail, logger, password, URL
│   └── maker-cli/      # CLI source and stubs
├── modules/            # Application modules (auto-discovered)
├── middlewares/        # Auth, role middlewares
├── resources/          # Vue 3 frontend app
└── storage/            # Uploaded and generated files
```

### Boot Sequence

```
server.ts
  └─ createKernel()
       ├─ createHttpApp()   → Builds Hono app with middleware stack
       │    ├─ sessionMiddleware
       │    ├─ corsMiddleware
       │    ├─ loggerMiddleware
       │    ├─ rateLimiterMiddleware
       │    ├─ OpenAPI docs (if enabled)
       │    └─ Health endpoint
       ├─ initDatabase()    → Connect configured dialect
       ├─ initRedis()       → Connect Redis (if enabled)
       ├─ bootQueueJobs()   → Register queue handlers
       ├─ registerModuleRoutes() → Auto-discover routes
       ├─ setupBullBoard()  → Queue management UI
       └─ Frontend static   → Serve SPA if build exists
  └─ serve()               → Start HTTP listener
  └─ initRealtime()        → Attach Socket.IO
  └─ registerShutdownSignals() → Graceful cleanup
```

### Request Lifecycle

```
Client → @hono/node-server → sessionMiddleware → corsMiddleware
  → loggerMiddleware → rateLimiterMiddleware → [module route]
  → [authMiddleware] → [controller] → JSON response
```

## Modules

Modules are self-contained units under `src/modules/<name>/`. Each module can contain:

```
src/modules/blog/
├── controllers/         # Request handlers + Zod schemas
│   ├── blog.controller.ts
│   └── blog.schema.ts
├── routes/              # Route definitions (auto-discovered)
│   └── api.ts
├── database/
│   ├── models/          # Drizzle table definitions
│   ├── seeders/         # Database seeders
│   └── index.ts
├── jobs/                # Queue job handlers
└── console/             # Scheduled commands
```

### Creating a Module

```bash
bun maker module:make blog
```

### Adding Components

```bash
bun maker module:make-controller blog post
bun maker module:make-route blog post
bun maker module:make-model blog post
bun maker module:make-seeder blog post
bun maker module:make-job blog send-welcome
bun maker module:make-console blog cleanup
```

### Facade

The framework's public API is exported from `@/framework/facade.js`:

```ts
import { db, cache, session, queue, dispatchEvent, notify, storage, mail, jwt, password, urls, logger, paginate } from "@/framework/facade.js";
```

## Database

nexgen supports SQLite, MySQL, and PostgreSQL through Drizzle ORM. The active dialect is detected from `DATABASE_URL` in `.env`.

### Migrations

```bash
bun maker db:schema        # Generate schema index from all module models
bun maker db:generate      # Generate migration SQL files
bun maker db:migrate       # Generate + run migrations
bun maker db:migrate --seed
bun maker db:fresh         # Drop all tables, re-migrate, re-seed
bun maker db:status        # List migration files
```

### Models

Models are Drizzle table definitions in `src/modules/<module>/database/models/`. They are auto-detected by dialect and aggregated into `src/database/schema.ts` via `db:schema`.

```ts
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  id: int().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  body: text(),
});
```

### Seeders

```bash
bun maker db:seed              # Run all seeders
bun maker db:seed posts        # Run single module seeders
```

### Pagination

```ts
import { db, paginate } from "@/framework/facade.js";

const query = db.select().from(posts).orderBy(desc(posts.id));
const result = await paginate(c, query, 10);
// { data, meta: { current_page, per_page, total, last_page, from, to }, links: { first, last, prev, next } }
```

## Events & Queue

### dispatchEvent

Fire domain events that can be broadcast via WebSocket and/or queued as background jobs.

```ts
import { dispatchEvent } from "@/framework/facade.js";

// Fire event (local in-process)
await dispatchEvent("user:signup", { userId: 1 });

// Fire and queue background job
await dispatchEvent("user:signup", { userId: 1 }, { queue: "default" });

// Fire and broadcast to authenticated users
await dispatchEvent("post.created", { postId: 1 }, { broadcast: { auth: true } });

// Queue, then broadcast from handler (recommended pattern)
```

### Queue Jobs

Define handlers in `src/modules/<module>/jobs/*.ts`:

```ts
import { shouldQueue } from "@/framework/facade.js";

shouldQueue("user:signup", "default", async (job) => {
  const { userId } = job.data;
  // Process the job
});
```

Start the worker:

```bash
bun maker queue:work --queue=default,mail
```

### dispatchCommand

Synchronous command pattern with optional async fallback:

```ts
import { command, dispatchCommand } from "@/framework/facade.js";

command("send-welcome-email", async (payload) => {
  // Handler runs in-process
});

await dispatchCommand("send-welcome-email", { userId: 1 });
await dispatchCommand("send-welcome-email", { userId: 1 }, { async: true }); // Queue instead
```

## Scheduler

Define scheduled tasks in `src/modules/<module>/console/*.ts`:

```ts
import { defineSchedule } from "@/framework/facade.js";

defineSchedule({
  name: "cleanup-temp-files",
  expression: "*/5 * * * *",
  runOnInit: false,
  ttlMs: 120000,
  handler: async () => {
    // Scheduled task logic
  },
});
```

Start the scheduler:

```bash
bun maker schedule:work
```

## Realtime

### Server-side

Broadcast events to connected clients via Socket.IO:

```ts
await dispatchEvent("chat.message", { text: "Hello" }, {
  broadcast: { users: [recipientId] }
});

await dispatchEvent("admin.alert", { cpu: 92 }, {
  broadcast: { roles: ["admin"] }
});

await dispatchEvent("system.update", { status: "ok" }, {
  broadcast: { all: true }
});
```

### Client-side

The frontend uses the Pulse plugin for real-time channels:

```ts
import { pulse } from "@/plugins/pulse";

const channel = pulse.channel("user:42");
channel.listen("notification.created", (data) => {
  showToast(data.title);
});
```

## Storage

Supports local disk and S3-compatible object storage (AWS S3, DigitalOcean Spaces, Cloudflare R2, MinIO).

```env
STORAGE_DRIVER=s3
STORAGE_BUCKET=my-bucket
STORAGE_REGION=us-east-1
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
```

```ts
import { storage } from "@/framework/facade.js";

const path = await storage.put("uploads/report.pdf", fileBuffer);
const url = await storage.temporaryUrl(path, 3600);
await storage.delete(path);
```

## CLI Reference

### Module Commands

```bash
bun maker module:make <name>                  # Create full module scaffold
bun maker module:make-notification [name]     # Generate notification module
bun maker module:example [name]               # Generate example module
bun maker module:delete <name>                # Soft-delete module to trash
bun maker module:delete-notification [name]   # Remove notification module
bun maker module:trash:clean [name]           # Permanently remove trash
bun maker module:list                         # List all modules
bun maker module:seed <module>                # Run module seeders
bun maker module:migrate <module>             # Run module migration
bun maker module:make-route <module> [controller]
bun maker module:make-controller <module> [name]
bun maker module:make-model <module> [name]
bun maker module:make-seeder <module> [name]
bun maker module:make-job <module> [name]
bun maker module:make-console <module> [name]
```

### Database Commands

```bash
bun maker db:schema           # Generate schema index
bun maker db:generate         # Generate migration files
bun maker db:migrate [--seed] # Run migrations
bun maker db:migrate:run      # Run pending migrations only
bun maker db:fresh [--seed]   # Drop all + re-migrate
bun maker db:reset            # Drop and recreate database
bun maker db:seed [module]    # Run seeders
bun maker db:status           # List migration files
bun maker db:push             # Push schema directly
bun maker db:studio           # Launch Drizzle Studio
```

### Runtime Commands

```bash
bun maker dev                               # Full dev stack
bun maker dev --view=redis,maildev,studio   # Dev stack with tools
bun maker serve [--prod]                    # Start API server
bun maker queue:work [--queue=default]      # Start queue worker
bun maker queue:clear                       # Clear queue keys
bun maker schedule:work                     # Start scheduler
bun maker frontend:dev                      # Frontend dev server
bun maker maildev:view                      # MailDev web UI
bun maker redis:view                        # Redis Commander UI
bun maker vite:cache:clear                  # Clear Vite cache
```

### Deploy Commands

```bash
bun maker deploy:create --server            # Generate deploy scaffolding
bun maker deploy:server                     # Start shared infra
bun maker deploy:app                        # Build and start app
bun maker deploy:workflow:local             # Full local deploy
bun maker deploy:workflow:remote            # Full remote deploy
bun maker deploy:workflow:promote           # Local then remote deploy
bun maker deploy:db:import                  # Import SQL dump
```

## Deploy

nexgen uses a two-layer Docker architecture: shared infrastructure (nginx-proxy, MySQL, PostgreSQL, Redis) runs once per host, and the application stack builds and deploys per release.

### Local Deploy

```bash
bun maker deploy:create --server    # Generate files (one-time)
bun maker deploy:server             # Start database, Redis, proxy
bun maker deploy:app                # Build and start app
```

### Remote Deploy

Configure `deploy/workflow.remote.json` with your SSH details, then:

```bash
bun maker deploy:workflow:remote
```

This rsyncs your project to the server, creates Docker networks, starts the infra, builds and runs the app container with supervisor managing API, queue, and scheduler processes.

### Supervisor Inside Container

```
supervisord
  ├─ auto-migrate.sh (one-shot, if AUTO_MIGRATE=true)
  ├─ maker serve --prod       → HTTP API on port 3000
  ├─ maker queue:work         → BullMQ worker (if Redis enabled)
  └─ maker schedule:work      → Cron scheduler
```

See the [deploy documentation](https://your-org.github.io/nexgen/deploy/overview) for full details.

## Optional Packages

| Package | Feature | When needed |
|---|---|---|
| `exceljs` | Excel import/export | If using `/examples/download/excel/*` endpoints |
| `playwright` | PDF export | If using `/examples/download/pdf/*` endpoints |

```bash
npm i exceljs
npm i playwright
npx playwright install chromium
```

## Full Documentation

Complete documentation is available at **[https://your-org.github.io/nexgen](https://your-org.github.io/nexgen)**
