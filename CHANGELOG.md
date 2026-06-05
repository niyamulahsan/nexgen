# Changelog

## [2.1.1] — 2026-06-05

### Overview

First stable release of **nexgen** — a full-stack TypeScript framework built on Hono, Vue 3, and Drizzle ORM. This release covers the complete feature set: modular architecture, Redis-backed services, real-time broadcasting, authentication, OpenAPI docs, frontend SPA, maker CLI, and Docker deployment.

### Features

#### Core Framework

- **Hono HTTP server** with Zod-validated middleware stack (session, CORS, logger, rate limiter)
- **Modular monolith** — self-contained modules under `src/modules/` with auto-discovered routes, jobs, models, and seeders
- **OpenAPI / Scalar** — auto-generated API documentation at `/api-docs` with JSON spec at `/doc`
- **Health endpoint** at `GET /health`
- **File storage** — local disk or S3-compatible storage with signed URLs
- **Dual database** — SQLite, MySQL, or PostgreSQL via Drizzle ORM

#### Authentication & Security

- **JWT auth** — access + refresh token rotation with signed httpOnly cookies
- **Email verification** — optional `AUTH_REQUIRE_EMAIL_VERIFICATION` flow
- **Password reset** — token-based forgot/reset with queue-emailed links
- **Role middleware** — `requireRole("admin")` guard for admin routes
- **Rate limiting** — per-IP rate limiter middleware

#### Redis-Backed Services (optional)

- **Cache** — TTL-based key-value cache with `cache.get/put/forget/remember`
- **Session** — server-side session store with httpOnly cookie, auto-refresh
- **Queue** — BullMQ job processing with `shouldQueue` decorator, retries, backoff
- **Realtime** — Socket.IO with Redis adapter for multi-instance broadcasting
- **Scheduler** — cron-based `defineSchedule` with distributed Redis lock
- **BullBoard** — live queue dashboard at `/bullmq`
- **Redis Commander** — GUI at configurable port (1369)

#### Events & Realtime

- **String-based event dispatcher** — `dispatchEvent(name, payload, options)` with broadcast and queue support
- **Socket.IO server** — automatic room joining by auth, user ID, and role
- **Frontend Pulse plugin** — `pulse.channel(name).listen(event, callback)` API
- **Notifications system** — `notify()` persists to database and optionally broadcasts + emails
- **Mail queue** — dedicated `mail` queue for async email delivery (nodemailer + SMTP)

#### Maker CLI

- `maker dev` — starts API server, frontend HMR, queue worker together
- `maker module:make` — scaffolds controllers, routes, models, seeders, jobs, schedules
- `maker db:migrate --seed` — generates schema, runs migrations, seeds
- `maker serve --prod` — production mode with compiled `dist/`
- `maker queue:work` — BullMQ worker process
- `maker schedule:work` — cron scheduler worker
- `maker deploy` — Docker-based deployment with nginx-proxy and SSL

#### Frontend (Vue 3 SPA)

- **Gum plugin** — Inertia-style page visits, form handling with validation errors, scroll preservation, `useGumRemember()` for local UI state
- **Pulse plugin** — Socket.IO realtime channels with room-based event listening
- **Dialog plugin** — programmatic `alert()`, `confirm()`, `prompt()` modals
- **Auth pages** — login, register, forgot/reset password, email verification
- **UI components** — DataTable (server-side pagination), Select (API-fetched with infinite scroll), Modal, Toast, Button, Input, Switch, and 12 more
- **DataTable** — full server-side pagination, search, bulk delete, skeleton loading, slot-based customization
- **Theme system** — light/dark/auto with SCSS variable overrides
- **Route progress bar** — animated navigation indicator
- **Pinia stores** — auth store with session bootstrap, admin-ui store with sidebar + theme state
- **Axios interceptor** — 401 auto-redirect to `/login`

#### Documentation

- Comprehensive VitePress docs with full API reference for every plugin, component, and subsystem
- Dedicated pages for Gum, Pulse, Dialog, Router, Stores, Composables, Components, Validation, Assets, Axios
- Architecture guide with boot sequence diagram and middleware stack
- Complete env variable reference with feature interaction map
- Module development guide with OpenAPI stub variants

#### Deployment

- **Docker Compose** — two-layer deploy: app server + nginx-proxy with auto-SSL
- **Local deploy** — `maker deploy:local` with containerized MySQL and Redis
- **Remote deploy** — `maker deploy:remote` with SSH and Docker context
- **CI/CD** — GitHub Actions workflow for docs deployment

### Fixes

- Signed cookie auth with separate frontend/app URL support
- Raw SQL query support in migrations (indexes, alter table)
- Seeder execution sequence ordering
- OpenAPI route tag placeholder handling
- Modal and toast component edge cases
- Zod async `safeParse` for async validation schemas
- Template sync for publish workflow

### Dependencies

- **Runtime**: Node.js >= 24 or Bun >= 1.3
- **Database**: SQLite (default), MySQL, or PostgreSQL
- **Optional**: Redis (for cache, session, queue, realtime, scheduler)

### Upgrade Notes

This is the first stable release. No upgrade path from earlier versions since none were tagged.
