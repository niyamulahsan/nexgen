# Deploy Overview

## Architecture

The deploy system uses a **two-layer Docker** architecture with external networks.

```
┌─────────────────────────────────────────────────────┐
│                    deploy/server/                      │
│  Shared Infrastructure (runs once per host)            │
│                                                       │
│  docker network: nginx-proxy (external)               │
│  docker network: infra (external)                     │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │  nginx-   │  │  MySQL   │  │  PostgreSQL           │ │
│  │  proxy    │  │  8.4     │  │  16-alpine            │ │
│  └──────────┘  └──────────┘  └──────────────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │  Redis   │  │ phpMyAdmin│  │  pgAdmin              │ │
│  │  7-alpine │  │          │  │                       │ │
│  └──────────┘  └──────────┘  └──────────────────────┘ │
│  ┌──────────────────────┐                              │
│  │  letsencrypt         │                              │
│  │  (auto SSL)          │                              │
│  └──────────────────────┘                              │
└──────────────────────┬──────────────────────────────┘
                       │ infra network
┌──────────────────────┴──────────────────────────────┐
│                    deploy/                             │
│  App Stack (built & started per deploy)               │
│                                                       │
│  ┌──────────────────────────────────────────────┐     │
│  │  App Container                                │     │
│  │                                               │     │
│  │  supervisor:                                   │     │
│  │  ├─ auto-migrate.sh (one-shot)                │     │
│  │  ├─ "maker serve --prod" (API server)          │     │
│  │  ├─ "maker queue:work" (if Redis)             │     │
│  │  └─ "maker schedule:work" (cron scheduler)    │     │
│  └──────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

### Why two layers?

- **Server infra** (`deploy/server/`) runs once per host — it contains shared services (database, Redis, proxy, SSL). You start it once and it stays up.
- **App stack** (`deploy/`) runs per deployment — it contains your application. Every deploy rebuilds and restarts it.
- They communicate via the shared `infra` Docker network, so the app container can reach `mysql-global:3306`, `redis-global:6379`, etc. by hostname.

### Why external networks?

Docker Compose normally creates isolated networks per project. By using pre-created external networks (`nginx-proxy` and `infra`), the server infra and the app stack can communicate even though they are in different compose files.

## Deploy Lifecycle

```
1. Generate Scaffolding
   └─ maker deploy:init
       ├─ Reads DATABASE_URL from .env (detects sqlite/mysql/postgres)
       ├─ Reads REDIS, OPEN_API, SOCKET from .env
       ├─ Detects package manager (npm/pnpm/yarn/bun) and runtime (node/bun)
       ├─ Generates all files under deploy/
       └─ Writes workflow.local.json + workflow.remote.json (if missing)

2. Start Server Infrastructure (one-time per host)
   └─ maker deploy:workflow --server-only
       ├─ Creates Docker networks (nginx-proxy, infra)
       ├─ Ensures bind-mount files (pgAdmin servers.json, redis.conf)
       ├─ Copies .env.example → .env if missing
       └─ docker compose -f deploy/server/docker-compose.yml up -d

3. Start App Stack (per deploy)
   └─ maker deploy:workflow --app-only
       ├─ Syncs DATABASE_URL with server env
       ├─ Ensures target MySQL database exists (if MySQL)
       └─ docker compose -f deploy/docker-compose.yml up -d --build --force-recreate

4. Import Data (optional)
   └─ maker deploy:db:import
       └─ docker exec <mysql-global|postgres-global> ... < dump.sql

5. Supervisor inside App Container
   ├─ auto-migrate.sh → if AUTO_MIGRATE=true, runs db:migrate --seed
   ├─ maker serve --prod → starts the HTTP API server
   ├─ maker queue:work (only if Redis enabled) → processes jobs
   └─ maker schedule:work → runs cron scheduler
