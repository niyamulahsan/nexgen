# Architecture

## Directory Layout

```
my-project/
├── src/
│   ├── env.ts              # Environment config (Zod validation)
│   ├── database/           # Schema, migrations, connection
│   ├── framework/          # Reusable internals (HTTP, DB, Redis, etc.)
│   │   └── maker-cli/      # CLI source and stubs
│   ├── modules/            # Application modules
│   ├── middlewares/        # Auth, role middlewares
│   ├── resources/          # Vue 3 frontend app
│   └── storage/            # Uploaded and generated files
├── deploy/                 # Docker deploy files
├── .env.example
└── package.json
```

## Layers

- **Framework** — Reusable engine (HTTP, database, Redis, cache, session, queue, events, realtime, scheduler, storage). Lives in `src/framework/`.
- **Modules** — Your application code. Auto-discovered for routes, jobs, console commands, models, seeders.
- **Resources** — Vue 3 frontend built with Vite.
- **Database** — Drizzle schema and migrations, dialect-aware.

## Boot Sequence

The application boots in three stages: **HTTP app setup** → **Kernel assembly** → **Server start**.

```
server.ts
  │
  ├─ 1. createKernel()
  │       │
  │       ├─ storage.init()                    Initialize storage driver (local/S3)
  │       │
  │       ├─ createHttpApp()                   Build Hono app with middleware stack
  │       │    │
  │       │    ├─ createRouter()               Create Hono router instance
  │       │    ├─ configureOpenApi()           Setup OpenAPI/Scalar UI (if OPEN_API=true)
  │       │    ├─ app.use("*", sessionMiddleware)      Session cookie + Redis
  │       │    ├─ app.use("*", corsMiddleware)         CORS headers
  │       │    ├─ app.use("*", loggerMiddleware)       Request logging
  │       │    ├─ app.use("*", rateLimiterMiddleware)  Rate limiting
  │       │    ├─ app.use("/storage/*", static)        Serve uploaded files
  │       │    ├─ app.get("/health")                   Health endpoint
  │       │    ├─ app.notFound(notFound)              404 handler
  │       │    └─ app.onError(onError)                 Error handler
  │       │
  │       ├─ initDatabase()                   Connect database (SQLite/MySQL/Postgres)
  │       ├─ initRedis()                      Connect Redis (if REDIS=true)
  │       ├─ bootQueueJobs()                  Register queue job handlers
  │       ├─ registerModuleRoutes(app)        Auto-discover & register module routes
  │       ├─ setupBullBoard()                 Setup BullMQ dashboard UI
  │       └─ Frontend static (if FRONTEND=true & build exists)
  │
  ├─ 2. serve(app.fetch)                      Start HTTP listener on APP_PORT
  │
  ├─ 3. initRealtime(server)                  Attach Socket.IO to HTTP server
  ├─ 4. setupSocketAdminUI()                  Socket.IO admin dashboard
  │
  └─ 5. registerShutdownSignals(shutdown)     Graceful cleanup on SIGINT/SIGTERM
```

### Stage 1 — HTTP App (`http/app.ts`)

`createHttpApp()` builds the Hono application with the global middleware pipeline:

```
Request → sessionMiddleware → corsMiddleware → loggerMiddleware
  → rateLimiterMiddleware → [module routes] → response
```

Stack details:

| Middleware | File | Purpose |
|---|---|---|
| `sessionMiddleware` | `session/session.ts` | Attaches/generates session cookie, refreshes Redis TTL |
| `corsMiddleware` | `http/cors.ts` | CORS headers from `CORS_ORIGIN` |
| `loggerMiddleware` | `http/logger.ts` | Structured request logging |
| `rateLimiterMiddleware` | `http/ratelimiter.ts` | Rate limiting per IP |
| `storageStaticMiddleware` | `http/static.ts` | Serve uploaded files from `/storage/*` |
| OpenAPI | `http/openapi.ts` | Scalar API docs UI at `/api-docs` (if `OPEN_API=true`) |
| `notFound` | `http/logger.ts` | 404 JSON response |
| `onError` | `http/logger.ts` | Global error handler |

### Stage 2 — Kernel (`kernel.ts`)

`createKernel()` assembles all framework services onto the HTTP app:

