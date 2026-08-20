# Changelog

## [3.0.7] — 2026-08-21

### Fixed

- **`--with` flag parsing** — `parseWithOptions` now splits on `/[,\s]+/` so commas and spaces both work, fixing yarn's `--with=redis,maildev,studio` being treated as a single argument.
- **`@hono/zod-openapi` pinned to `~1.5.3`** — `^1.5.2` resolved to 1.6.1 which pulls `@asteasolutions/zod-to-openapi@^9`, breaking `stoker`'s peer dependency on `^8`. Tilde keeps it on 1.5.x.
- **`redis-commander` bumped to `^0.9.0`** — old `^0.4.5` uses `express@3` + `ejs@0.8` which crash with pnpm's newer EJS resolution. `0.9.0` uses `express@4` + `ejs@3`.

### Documentation

- **Quick Start — Package Manager Setup** — new section explaining extra files needed for pnpm (`pnpm-workspace.yaml` with `allowBuilds`) and yarn (`.yarnrc.yml` with `nodeLinker: node-modules` + `dependenciesMeta` in `package.json`).

---

## [3.0.3] — 2026-08-20

### Fixed

- **create-nexgen yarn PnP crash** — scaffolder always downloads the tarball from the npm registry instead of using a local copy, fixing `cpSync` ENOENT errors under Yarn PnP (zip-mounted `node_modules`).
- **create-nexgen leaked `index.js`** — tar extraction now only includes `package/template/*` paths, preventing the CLI source file from appearing in the scaffolded project.
- **create-nexgen peerDependencies synced** — replaced Winston with Pino, bumped `@bull-board/*` to ^8, `nodemailer` to ^9, `redis-commander` to ^0.4, added `@libsql/client`, `@socket.io/bun-engine`, `bullmq-durable`, `croner`, `postgres`; engines updated to `node >=24`, `bun >=1.3.0`, `pnpm >=10`, `yarn >=4`.
- **create-nexgen template dependencies synced** — root `template/package.json` updated to match all framework dependencies.

---

## [3.0.0] — 2026-08-19

### Overview

Unified environment and configuration handling across backend and frontend, added runtime feature toggles (`OPEN_API`, `REDIS`, `FRONTEND`, `SOCKET`) to the Zod schema, consolidated deploy env templates, switched logger from Winston to Pino, added keyboard shortcuts to Dialog, rewrote the entire documentation site with VitePress, and professionalized the GitHub/npm READMEs.

### Features

#### Environment & Config

- **`REDIS`, `OPEN_API`, `FRONTEND`, `SOCKET` in Zod schema** — all four feature toggles now live in `env.ts` with boolean transforms (`!== "false" && !== "0"`), making them the single source of truth. Config files (`app.ts`, `redis.ts`, `realtime.ts`) read from the schema instead of hardcoding.
- **`SOCKET` env toggle** — `config/realtime.ts` reads `env.SOCKET` instead of hardcoding `enabled: true`. The ViteFrontend config also reads `process.env.SOCKET` to control the Pulse client build.
- **`queueUiAllowedEmails` moved** — moved from `redis.ts` to `queue.ts` as `allowedEmails: ""` since it's queue-specific.

#### Deploy

- **Deploy env templates rewritten** — all three stubs (`mysql.server.stub`, `postgres.server.stub`, `sqlite.stub`) now include `OPEN_API`, `SOCKET`, `FRONTEND`, `REDIS`, `REDIS_PREFIX`, `FRONTEND_URL`, `JWT_*`, `COOKIE_SECRET`, `STORAGE_*`, `MAIL_*` with proper comments distinguishing config-file settings from env-var secrets.
- **Deploy core.mjs** — `OPEN_API` and `SOCKET` values now read from the root `.env` and injected into generated templates.
- **`deploy:init` auto-creates `.env`** — workflow copies `.env.example` → `.env` automatically; users only edit `.example` files.
- **`deploy:workflow` env sync** — `ensureEnvFile()` ensures both `deploy/.env` and `deploy/server/.env` exist before starting containers.

#### CLI

