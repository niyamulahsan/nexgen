<a href="https://nexgen.dev">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/niyamulahsan/nexgen/main/.github/logo-dark.svg">
    <img alt="nexgen" src="https://raw.githubusercontent.com/niyamulahsan/nexgen/main/.github/logo-light.svg" width="200">
  </picture>
</a>

**nexgen** is a full-stack TypeScript framework built on [Hono](https://hono.dev), [Vue 3](https://vuejs.org), and [Drizzle ORM](https://orm.drizzle.team). It provides a modular architecture, Redis-backed services, real-time broadcasting, and Docker-based deployment out of the box.

[![Documentation](https://img.shields.io/badge/docs-nexgen-3b82f6)](https://niyamulahsan.github.io/nexgen)
[![npm](https://img.shields.io/npm/v/create-nexgen)](https://www.npmjs.com/package/create-nexgen)

## Features

- **Modular architecture** — Self-contained modules with auto-discovered routes, jobs, models, and seeders
- **Type-safe API** — Hono + Zod + OpenAPI with auto-generated Scalar docs
- **Redis-backed services** — Cache, session, queue (BullMQ), and real-time (Socket.IO)
- **Dual database** — SQLite, MySQL, or PostgreSQL via Drizzle ORM
- **Vue 3 frontend** — Vite + Pinia + Vue Router with real-time Pulse integration
- **Docker deploy** — Two-layer Docker Compose with nginx-proxy, SSL, supervisor
- **Maker CLI** — Code generation, migrations, runtime management, and deploy orchestration

## Quick Start

```bash
npm create nexgen@latest
cd my-app
cp .env.example .env
npm install
npm run maker db:schema
npm run maker db:seed
npm run maker dev
```

## Documentation

Read the full documentation at **[https://niyamulahsan.github.io/nexgen](https://niyamulahsan.github.io/nexgen)**

- [Architecture](/guide/architecture)
- [CLI Reference](/cli/reference)
- [Database](/guide/database)
- [Deploy](/deploy/overview)

## License

nexgen is open-sourced software licensed under the [MIT license](LICENSE).
