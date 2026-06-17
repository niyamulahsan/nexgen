# Environment

**nexgen** uses a Zod-validated environment schema. All configuration is managed through `.env`.

## Feature Toggles

### `REDIS`

- **Type:** boolean (`true` / `false`)
- **Default:** `false`

Controls all Redis-backed subsystems. When `REDIS=false`, the framework skips Redis connection entirely and every Redis-dependent feature degrades gracefully.

**Code path:** `src/framework/redis/client.ts:30` — `initRedis()` returns `null` immediately when `REDIS=false`. No connection attempt is made.

| Subsystem | `REDIS=true` | `REDIS=false` |
|---|---|---|
| **Queue** (BullMQ) | Jobs processed by persistent worker with retries, backoff, and job events | Queue worker refuses to start. Jobs dispatched via `queueJob()` return `null`. **Dispatched events with `{ queue: true }` are silently dropped** |
| **Cache** (`cache.ts:22`) | Redis-backed TTL cache. Entries survive restarts | All methods return `null` / fallback value. No in-memory fallback — cache is a no-op |
| **Session** (`session.ts:36`) | Redis-backed session store. Sessions shared across instances | All methods return `null` / `false`. The session cookie is still set, but no data is stored |
| **Realtime** (`socket.ts:42`) | Socket.IO uses Redis adapter for cross-instance event broadcasting | Socket.IO works in single-instance mode only. Events broadcast only to clients connected to the same process |
| **Scheduler** (`scheduler/lock.ts`) | Distributed Redis lock prevents duplicate cron execution across instances | Falls back to database-level locking using `scheduler_locks` table |
| **BullBoard** (`queue/ui.ts:52`) | Live queue dashboard with job details, retry, and stats | Dashboard shows "unavailable" page |

**Dependency chain:**
```
REDIS → Queue → Worker process (maker queue:work)
      → Cache
      → Session store
      → Socket.IO adapter
      → Scheduler lock
      → BullBoard
```

**Startup behavior:** `initRedis()` uses `lazyConnect` with `enableReadyCheck`. If Redis is unreachable at startup, the server still boots — all Redis features log a warning and degrade. The app does not crash.

---

### `SOCKET`

- **Type:** boolean (`true` / `false`)
- **Default:** `true`

Controls the Socket.IO realtime server. When disabled, no Socket.IO instance is created.

**Code path:** `src/framework/realtime/socket.ts:28` — `initRealtime()` returns `null` immediately when `SOCKET=false`. No `Server` instance is created, no WebSocket upgrade handler is registered on the HTTP server.

**Behavior:**
| Action | `SOCKET=true` | `SOCKET=false` |
|---|---|---|
| `dispatchEvent(event, data, { broadcast })` | Emits to connected Socket.IO clients | `broadcast` option is silently ignored. Event is still dispatched to queue if specified |
| Socket.IO server | Initialized at startup, accepts WebSocket connections | Not initialized. `/socket.io` endpoint does not respond |
| Frontend `__SOCKET_ENABLED__` constant (`vite.config.ts:19`) | `true` — Vue app initializes Socket.IO client | `false` — Vue app skips client setup |
| Admin UI (`realtime/ui.ts:6`) | Enabled (dev-only, guarded by `APP_ENV`) | Disabled |
| Socket.IO Admin UI CORS (`socket.ts:17`) | `admin.socket.io` added to allowed origins | Not added |

**Dependency:** None — Socket.IO works without Redis for single-instance setups. When `SOCKET=true` and `REDIS=true`, the Redis adapter is automatically configured for multi-instance broadcasting (`socket.ts:42`).

---

### `FRONTEND`

- **Type:** boolean (`true` / `false`)
- **Default:** `true`

Controls whether the Vue 3 frontend build is served from the same API server.

**Code path:** `src/framework/kernel.ts:34` — after all API routes are registered, `createKernel()` conditionally mounts the built frontend static files and SPA fallback middleware.

**Behavior:**

| Aspect | `FRONTEND=true` | `FRONTEND=false` |
|---|---|---|
| **Static files** | Built Vue assets served from `public/` directory | Not served |
| **SPA fallback** | All unmatched `GET` routes return `index.html` (Vue router handles routing) | Returns `404` via Hono `notFound` handler |
| **API-only** | No — server serves both API and frontend | Yes — only API routes respond |
| **Build process** (`build-frontend.mjs:10`) | Frontend is built during `npm run build` | Frontend build is skipped. `public/` directory is left as-is |
| **Dev stack** (`runtime/core.mjs:64`) | Vue dev server (Vite) is started on port 5173 with HMR | Only the API server starts |
| **Root `/` route** (`http/app.ts:49`) | When frontend build exists: serves the SPA. When no build: returns `{ name, ok: true }` JSON | Returns `{ name, ok: true }` JSON |

