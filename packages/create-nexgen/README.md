<p align="center">
  <a href="https://nexgen.dev">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/niyamulahsan/nexgen/main/.github/logo-dark.svg">
      <img alt="nexgen" src="https://raw.githubusercontent.com/niyamulahsan/nexgen/main/.github/logo-light.svg" width="300">
    </picture>
  </a>
</p>

<p align="center">
  Full-stack TypeScript framework with Hono, Vue 3, and Drizzle ORM
</p>

<p align="center">
  <a href="https://niyamulahsan.github.io/nexgen"><img src="https://img.shields.io/badge/docs-nexgen-3b82f6" alt="Documentation"></a>
  <a href="https://www.npmjs.com/package/create-nexgen"><img src="https://img.shields.io/npm/v/create-nexgen" alt="npm"></a>
</p>

---

## Install

```bash
npm create nexgen@latest my-app
cd my-app
cp .env.example .env
npm install
```

Requires **Node.js >= 24** or **Bun >= 1.3**.

## Quick start

```bash
npm run maker db:migrate --seed
npm run maker dev
```

Open `http://localhost:3000/api-docs` for API docs or `http://localhost:5173` for the Vue frontend.

## What you get

```
my-app/
├── src/
│   ├── env.ts              # Zod-validated env schema
│   ├── framework/          # Reusable infrastructure
│   ├── modules/            # Application modules
│   │   ├── auth/           # Auth controllers, routes, models, jobs
│   │   └── welcome/        # Example module
│   ├── middlewares/        # Auth & role guards
│   ├── resources/          # Vue 3 SPA frontend
│   └── storage/            # Uploaded files & logs
├── deploy/                 # Docker Compose files
└── .env.example
```

## Features

- **Modular architecture** — Self-contained modules with auto-discovered routes, jobs, models, and seeders
- **Type-safe API** — Hono + Zod + OpenAPI with auto-generated Scalar docs
- **Redis-backed services** — Cache, session, queue (BullMQ), and real-time (Socket.IO)
- **Dual database** — SQLite, MySQL, or PostgreSQL via Drizzle ORM
- **Vue 3 frontend** — Vite + Pinia + Vue Router with real-time Pulse integration
- **JWT auth** — Access + refresh token rotation with signed httpOnly cookies
- **Maker CLI** — Code generation, migrations, runtime management, and deploy orchestration
- **Docker deploy** — Two-layer Docker Compose with nginx-proxy, SSL, supervisor

## CLI commands

| Command | Description |
|---------|-------------|
| `maker dev` | Start API server + frontend HMR + queue worker |
| `maker serve` | API server only |
| `maker queue:work` | BullMQ worker process |
| `maker schedule:work` | Cron scheduler |
| `maker db:migrate --seed` | Run migrations + seeders |
| `maker module:make` | Scaffold a new module |
| `maker deploy:local` | Docker Compose local deploy |

## Documentation

Full documentation at **[https://niyamulahsan.github.io/nexgen](https://niyamulahsan.github.io/nexgen)**

## License

nexgen is open-sourced software licensed under the [MIT license](https://github.com/niyamulahsan/nexgen/blob/main/LICENSE).
