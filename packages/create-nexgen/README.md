<p align="center">
  <a href="https://nexgen.dev">
    <img alt="nexgen" src="https://raw.githubusercontent.com/niyamulahsan/nexgen/main/logo-favicon/nexgen.png" width="280">
  </a>
</p>

<h3 align="center">Full-stack TypeScript framework for modern web applications</h3>

<p align="center">
  <a href="https://niyamulahsan.github.io/nexgen"><img src="https://img.shields.io/badge/docs-nexgen.dev-3b8eed" alt="Documentation"></a>
  <a href="https://www.npmjs.com/package/create-nexgen"><img src="https://img.shields.io/npm/v/create-nexgen" alt="npm version"></a>
  <a href="https://github.com/niyamulahsan/nexgen/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License"></a>
</p>

---

## Install

```bash
npm create nexgen@latest my-app
cd my-app
npm install
```

Requires **Node.js >= 24** or **Bun >= 1.3**.

## Quick Start

```bash
npm run maker db:migrate --seed
npm run maker dev
```

Open `http://localhost:3000/api-docs` for API docs or `http://localhost:5173` for the Vue frontend.

### Package Manager

| Manager  | Create project             | Run commands          |
| -------- | -------------------------- | --------------------- |
| **npm**  | `npm create nexgen@latest` | `npm run maker <cmd>` |
| **pnpm** | `pnpm create nexgen`       | `pnpm maker <cmd>`    |
| **yarn** | `yarn create nexgen`       | `yarn maker <cmd>`    |
| **bun**  | `bun create nexgen`        | `bun maker <cmd>`     |

### Runtime

nexgen runs on **Node.js** or **Bun**. Pass `--runtime=bun` to `deploy:init` for Bun-based Docker images.

## What You Get

```
my-app/
├── src/
│   ├── env.ts              # Zod-validated environment config
│   ├── framework/          # Reusable engine (HTTP, auth, queue, cache, etc.)
│   ├── modules/            # Application modules (auto-discovered)
│   │   └── auth/           # Auth controllers, routes, models, jobs
│   ├── middlewares/        # Auth & role guards
│   ├── resources/          # Vue 3 SPA frontend
│   └── storage/            # Uploaded files & logs
├── deploy/                 # Docker Compose files
└── .env.example
```

## Features

- **Modular architecture** — Self-contained modules with auto-discovered routes, jobs, models, and seeders
- **Type-safe API** — Hono + Zod + OpenAPI with auto-generated Scalar docs
- **Database** — Drizzle ORM with SQLite, MySQL, or PostgreSQL
- **Queue & Scheduler** — BullMQ background jobs with cron scheduling
- **Realtime** — Socket.IO with auto room joining and broadcast events
- **Cache & Session** — Redis-backed with graceful fallback
- **JWT Auth** — Access + refresh token rotation with signed httpOnly cookies
- **Vue 3 Frontend** — Vite + Pinia + Vue Router with real-time Pulse integration
- **Maker CLI** — Code generation, migrations, runtime management, and deploy orchestration
- **Docker Deploy** — Two-layer Compose with nginx-proxy, auto SSL, and supervisor

## CLI Commands

| Command                        | Description                                    |
| ------------------------------ | ---------------------------------------------- |
| `maker dev`                    | Start API server + frontend HMR + queue worker |
| `maker serve [--prod]`         | API server (dev or production)                 |
| `maker queue:work`             | BullMQ worker process                          |
| `maker schedule:work`          | Cron scheduler                                 |
| `maker db:migrate --seed`      | Run migrations + seeders                       |
| `maker db:fresh`               | Drop all tables, re-migrate, re-seed           |
| `maker module:make <name>`     | Scaffold a new module                          |
| `maker deploy:init`            | Generate Docker deploy scaffolding             |
| `maker deploy:workflow`        | Local deploy (Docker Desktop)                  |
| `maker deploy:workflow:remote` | Remote deploy via SSH + rsync                  |

## Documentation

Full documentation at **[nexgen.dev](https://niyamulahsan.github.io/nexgen)**

## License

MIT
