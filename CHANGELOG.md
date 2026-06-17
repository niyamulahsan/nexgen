# Changelog

## [2.2.1] — 2026-06-17

### Fixed

- **Biome import fixup** — `organizeImports` stripped component imports used only in Vue `<template>` blocks. Restored 150+ missing imports across stats project, nexgen template, and create-nexgen template. Also reverted unsafe `noUnusedVariables` renames (`_logout`, `_themeIconClass`, `_startYear`/`_currentYear`) that broke template bindings. Added missing `vSelect` import (vue-select) and fixed `Object.hasOwn` → `in` operator for ES2020 compat.

## [2.2.0] — 2026-06-17

### Overview

Replaced ESLint + Prettier with Biome, unifying linting and formatting under a single tool with consistent code style applied across the entire codebase. Added `paginateModel()` for relational query pagination, `skipFetch` option in Gum for client-side navigation, and `FeatureButton` for extensible nav bar buttons. Fixed paginate count query and removed dead `Refresh.vue` component.

### Features

#### Tooling

- **ESLint + Prettier removed** — replaced with Biome v2.5.0 (`preset: "recommended"`)
- **Biome config** — 8 rule overrides matching previous ESLint behavior: `noUnusedVariables`, `useExhaustiveDependencies`, `noConsole`, `noSwitchDeclarations`, `useOptionalChain`, `useDefaultSwitchClause`, `noParamAssign`, `useVueMultiWordComponentNames`
- **package.json scripts** — `lint`, `lint:fix`, `format`, `format:check` now use Biome
- **Removed 8 devDependencies** — `eslint`, `@eslint/js`, `eslint-plugin-vue`, `typescript-eslint`, `prettier`, `eslint-config-prettier`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`
- **Deleted config files** — `eslint.config.js`, `.prettierrc`, `.prettierignore`
- **`.gitignore`** — added `coverage/` and `src/storage/trash/`

#### Database

- **`paginateModel()`** — new paginator for Drizzle relational queries (`db.query.table.findMany`) with support for `where`, `with`, `columns`, `extras`, `orderBy`, and custom `total`/`data` callbacks
- **`resolvePath()`** — extracted URL resolution helper used by `paginate()` and `paginateModel()`
- **Fixed paginate count query** — replaced broken `.as("paginate_rows")` with proper inner select for accurate total row counting

#### Frontend

- **`FeatureButton.vue`** — new component for registering extensible nav bar buttons via `inject("featureButtons")`
- **Header.vue** — replaced commented-out refresh button with `featureButtons` slot; removed dead `Refresh.vue`
- **`skipFetch` option** — `gum.visit()` / `useGum()` now supports `skipFetch: true` for client-side route transitions without a server roundtrip

#### Documentation

- **Rate Limiter** — new guide page covering per-IP and per-session rate limiter configuration
- **Database** — updated migration and seeding docs
- **Environment** — documented new `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `RATE_LIMIT_LOGIN_MAX` variables
- **Events & Queue** — minor corrections
- **Components** — expanded API reference
- **Gum** — documented `skipFetch` option

### Fixes

- **Paginate count query** — count subquery now uses `db.select({ val: sql\`1\` }).from(query.as("_inner"))` instead of broken `.as("paginate_rows")` pattern
- **Subcriteria dropdown** — `subcriteriaDD` returns `null` when no criteria is selected, preventing unnecessary API requests
- **FloatButton** — simplified template; renamed unused `floatStyle` to `_floatStyle` for Biome compliance
- **env.d.ts** — added blank line separators between `declare module` blocks for Biome formatting

### Dependencies

- **Runtime**: Node.js >= 24 or Bun >= 1.3 (unchanged)
- **Database**: SQLite (default), MySQL, or PostgreSQL (unchanged)
- **Optional**: Redis (unchanged)
- **Dev**: ESLint + Prettier removed, Biome v2.5.0 added

### Upgrade Notes

Run `npm install` to pick up new devDependencies. Run `npx biome check --write .` to reformat any open feature branches. The `paginate()` function's internal count query changed — if you were relying on the old `.as("paginate_rows")` pattern, no migration needed as it was internal.

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