- **`module:make-test` added** — new command for generating test scaffolding for modules.
- **`db:fresh` alias** — `db:migrate:fresh` now works as an alias.
- **`db:reset` aliases** — `db:migrate:reset` and `db:wipe` now work as aliases.
- **`serve --src` flag** — allows specifying a custom source directory.
- **`queue:work` comma-separated queues** — `--queue=default,mail,maintenance` now properly parses comma-separated values.
- **`deploy:init --pm` supports `bun`** — package manager flag now accepts `bun` in addition to `npm|pnpm|yarn`.

#### Frontend

- **Dialog keyboard shortcuts** — `bindKeys` with Enter (OK) and Escape (Cancel), guarded by `shell.isConnected`. `stopPropagation` added to prevent event bubbling.
- **Auth pages use logo** — all five auth pages (`login`, `register`, `forgotPassword`, `resetPassword`, `verifyEmail`) display `logo.png` from the Sidebar component.
- **Pulse timing fix** — `pulse.channel()` moved to `onMounted` with null guard to prevent race conditions.
- **Theme dark primary** — template dark theme primary changed from `$warning` (yellow) to `#3b8eed` (VitePress blue).

#### Logger

- **Winston → Pino** — `support/logger.ts` rewritten to use Pino with `fatal`, `trace`, and `child()` methods. `config/logging.ts` now uses Pino-style config (`level: "info"`, `httpRequests: true`).

### Fixes

- **Boolean parsing unified** — all maker-cli scripts use `!== "false" && !== "0"` for boolean env parsing, matching the Zod schema logic.
- **Plain/OpenAPI stubs** — example and notification modules now have plain and OpenAPI variants based on `OPEN_API` flag.
- **Sync-template basename check** — `skipDirs` filter in `sync-template.mjs` now correctly checks basename instead of full path.
- **Notification module refactor** — removed 4 injection functions and Vue file generation; backend-only.
- **DataTable sort removed** — documentation corrected to reflect that DataTable does not handle sort internally.
- **`useGumForm` `onProgress` removed** — documentation corrected; `form.progress` is updated internally, not via options.
- **`useAuth` composable** — documentation rewritten to reflect actual API: `user`, `isAuthenticated`, `setUser`, `clearUser`, `hasRole()`.

### Documentation

- **Full VitePress redesign** — docs site rebuilt with VitePress, blue brand color (`#3b8eed`), identical layout structure to Vue.js docs.
- **Sidebar restructured** — new sections: Getting Started, Essentials, Services, Frontend, Support, Others.
- **Logo & favicon** — integrated into docs `public/`, template assets, Sidebar.vue, and all auth pages.
- **Deploy docs rewritten** — `overview.md`, `local.md`, `remote.md` rewritten to match actual source code: corrected Dockerfile examples, file trees, env variable tables, workflow step order, and added `rsyncSshPath`/`rsyncSshOptions` config fields.
- **CLI docs fixed** — command counts corrected (Module 16, Database 14, Runtime 14, Deploy 6), missing `module:make-test` added, `--view` options corrected (no `bullmq`), `serve --src` documented.
- **Components docs rewritten** — DataTable (props/slots/events/PaginatedData interface), Datepicker (4 modes), Select (FetchPack/cascade/resetKey), FeatureButton.
- **Composables docs rewritten** — `useAuth()` actual API, `hasRole()`, `authUser`.
- **Helpers docs rewritten** — `formatCompactNumber`, `inArray`, `empty`, `downloadFile`, `downloadExcel`, `formatTaxPeriod`, `formatDate`.
- **Support docs fixed** — cookie name (`nexgen`), JWT expiries (900/3600/2592000), logger (Pino not Winston), mail settings moved to config file section.
- **Env docs updated** — `SOCKET` added to Application table, `FRONTEND` description updated, config entries removed.
- **Modules docs** — default column swapped to `OPEN_API=false`.
- **READMEs rewritten** — GitHub README with donate button (Support Kori + GitHub Sponsors), runtime/package manager tables; npm README with professional text.

### Dependencies

- **Logger**: Winston replaced by Pino
- **Docs**: VitePress added as dev dependency

### Upgrade Notes

**This is a major release with breaking changes.** Upgrading from v2.x requires manual steps.

