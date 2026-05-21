---
title: nexgen Framework
pageClass: intro-page
---

# **nexgen**

**nexgen** is a **full-stack TypeScript framework** built for modern web development. It pairs a Hono-powered API server with a Vue 3 frontend, Drizzle ORM for type-safe database access, and Redis-backed services for session management, caching, queue processing, and realtime communication.

The framework follows a modular architecture: application logic is organized into self-contained modules, each with auto-discovered routes, controllers, models, seeders, jobs, and console commands. This keeps codebases organized as they grow, without imposing rigid folder structures or boilerplate generators that fight against you.

**nexgen** ships with a built-in CLI — the `maker` command — that scaffolds modules, runs database migrations, manages the queue worker and scheduler, and orchestrates Docker Compose deployments. Whether you are building a REST API, a realtime dashboard, or a queue-driven background processor, the same toolchain handles it all.

A core design goal is **practical simplicity**. The framework does not abstract away its underlying libraries — you write Hono routes, Drizzle queries, and Vue components directly. There is no magic ORM layer, no proprietary query builder, no custom template engine. The framework provides conventions, discovery, and wiring, but stays out of your way when you need to drop down to the metal.

**nexgen** supports **SQLite, MySQL, and PostgreSQL** through a single `DATABASE_URL` environment variable. The schema generator produces Drizzle-native model files for the active dialect, so you get full type safety whether you are prototyping with SQLite or deploying to PostgreSQL in production.

Storage is handled through a driver abstraction that supports local disk and S3-compatible providers (AWS S3, DigitalOcean Spaces, Cloudflare R2, MinIO). Uploads, generated files, and temporary download tokens work across drivers with the same API.

For realtime needs, Socket.IO is wired into the framework's event system. You can dispatch events that broadcast to authenticated users, role-based rooms, or specific user sessions — all from a single `dispatchEvent` call. The same event system integrates with BullMQ for background job processing, giving you a unified path from HTTP request to queued work to realtime push.

The deploy workflow uses Docker Compose with a single `maker deploy:workflow` command. It provisions the database, Redis, and proxy containers, runs the API server and queue worker, and handles environment-specific configuration through `.env` override chains.

## Quick Start

::: code-group

```bash [npm]
npm create nexgen@latest my-project
cd my-project
npm install
cp .env.example .env
npm run dev
```

```bash [pnpm]
pnpm create nexgen my-project
cd my-project
pnpm install
cp .env.example .env
pnpm dev
```

```bash [yarn]
yarn create nexgen my-project
cd my-project
yarn install
cp .env.example .env
yarn dev
```

```bash [bun]
bun create nexgen my-project
cd my-project
bun install
cp .env.example .env
bun run dev
```

:::

## Features

- **Hono-first API** - Lightweight, fast HTTP framework with Zod OpenAPI
- **Vue 3 frontend** - Component-based UI with Pinia state management
- **Drizzle ORM** - Type-safe database access with auto-generated schema
- **Module system** - Auto-discovered routes, jobs, console commands, models, seeders
- **Redis-backed** - Session, cache, queue (BullMQ), realtime (Socket.IO)
- **Scheduler** - Cron jobs with Redis lock and DB lock fallback
- **Storage** - Local disk or S3-compatible (AWS, DO Spaces, R2, MinIO)
- **Deploy** - Docker Compose workflow for local and remote deployment

## Credits

**nexgen** stands on the shoulders of the awesome open source community. A huge thank you to every developer who contributes to the packages we depend on — Hono, Vue, Vite, TypeScript, Drizzle ORM, Zod, BullMQ, Socket.IO, Bootstrap, and all the libraries that make this framework possible.