**Use cases:**
- `FRONTEND=false` — API-only mode. Use when you have a separate frontend (React, mobile app, third-party consumer). Set `FRONTEND_URL` for CORS configuration.
- `FRONTEND=true` — Monolith mode. API and frontend served from the same domain. No CORS issues. Best for small teams and prototypes.

### `FRONTEND_URL` and Session Cookies

When your frontend is hosted on a **different origin** than the API, set `FRONTEND_URL` to the frontend's origin (e.g., `https://app.example.com`). This affects:

**Session cookie (`src/framework/session/session.ts:18`):**
- If `APP_URL` and `FRONTEND_URL` are on different origins, the session cookie is set with `SameSite=None; Secure` — required by browsers to send cookies across origins.
- If both are on the same origin (or `FRONTEND_URL` is empty), the cookie uses `SameSite=Lax` — more secure and works without HTTPS locally.

**Socket.IO CORS (`src/framework/realtime/socket.ts:15`):**
- `FRONTEND_URL` is added to the Socket.IO allowed origins list so the frontend can establish WebSocket connections.

**Auth cookies** (`src/framework/support/cookie.ts`) always use `SameSite=Lax` regardless of `FRONTEND_URL`. This means auth cookies only work when the frontend navigates to the API domain (not for cross-origin fetch requests). For full cross-origin auth, use the session cookie mechanism or implement a token-based auth flow.

**When to set it:**
- **Frontend on a different domain** (e.g., API at `api.example.com`, frontend at `example.com`): Set `FRONTEND_URL=https://example.com`
- **Frontend and API on same domain** (e.g., API at `example.com/api`, frontend SPA at `example.com`): Leave `FRONTEND_URL` empty
- **API-only (no frontend)**: Leave empty
- **Local development** (`FRONTEND=true` with Vite on `localhost:5173`): The dev CLI automatically handles this — no manual config needed

**Dependency:** None. The frontend build is a static SPA — it does not require any server-side rendering or Node.js process.

---

### `OPEN_API`

- **Type:** boolean (`true` / `false`)
- **Default:** `true`

Controls the OpenAPI / Scalar documentation endpoint.

**Code path:** `src/framework/http/openapi.ts:11` — `configureOpenApi()` registers the Scalar UI at `/api-docs` and the JSON spec at `/doc`.

**Behavior:**

| Aspect | `OPEN_API=true` | `OPEN_API=false` |
|---|---|---|
| **Scalar UI** | Available at `/api-docs` | Not registered |
| **OpenAPI JSON spec** | Available at `/doc` | Not registered |
| **Route registration** | All `@hono/zod-openapi` routes are fully documented with schemas | Routes still work — just the documentation endpoints are removed |
| **`/health` route** (`http/app.ts:53`) | Registered as an OpenAPI route with Zod schema | Registered as a plain GET route (no OpenAPI wrapping) |

---

### `AUTH_REQUIRE_EMAIL_VERIFICATION`

- **Type:** boolean (`true` / `false`)
- **Default:** `false`

Controls whether users must verify their email before being allowed to log in.

**Behavior:**
- `true`: After registration, user account is marked unverified. Login is rejected until email is confirmed via the verification link sent to their inbox. Requires a working mail configuration (`MAIL_HOST`, `MAIL_PORT`, etc.).
- `false`: Users can log in immediately after registration. Email verification routes exist but are optional.

**Dependency:** Requires valid mail configuration when `true`. The verification email is sent via the queue's `mail` queue (`src/modules/auth/jobs/registeruser.ts`).

---

### `MAIL_FAIL_SILENT`

- **Type:** boolean (`true` / `false`)
- **Default:** `true`

Controls error handling in the mailer.

- `true`: Mail delivery errors are logged but never thrown. A failed email does not crash the request.
- `false`: Mail delivery errors propagate up. Useful during development to catch misconfiguration early.

## Feature Interaction Map