1. **Folder structure changed** — review the new architecture and adjust imports if you moved files outside the standard structure.
2. **Update `config/realtime.ts`** — now reads `env.SOCKET` instead of hardcoding `enabled: true`. Ensure `SOCKET` is set in your `.env`.
3. **Update `config/queue.ts`** — `queueUiAllowedEmails` moved from `redis.ts`. If you customized it, move the value.
4. **Update `.env`** — add `OPEN_API=false`, `REDIS=false`, `FRONTEND=true`, `SOCKET=true` if not present.
5. **Re-run `deploy:init --force`** — deploy env templates changed significantly; regenerate all deploy files.
6. **Logger** — Winston replaced by Pino. If you imported `winston` directly, switch to `pino`. Run `npm install` to pick up the new dependency.
7. **Notification module** — Vue file generation removed. If you relied on `NotificationBell.vue` or `index.vue` stubs, they no longer exist.
8. **Boolean env parsing** — unified to `!== "false" && !== "0"`. Values like `"no"` or `"off"` are now treated as `true`. Use `"false"` or `"0"` to disable.
9. **CLI command changes** — `deploy:local` and `deploy:remote` removed; use `deploy:workflow` and `deploy:workflow:remote`. `--view=bullmq` removed from `dev` command.

---

## [2.3.0] — 2026-08-12

### Overview

Consolidated the 16 deploy CLI commands into a single 6-command surface (`deploy:init`, `deploy:workflow`, `deploy:workflow:remote`, `deploy:workflow:promote`, `deploy:db:import`, `deploy:db:import:remote`) and added nginx-proxy reverse proxy support to the generated compose files. Also shipped a batch of bug fixes across the scheduler, mail, database import, and frontend components, plus a new `Datepicker` component and a Public Sans UI font.

### Features

#### Deploy CLI

- **Deploy commands consolidated from 16 → 6** — the many `deploy:create:*`, `deploy:server`, `deploy:app`, `deploy:workflow:*` variants collapsed into:
  - `deploy:init` — generate app + server scaffolding and both workflow configs (`--app-only`, `--server-only`, `--dev`, `--force`, `--runtime`, `--pm`)
  - `deploy:workflow` — local pipeline from a config file or flags (`--server-only`, `--app-only`, `--refresh`, `--dry-run`)
  - `deploy:workflow:remote` — upload via `rsync`/`scp` and deploy on a remote host
  - `deploy:workflow:promote` — run local workflow, then remote workflow
  - `deploy:db:import` / `deploy:db:import:remote` — SQL dump import with auto-detected MySQL or PostgreSQL
  - Legacy names (`deploy:create`, `deploy:server`, `deploy:app`, `deploy:db:import`) still work inside workflow config files
- **`deploy:init` generates workflow configs** — `deploy/workflow.local.json` and `deploy/workflow.remote.json` are created automatically, so no separate init step is needed. The local workflow uses `deploy:workflow --server-only` / `--app-only` steps.
- **Reverse proxy (nginx-proxy) support** — generated app compose attaches to the external `nginx-proxy` network and reads `VIRTUAL_HOST`, `VIRTUAL_PORT`, `LETSENCRYPT_HOST`, `LETSENCRYPT_EMAIL` from `deploy/.env` for domain routing and auto-SSL.
- **`APP_URL` env variable** — added to deploy env templates (used for links, redirects, CORS). Also wired into the app compose `APP_URL` default.
- **PostgreSQL dump import** — `deploy:db:import` now auto-detects the dialect (MySQL or PostgreSQL) and restores PostgreSQL into a fresh database by default (`DROP DATABASE ... WITH (FORCE)` + recreate); pass `--no-drop` to keep the existing database.
- **`preDeployCommands`** — remote workflow config gained an array of commands run on the remote host before the app starts (e.g. `docker rm -f old-app`).
- **pgAdmin servers.json mount** — server compose mounts `./pgadmin/servers.json` into the pgAdmin container as read-only.
- **Bun Dockerfile copies `.env`** — `deploy/.env` is copied into the image before schema generation so `db:schema` runs with the right `DATABASE_URL`.

#### Mail

- **`MAIL_ENCRYPTION` env variable** — new `ssl` | `tls` | `none` option (default `none`). `ssl` enables implicit TLS (port 465), `tls` enables STARTTLS (port 587). The mail transport now sets `secure` from this value instead of hardcoding `false`.