1. **Storage** — Initializes the file storage driver (local disk or S3)
2. **Database** — Connects to the configured dialect (SQLite/MySQL/Postgres) via Drizzle ORM
3. **Redis** — Connects to Redis if `REDIS=true`, otherwise all Redis-backed features gracefully no-op
4. **Queue jobs** — Scans modules and registers `shouldQueue` handlers with BullMQ
5. **Module routes** — Auto-discovers all route files under `src/modules/*/routes/` and registers them on the app
6. **BullBoard** — Mounts the BullMQ queue management dashboard
7. **Frontend** — If `FRONTEND=true` and a production build exists, serves the Vue 3 SPA as static files

### Stage 3 — Server (`server.ts`)

The server entrypoint:

1. **Calls `createKernel()`** to get the assembled `app` and `bullBoard`
2. **Starts HTTP server** via `@hono/node-server` on the configured `APP_PORT`
3. **Initializes Socket.IO** — attaches realtime WebSocket to the HTTP server
4. **Sets up Socket.IO Admin UI** — web dashboard at `admin.socket.io`
5. **Prints startup info** — API docs URL, Redis status, BullBoard, Socket.IO, frontend status, dev tool URLs
6. **Registers shutdown handlers** — on SIGINT/SIGTERM, gracefully closes realtime, queues, Redis, and HTTP

## Runtime Entrypoints

| Entrypoint | File | Purpose |
|---|---|---|
| API Server | `src/framework/server.ts` | HTTP server (Hono) |
| Queue Worker | `src/framework/queue/worker.ts` | BullMQ worker process |
| Scheduler | `src/framework/scheduler/run.ts` | Cron job runner |

## Framework Structure

**nexgen**'s framework is organized into self-contained subsystems under `src/framework/`:

```
src/framework/
├── server.ts              # HTTP server entrypoint
├── kernel.ts              # App kernel (boots all subsystems)
├── facade.ts              # Public API surface
├── http/                  # Router, validation, OpenAPI, static files
│   ├── app.ts             # HTTP app factory (middleware stack)
│   ├── router.ts          # Router (createRouter, group)
│   ├── openapi.ts         # OpenAPI/Scalar configuration
│   ├── cors.ts            # CORS middleware
│   ├── ratelimiter.ts     # Rate limiting middleware
│   ├── logger.ts          # Request logging, 404, error handler
│   ├── static.ts          # Frontend & storage static file serving
│   └── validation.ts      # Zod validation helper
├── cache/                 # Redis/in-memory cache
├── database/              # Connection, pagination, schema, seed
├── events/                # Command & event dispatcher
│   └── dispatcher.ts      # dispatchEvent, dispatchCommand
├── maker-cli/             # CLI tool and stubs
├── modules/               # Module discovery and route registration
├── notification/          # Database-persisted notifications
├── queue/                 # BullMQ queue, worker, dashboard
│   ├── queue.ts           # Queue management (get, add, process)
│   ├── worker.ts          # Queue worker entrypoint
│   ├── ui.ts              # BullBoard dashboard
│   └── clear.ts           # Queue key cleanup
├── realtime/              # Socket.IO server, auth, broadcast, admin UI
│   ├── index.ts           # Realtime entrypoint (isAvailable, enabled)
│   ├── socket.ts          # Socket.IO server init, room joining, admin UI
│   ├── socket-cookie.ts   # Cookie-based Socket.IO auth
│   ├── broadcast.ts       # dispatchEvent → Socket.IO broadcast
│   └── types.ts           # TypeScript types for realtime events
├── redis/                 # Redis client connection
├── scheduler/             # Cron scheduler
│   ├── scheduler.ts       # Schedule registration and execution
│   ├── run.ts             # Scheduler worker entrypoint
│   └── lock.ts            # Distributed lock (Redis or DB)
├── session/               # Session management
├── storage/               # File storage (local/S3)
└── support/               # Utilities (JWT, mail, logger, lifecycle, etc.)
```

## Request Lifecycle

```
Client Request
    │
    ▼
@hono/node-server (HTTP listener on port 3000)
    │
    ▼
sessionMiddleware     — Attach/generate session cookie, refresh Redis TTL
    │
    ▼
corsMiddleware        — Set CORS headers
    │
    ▼
loggerMiddleware      — Log request method, path, status, duration
    │
    ▼
rateLimiterMiddleware — Check rate limits
    │
    ▼
Module Router         — Match route → run middleware → execute controller
│   │
│   ├─ authMiddleware (if route requires auth)
│   ├─ requireRole (if route requires specific role)
│   └─ Controller handler
│
├─ Success  → JSON response
├─ 404      → notFound handler
└─ Error    → onError handler (logs + returns 500)
```