```
REDIS=true
 ├── Queue worker required for async jobs
 ├── Cache persists across restarts
 ├── Sessions shared across instances
 ├── Socket.IO broadcasts across instances
 ├── Scheduler locks across instances
 └── BullBoard live dashboard

SOCKET=true
 └── REDIS=true → multi-instance realtime
 └── REDIS=false → single-instance realtime

FRONTEND=true  → API + SPA monolith (no CORS, cookies use SameSite=Lax)
FRONTEND=false → API-only (set FRONTEND_URL for CORS + cross-site cookies)

OPEN_API=true  → /api-docs + /doc
OPEN_API=false → bare API, no docs endpoints

AUTH_REQUIRE_EMAIL_VERIFICATION=true
 └── Requires MAIL_HOST + queue:work running (for mail queue)
```

## Application

| Variable | Default | Description |
|---|---|---|
| `APP_NAME` | `nexgen` | Application name used in logging and email headers |
| `APP_ENV` | `development` | Runtime environment: `development`, `production`, or `test` |
| `APP_PORT` | `3000` | HTTP server port |
| `APP_URL` | — | Public-facing URL of the application (required) |
| `FRONTEND_URL` | — | Separate frontend URL when frontend is on a different domain than the API. Leave empty when frontend is served from `APP_URL`. |
| `LOG_LEVEL` | `debug` | Logging verbosity: `debug`, `info`, `warn`, `error` |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |

## Database

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:./...` | Database connection string (SQLite, MySQL, PostgreSQL) |

## Storage

| Variable | Default | Description |
|---|---|---|
| `STORAGE_DRIVER` | `local` | `local` or `s3` |
| `STORAGE_DISK` | `public` | Disk prefix: `public`, `private`, or `tmp` |
| `STORAGE_BUCKET` | — | S3 bucket name (required when `STORAGE_DRIVER=s3`) |
| `STORAGE_REGION` | `us-east-1` | S3 region |
| `STORAGE_ENDPOINT` | — | S3-compatible endpoint URL |
| `STORAGE_ACCESS_KEY_ID` | — | S3 access key (required when `STORAGE_DRIVER=s3`) |
| `STORAGE_SECRET_ACCESS_KEY` | — | S3 secret key (required when `STORAGE_DRIVER=s3`) |
| `STORAGE_FORCE_PATH_STYLE` | `false` | Use path-style S3 URLs (required for MinIO) |
| `STORAGE_SIGNED_URL_TTL_SECONDS` | `900` | Signed URL expiration in seconds |

## Redis

| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection string |
| `REDIS_PREFIX` | `nexgen` | Key prefix for Redis namespacing |
| `BULLMQ_UI_ALLOWED_EMAILS` | — | Comma-separated emails allowed to view the BullMQ dashboard |
| `REDIS_COMMANDER_PORT` | `1369` | Redis Commander GUI port |

## Rate Limiter

| Variable | Default | Description |
|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window in milliseconds (1 min) |
| `RATE_LIMIT_MAX` | `500` | Max requests per window (global) |
| `RATE_LIMIT_LOGIN_MAX` | `10` | Max login requests per window per IP |

## Session & Cache

| Variable | Default | Description |
|---|---|---|
| `SESSION_COOKIE` | — | Session cookie name (required) |
| `SESSION_TTL_SECONDS` | — | Session TTL in seconds (required) |
| `CACHE_TTL_SECONDS` | `3600` | Default cache TTL (1 hour) |

## JWT & Cookies

| Variable | Default | Description |
|---|---|---|
| `JWT_ACCESS_SECRET` | — | Access token signing secret (required) |
| `JWT_REFRESH_SECRET` | — | Refresh token signing secret (required) |
| `JWT_ACCESS_EXPIRY` | `900` | Access token TTL in seconds (15 min) |
| `JWT_REFRESH_EXPIRY` | `2592000` | Refresh token TTL in seconds (30 days) |
| `JWT_REFRESH_REMEMBER_EXPIRY` | `604800` | "Remember me" refresh TTL in seconds (7 days) |
| `COOKIE_NAME` | `nexgen` | Cookie name |
| `COOKIE_SECRET` | — | Cookie signing secret (required) |

## Mail

| Variable | Default | Description |
|---|---|---|
| `MAIL_HOST` | `127.0.0.1` | SMTP host |
| `MAIL_PORT` | `1089` | SMTP port |
| `MAIL_USERNAME` | — | SMTP username |
| `MAIL_PASSWORD` | — | SMTP password |
| `MAIL_FROM_ADDRESS` | `noreply@nexgen.local` | Default sender address |
| `MAILDEV_WEB_PORT` | `1080` | Maildev web UI port |
| `MAIL_FAIL_SILENT` | `true` | Suppress mail delivery errors |