#### Scheduler

- **Run-on-init + console output** — `runOnInit` schedules now run sequentially after all cron jobs are registered, under a "Running Scheduled Commands" header. Every run logs the task name with its elapsed time (or `FAIL` on error). `startScheduler()` returns the number of registered schedules (logged as `Scheduler started [N schedule(s)]`).

#### Frontend

- **`Datepicker.vue` component** — new date/datetime/month/year picker wrapping `@vuepic/vue-datepicker` (added as a dependency), with a native `input[type=month]` fallback for month mode on Firefox.
- **Public Sans font** — self-hosted WOFF2 (latin + latin-ext) wired into `body`, `--bs-body-font-family`, and `--bs-font-sans-serif`.
- **Skeleton theme variables** — `--app-skeleton` / `--app-skeleton-hi` added to both light and dark themes; `DataTableSkeleton` uses the theme-aware `skeleton card border` classes instead of hard-coded white.
- **`FeatureButton` render slot** — supports a default slot for compound header controls (dropdowns etc.); header renders the slot inside a wrapper with the same order/class as a normal button. `attrs` prop renamed to `buttonClass`.
- **`Input` `echallan-number` category** — new formatting category that uppercases and forces `V` + 9 digits.
- **`Select` search pinning** — after clearing a search, the last search results are pinned on top of the refetched full list so you don't lose your place.
- **`TextArea` default rows** — added `rows="3"` default.
- **`Header.vue`** — "My Profile" is now a real `<router-link to="/profile">` instead of a dead `href="#"`; ordering classes and `title` attributes cleaned up.
- **`Pagebar`** — simplified title logic (`title` shown only when there's no default slot).
- **`Pagination`** — adds a `pagination-${variant}` class.
- **Dialog theming** — overlay uses `var(--app-backdrop)` / `var(--app-text)` and the card header/footer no longer hard-code `bg-white`, so dialogs follow light/dark mode automatically.
- **Helpers** — added `formatTaxPeriod()` (`yyyy-MM` → `MMM yyyy`) and `formatDate()` (ISO → `dd MMM yyyy`).
- **`.fs-7`** — 12px font-size helper class.

### Fixes

- **Deploy DB dialect detection** — `detectMigrationDialectFromSql` now checks PostgreSQL hints first (`GENERATED ALWAYS AS IDENTITY`, `bigserial`, `serial`, `timestamp with time zone`, `public.`), uses MySQL-only hints (`auto_increment`, `engine=`, backticks), and no longer misdetects `varchar(` as MySQL.
- **Migration hooks under Bun** — `runMigrationHooks()` runs `bun` directly when running under Bun instead of `tsx dist/cli.mjs`, fixing `db:migrate` under the Bun runtime.
- **`auto-migrate.sh` hardening** — normalizes `AUTO_MIGRATE` (trims, lowercases, strips Windows `\r`) and documents the flow; `set -eu` retained.
- **Queue worker queues** — `maker dev` worker now also processes the `maintenance` queue (`--queue=default,mail,maintenance`).
- **`Button.vue`** — removed leftover `d-flex justify-content-center align-items-center custom-btn` classes.
- **Scheduler error handling** — a failing schedule run logs `FAIL` instead of crashing the scheduler process.
- **`RATE_LIMIT_LOGIN_MAX` default** — raised from `10` to `60` so legitimate login attempts aren't rate-limited during password reset workflows.

### Documentation

- **Deploy guide rewritten** — `cli/deploy.md`, `deploy/overview.md`, `deploy/local.md`, `deploy/remote.md` updated for the 6-command surface, including a removed-commands migration table and the new remote config (`upload`, `preDeployCommands`) and nginx-proxy SSL section.
- **Environment guide** — documented `MAIL_ENCRYPTION` and the new `RATE_LIMIT_LOGIN_MAX` default (also updated in the Rate Limiter guide).
- **Mail guide** — documented the `ssl` / `tls` / `none` encryption modes.
- **Scheduler guide** — documented the new console output and run-on-init behavior.
- **Components guide** — added `Datepicker` and `FeatureButton` sections, Input formatting categories, Select search pinning, and updated the component list.
- **Assets guide** — documented the Public Sans font and the theme CSS variables.
- **Helpers guide** — documented `formatTaxPeriod()` and `formatDate()`.
- **Runtime guide** — updated the `maker dev` worker queues.

### Dependencies

- **Added** `@vuepic/vue-datepicker@^14` (root + template)

---

## [2.2.5] — 2026-06-27

### Changed

- **Modal.vue refactored** — removed Bootstrap `Modal` JS dependency. The component now uses a native `data-bs-dismiss` button reference (`closeButton`) for closing, eliminating the need for `import Modal from "bootstrap/js/dist/modal.js"`, manual instance management, and backdrop cleanup logic. The `open()` method was removed as the parent caller manages visibility via the Bootstrap data API. Template attributes were also collapsed to single lines.

### Removed

- **Bootstrap Modal JS import** — removed `modal.js` import and `Modal` instance lifecycle (`getOrCreateModal`, `onMounted`, `onBeforeUnmount`, `dispose`). The modal is now fully Bootstrap data-API-driven.

---

## [2.2.4] — 2026-06-22

### Changed

- **Auto-create `public/` at boot** — `createKernel()` now calls `ensurePublicDir()` during startup (when `FRONTEND=true`), creating the `public/` directory if missing. The frontend static middlewares (`frontendStaticMiddleware`, `frontendIndexMiddleware`) are also lazily initialized via wrapper functions.

### Removed

- **`create-nexgen` template directory** — deleted all files under `packages/create-nexgen/template/` (`.dockerignore`, `.env`, `.env.example`, `README.md`, `biome.json`, `drizzle.config.ts`, `gitignore-stub`, `package.json`, database migrations, `src/env.ts`, framework internals, frontend resources, router, stores, plugins, types, and config files). These files are no longer bundled with the `create-nexgen` package.
- **Bumped `create-nexgen` version** — `packages/create-nexgen/package.json` updated from `2.2.3` to `2.2.4`.

---

## [2.2.3] — 2026-06-19

### Changed

- **Consolidated type declarations** — moved all `declare module` blocks from scattered `.d.ts` files (`src/resources/src/env.d.ts`, `src/resources/src/types/luxon.d.ts`, `src/framework/database/optional-db-drivers.d.ts`) into a single `src/types/global.d.ts`. Updated both root and resources `tsconfig.json` to include the central file. This gives both the backend and frontend projects access to module declarations (luxon, nodemailer, pg, vue-select, bootstrap JS, `*.vue`, better-sqlite3) without duplication.

---

## [2.2.2] — 2026-06-19

### Fixed

- **Queue worker database initialization** — `worker.ts` now calls `initDatabase()` before starting the queue worker and `closeDatabase()` on shutdown. Previously, job handlers that used the database threw "Database is not initialized" when running in a separate worker process.

### Changed

- **BullBoard dynamic queue discovery** — `ui.ts` now scans Redis for all queue `:meta` keys at boot and registers them automatically, eliminating the need to hardcode queue names in `ensureQueues()`. In development mode, a 15s poll timer rescans Redis and dynamically adds newly discovered queues to BullBoard via `addQueue()`. Polling is skipped in production where all queues are known upfront.
- **`setupBullBoard()` is now async** — `kernel.ts` uses `await setupBullBoard()` to support the Redis scan on boot.
- **Graceful shutdown** — `server.ts` imports and calls `stopBullBoardPoll()` to clear the dev poll timer on shutdown.

---

## [2.2.1] — 2026-06-17

### Fixed

- **Biome import fixup** — `organizeImports` stripped component imports used only in Vue `<template>` blocks. Restored 150+ missing imports across stats project, nexgen template, and create-nexgen template. Also reverted unsafe `noUnusedVariables` renames (`_logout`, `_themeIconClass`, `_startYear`/`_currentYear`) that broke template bindings. Added missing `vSelect` import (vue-select) and fixed `Object.hasOwn` → `in` operator for ES2020 compat.

---

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

- **Paginate count query** — count subquery now uses `db.select({ val: sql\`1\` }).from(query.as("\_inner"))`instead of broken`.as("paginate_rows")` pattern
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

---

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