```

## All Deploy Commands

| Command | Why | When | What it does |
|---|---|---|---|
| `deploy:init` | Generate deploy scaffolding + workflow configs | One-time, before first deploy | Creates `deploy/` with Dockerfile, compose files, env stubs, supervisor config, scripts, and both workflow configs |
| `deploy:workflow` | Local deploy pipeline | Per deploy | Starts server infra and/or app stack locally (config file or flags) |
| `deploy:workflow:remote` | Full remote deploy | Per deploy | rsyncs project to remote host, runs server + app there |
| `deploy:workflow:promote` | Test local then deploy remote | Pre-production | Runs local workflow first, then remote workflow |
| `deploy:db:import` | Import SQL into local DB | Occasional | Streams a `.sql` file into the running MySQL/PostgreSQL container |
| `deploy:db:import:remote` | Import SQL into remote DB | Occasional | Same as above via SSH |

## Flags for `deploy:init`

| Flag | Purpose |
|---|---|
| `--force` | Overwrite existing files |
| `--app-only` | Generate only app files, skip server |
| `--server-only` | Generate only server files, skip app |
| `--dev` | Server in dev mode (exposes Redis port for local access) |
| `--runtime=node\|bun` | Dockerfile runtime (default `node`, auto-detected from package.json) |
| `--pm=npm\|pnpm\|yarn` | Package manager for the node runtime (default `npm`) |

## What `deploy:init` Generates

```
deploy/
├── Dockerfile                     # Multi-stage build (npm, pnpm, yarn, or bun)
├── docker-compose.yml             # App service (connects to infra network, persists storage volume)
├── .env.example                   # App environment variables template
├── README.md
├── supervisor/
│   └── supervisord.conf           # Process manager config (with/without queue worker)
├── scripts/
│   └── auto-migrate.sh            # Entrypoint — runs migrations if AUTO_MIGRATE=true
├── server/                        # (only without --app-only)
│   ├── docker-compose.yml         # Shared infra: nginx-proxy, MySQL, Postgres, Redis, etc.
│   ├── .env.example               # Server infra environment template
│   ├── .env.local.example         # Local Docker Desktop overrides
│   ├── pgadmin/
│   │   └── servers.json           # Pre-configured pgAdmin server
│   ├── redis/
│   │   └── redis.conf             # Redis config (appendonly, maxmemory)
│   └── nginx-vhost/
│       ├── app.example.com        # Example nginx vhost for your domain
│       └── README.md
├── workflow.local.json            # Local deploy workflow definition
└── workflow.remote.json           # Remote deploy workflow definition
```

## How the Dockerfile Works

Multi-stage build (node example — bun varies slightly):

```dockerfile
# Stage 1 — Builder
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app

ARG FRONTEND=true
ENV FRONTEND=${FRONTEND}

# Install native deps (python3, make, g++ for node-gyp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

COPY . .
RUN node src/framework/maker-cli/src/index.mjs db:schema
RUN npm run build

# Stage 2 — Runner
FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    supervisor ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/deploy/scripts ./deploy/scripts
COPY --from=builder /app/deploy/.env ./.env

COPY deploy/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 3000
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

The builder stage installs deps, generates schemas, and builds. The runner stage is minimal — only runtime deps, compiled output, and supervisor. The `deploy/.env` is copied into the image at build time so secrets are baked in (not passed at runtime).

::: warning
For the **bun** runtime, `deploy/.env` is copied directly into the image during the build stage instead of at runtime. The `FRONTEND` build arg controls whether the frontend is built and included.
:::

## Container Internals

Inside the running app container:

```
supervisord
  ├─ auto-migrate.sh (one-shot, exits)
  │   └─ maker db:migrate --seed
  ├─ maker serve --prod --runtime=node
  │   └─ node dist/src/framework/server.js
  ├─ maker queue:work --queue=default,mail,maintenance --prod (if Redis)
  │   └─ node dist/src/framework/maker-cli/src/index.mjs queue:work
  └─ maker schedule:work --prod
      └─ node dist/src/framework/maker-cli/src/index.mjs schedule:work
```

Supervisor auto-restarts any process that crashes (except `auto-migrate.sh`, which is a one-shot).

## Storage Persistence

The app compose mounts a named Docker volume for uploads:

```yaml
volumes:
  - app-storage:/app/src/storage
```

`app-storage` persists the local storage driver's disk (`src/storage/app/{public,private,tmp}` in the container). Without it, every image rebuild wipes files written at runtime (uploads, generated artifacts), even though the database rows referencing them survive. The volume is created on first deploy and reused across `--force-recreate` deploys.

## Reverse Proxy (nginx-proxy)

The app compose attaches to the external `nginx-proxy` network. When you set `VIRTUAL_HOST` (and optionally `LETSENCRYPT_HOST`/`LETSENCRYPT_EMAIL`) in `deploy/.env`, nginx-proxy routes traffic from your domain to the app container and auto-issues Let's Encrypt certificates. Leave these empty for local-only deploys.

## How `.env` Files Work

You **never create `.env` files manually**. The system handles this automatically:

1. **`deploy:init`** generates `.env.example` templates (e.g. `deploy/.env.example`, `deploy/server/.env.example`)
2. **You edit the `.env.example` files** with your secrets and settings
3. **`deploy:workflow`** copies `.env.example` → `.env` automatically if `.env` doesn't exist yet

This means you only ever touch the `.example` files. The actual `.env` files (which contain your secrets) are created at deploy time and never committed to version control.

::: warning
If you need to change secrets after the first deploy, edit the `.env` files directly — the workflow only copies from `.example` when `.env` is missing.
:::

## Environment Detection

`deploy:init` reads your local `.env` to auto-detect:

- **Database dialect** — `sqlite`, `mysql`, or `postgres` from `DATABASE_URL`
- **Redis** — enabled/disabled from `REDIS` flag
- **Package manager** — lockfile detection (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`)
- **Runtime** — `node` or `bun` from `--runtime` flag
