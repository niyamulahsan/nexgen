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
   └─ maker deploy:create
       ├─ Reads DATABASE_URL from .env (detects sqlite/mysql/postgres)
       ├─ Reads REDIS from .env (detects Redis on/off)
       ├─ Detects package manager (npm/pnpm/yarn/bun) and runtime (node/bun)
       └─ Generates all files under deploy/

2. Start Server Infrastructure (one-time per host)
   └─ maker deploy:server
       ├─ Creates Docker networks (nginx-proxy, infra)
       ├─ Ensures bind-mount files (pgAdmin servers.json, redis.conf)
       ├─ Copies .env.example → .env if missing
       └─ docker compose -f deploy/server/docker-compose.yml up -d

3. Start App Stack (per deploy)
   └─ maker deploy:app
       ├─ Syncs DATABASE_URL with server env
       ├─ Ensures target MySQL database exists (if MySQL)
       └─ docker compose -f deploy/docker-compose.yml up -d --build --force-recreate

4. Import Data (optional)
   └─ maker deploy:db:import
       └─ docker exec mysql-global mysql ... < dump.sql

5. Supervisor inside App Container
   ├─ auto-migrate.sh → if AUTO_MIGRATE=true, runs db:migrate --seed
   ├─ maker serve --prod → starts the HTTP API server
   ├─ maker queue:work (only if Redis enabled) → processes jobs
   └─ maker schedule:work → runs cron scheduler
```

## All Deploy Commands

| Command | Why | When | What it does |
|---|---|---|---|
| `deploy:create` | Generate deploy scaffolding | One-time, before first deploy | Creates `deploy/` with Dockerfile, compose files, env stubs, supervisor config, scripts, workflow configs |
| `deploy:create:app` | App files only | When regenerating app config | Generates only `deploy/Dockerfile`, `deploy/docker-compose.yml`, `deploy/.env` |
| `deploy:create:server` | Server infra files only | When regenerating server config | Generates only `deploy/server/docker-compose.yml`, `deploy/server/.env` |
| `deploy:server` | Start shared services | Once per host | Creates Docker networks, starts MySQL/Postgres/Redis/nginx-proxy/letsencrypt/phpmyadmin/pgadmin |
| `deploy:app` | Build and run app | Every deploy | Builds Docker image, starts app container with supervisor |
| `deploy:db:import` | Import SQL into local DB | Occasional | Streams a `.sql` file into the running MySQL container |
| `deploy:db:import:remote` | Import SQL into remote DB | Occasional | Same as above via SSH tunnel |
| `deploy:workflow` | Run custom workflow | Automation | Reads a JSON config file and executes a sequence of steps |
| `deploy:workflow:init` | Create local workflow config | One-time | Writes `deploy/workflow.local.json` |
| `deploy:workflow:local` | Full local deploy pipeline | Per deploy | Runs `deploy:server` + `deploy:app` (configurable) |
| `deploy:workflow:remote:init` | Create remote workflow config | One-time | Writes `deploy/workflow.remote.json` |
| `deploy:workflow:remote` | Full remote deploy | Per deploy | rsyncs project to remote host, runs server + app there |
| `deploy:workflow:promote` | Test local then deploy remote | Pre-production | Runs local workflow first, then remote workflow |

## Flags for `deploy:create`

| Flag | Purpose |
|---|---|
| `--server` | Include server infra files (`deploy/server/`) |
| `--force` | Overwrite existing files |
| `--app-only` | Generate only app files, skip server |
| `--server-only` | Generate only server files, skip app |
| `--dev` | Server in dev mode (exposes Redis port for local access) |
| `--runtime=node` | Node.js Dockerfile (default, detected from package.json) |
| `--runtime=bun` | Bun Dockerfile |

## What `deploy:create` Generates

```
deploy/
├── Dockerfile                     # Multi-stage build (npm, pnpm, yarn, or bun)
├── docker-compose.yml             # App service (connects to infra network)
├── .env                           # App environment variables
├── README.md
├── supervisor/
│   └── supervisord.conf           # Process manager config (with/without queue worker)
├── scripts/
│   └── auto-migrate.sh            # Entrypoint — runs migrations if AUTO_MIGRATE=true
├── server/                        # (only with --server flag)
│   ├── docker-compose.yml         # Shared infra: nginx-proxy, MySQL, Postgres, Redis, etc.
│   ├── .env                       # Server infra environment
│   ├── .env.local.example         # Local Docker Desktop overrides
│   ├── pgadmin/
│   │   └── servers.json           # Pre-configured pgAdmin server
│   ├── redis/
│   │   └── redis.conf             # Redis config (appendonly, maxmemory)
│   └── nginx-vhost/
│       ├── app.example.com        # Example nginx vhost for your domain
│       └── README.md
├── workflow.local.json            # (optional) Local CI/CD workflow definition
└── workflow.remote.json           # (optional) Remote deploy workflow definition
```

## How the Dockerfile Works

Multi-stage build:

```dockerfile
# Stage 1 — Builder
FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                           # or pnpm install / yarn install / bun install
COPY . .
RUN npm run db:schema                # Generate Drizzle schema types
RUN npm run build                    # Build frontend + compile TypeScript

# Stage 2 — Runner
FROM node:24-bookworm-slim
WORKDIR /app
RUN apt update && apt install -y supervisor ca-certificates
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY deploy/scripts/auto-migrate.sh /auto-migrate.sh
CMD ["/usr/bin/supervisord", "-c", "deploy/supervisor/supervisord.conf"]
```

The builder stage installs deps, generates schemas, and builds. The runner stage is minimal — only runtime deps, compiled output, and supervisor.

## Container Internals

Inside the running app container:

```
supervisord
  ├─ auto-migrate.sh (one-shot, exits)
  │   └─ maker db:migrate --seed
  ├─ maker serve --prod --runtime=node
  │   └─ node dist/src/framework/server.js
  ├─ maker queue:work --queue=default,mail --prod (if Redis)
  │   └─ node dist/src/framework/maker-cli/src/index.mjs queue:work
  └─ maker schedule:work --prod
      └─ node dist/src/framework/maker-cli/src/index.mjs schedule:work
```

Supervisor auto-restarts any process that crashes (except `auto-migrate.sh`, which is a one-shot).

## Environment Detection

`deploy:create` reads your local `.env` to auto-detect:

- **Database dialect** — `sqlite`, `mysql`, or `postgres` from `DATABASE_URL`
- **Redis** — enabled/disabled from `REDIS` flag
- **Package manager** — lockfile detection (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`)
- **Runtime** — `node` or `bun` from `--runtime` flag
