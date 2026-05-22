# Local Deploy

Deploy locally using Docker Desktop to run the full stack — database, Redis, proxy, and your app — in containers on your machine.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Docker Compose v2 (included with Docker Desktop)
- Your project's `.env` configured with `DATABASE_URL` and `REDIS` (if used)

## Step 1 — Generate Deploy Scaffolding

Run once per project:

::: code-group

```bash [npm]
npm run maker deploy:create -- --server --runtime=node
```

```bash [pnpm]
pnpm maker deploy:create --server --runtime=node
```

```bash [yarn]
yarn maker deploy:create --server --runtime=node
```

```bash [bun]
bun maker deploy:create --server --runtime=node
```

:::

This reads your `.env`, detects your database (MySQL/Postgres/SQLite) and Redis settings, and generates the entire `deploy/` directory. The `--server` flag generates the shared infrastructure compose file too.

See [Deploy Overview](/deploy/overview) for the full file tree.

## Step 2 — Start Server Infrastructure

::: code-group

```bash [npm]
npm run maker deploy:server
```

```bash [pnpm]
pnpm maker deploy:server
```

```bash [yarn]
yarn maker deploy:server
```

```bash [bun]
bun maker deploy:server
```

:::

This single command:

1. **Creates Docker networks** if missing:
   - `nginx-proxy` — reverse proxy network (port 80/443)
   - `infra` — internal network for database/Redis communication

2. **Ensures bind-mount files** — creates placeholder files for pgAdmin config and Redis config if they don't exist.

3. **Ensures `.env`** — copies `.env.example` to `.env` in `deploy/server/` if missing.

4. **Starts containers** — runs `docker compose -f deploy/server/docker-compose.yml up -d`

### What starts

```
Container            Image                Hostname            Purpose
─────────────────────────────────────────────────────────────────────
nginx-proxy          jwilder/nginx-proxy  —                   Reverse proxy (ports 80, 443)
letsencrypt          jrcs/letsencrypt     —                   Auto SSL companion
mysql-global         mysql:8.4            mysql-global        MySQL database
postgres-global      postgres:16-alpine   postgres-global     PostgreSQL database
redis-global         redis:7-alpine       redis-global        Redis (if enabled)
phpmyadmin           phpmyadmin:5-apache  —                   MySQL admin UI (port 8080)
pgadmin              dpage/pgadmin4       —                   Postgres admin UI (port 5050)
```

All database/Redis containers are reachable from the app container by hostname (`mysql-global:3306`, `redis-global:6379`, etc.) via the `infra` network.

### Dev mode (Docker Desktop)

If you don't have MySQL, PostgreSQL, or Redis installed locally, use this workflow to run all infrastructure in Docker Desktop while developing on your host machine.

#### Generate dev server config

This generates server infra files with Redis port exposed to the host:

::: code-group

```bash [npm]
npm run maker deploy:create:server:dev
```

```bash [pnpm]
pnpm maker deploy:create:server:dev
```

```bash [yarn]
yarn maker deploy:create:server:dev
```

```bash [bun]
bun maker deploy:create:server:dev
```

:::

The `--dev` flag (applied automatically by this command) exposes these ports to your host:

| Container | Host Port | Default | Purpose |
|---|---|---|---|
| `mysql-global` | 3306 | `0.0.0.0:3306` | Connect via any MySQL client |
| `postgres-global` | 5432 | `0.0.0.0:5432` | Connect via any Postgres client |
| `redis-global` | 6379 | `0.0.0.0:6379` | Connect via RedisInsight, redis-cli, etc. |

#### Start server infra

::: code-group

```bash [npm]
npm run maker deploy:server
```

```bash [pnpm]
pnpm maker deploy:server
```

```bash [yarn]
yarn maker deploy:server
```

```bash [bun]
bun maker deploy:server
```

:::

#### Configure your local `.env`

Point your local `.env` to `localhost` so your dev server connects to Docker containers:

```env
DATABASE_URL=mysql://root:password@localhost:3306/nexgen
REDIS=true
REDIS_URL=redis://localhost:6379
```

Or for PostgreSQL:

```env
DATABASE_URL=postgres://postgres:password@localhost:5432/nexgen
```

#### Develop normally

Now run `maker dev` as usual — your local API server connects to the Docker-hosted database and Redis:

```
Your Machine (host)                Docker Desktop
     │                                   │
     │  maker dev                        │
     │  ├─ serve (port 3000) ──┐         │
     │  ├─ queue:work          │         │
     │  └─ frontend:dev        │         │
     │                         │         │
     │  localhost:3306 ────────┼────────>│ mysql-global
     │  localhost:6379 ────────┼────────>│ redis-global
     │  localhost:5432 ────────┼────────>│ postgres-global
     │                         │         │
     │  RedisInsight ──────────┼────────>│ redis-global
     │  TablePlus / DBeaver ───┼────────>│ mysql-global / postgres-global
```

This way you don't need to install or manage databases on your host — Docker handles everything, and you still get hot-reload and local debugging from your IDE.

## Step 3 — Build and Start the App

::: code-group

```bash [npm]
npm run maker deploy:app
```

```bash [pnpm]
pnpm maker deploy:app
```

```bash [yarn]
yarn maker deploy:app
```

```bash [bun]
bun maker deploy:app
```

:::

This:

1. **Syncs DATABASE_URL** — reads the database name from `deploy/server/.env` and writes it into `deploy/.env` so the app connects to the correct database.

2. **Ensures MySQL database exists** — if using MySQL, creates the target database inside `mysql-global` if it doesn't exist yet.

3. **Builds the Docker image** — runs `docker compose -f deploy/docker-compose.yml build` using the multi-stage Dockerfile (npm install → schema gen → build → production image).

4. **Starts the container** — runs `docker compose -f deploy/docker-compose.yml up -d --force-recreate`

### What happens inside

```
Container starts →
  supervisord reads deploy/supervisor/supervisord.conf →
    ├─ auto-migrate.sh (one-shot)
    │   └─ Reads AUTO_MIGRATE=true from .env
    │   └─ Runs: node maker-cli db:migrate --seed
    ├─ maker serve --prod
    │   └─ Starts HTTP server on port 3000
    ├─ maker queue:work (only if Redis enabled)
    │   └─ Processes default and mail queues
    └─ maker schedule:work
        └─ Runs cron scheduler
```

## Step 4 — Import Database (Optional)

If you have an existing MySQL dump:

::: code-group

```bash [npm]
npm run maker deploy:db:import -- --file=deploy/nexgen.sql --database=nexgen
```

```bash [pnpm]
pnpm maker deploy:db:import --file=deploy/nexgen.sql --database=nexgen
```

```bash [yarn]
yarn maker deploy:db:import --file=deploy/nexgen.sql --database=nexgen
```

```bash [bun]
bun maker deploy:db:import --file=deploy/nexgen.sql --database=nexgen
```

:::

This creates the database (if missing) and streams the SQL into `mysql-global`:

```
docker exec -i mysql-global mysql -u root -p<password> -e "CREATE DATABASE IF NOT EXISTS nexgen"
docker exec -i mysql-global mysql -u root -p<password> nexgen < deploy/nexgen.sql
```

## One-Shot Workflow

For convenience, a single command runs steps 2 + 3 sequentially:

::: code-group

```bash [npm]
npm run maker deploy:workflow:local
```

```bash [pnpm]
pnpm maker deploy:workflow:local
```

```bash [yarn]
yarn maker deploy:workflow:local
```

```bash [bun]
bun maker deploy:workflow:local
```

:::

You can customize the steps by editing `deploy/workflow.local.json`:

```json
{
  "steps": [
    { "name": "Generate deploy files", "run": "deploy:create --server --force", "enabled": false },
    { "name": "Start shared infra", "run": "deploy:server", "enabled": true },
    { "name": "Start app stack", "run": "deploy:app", "enabled": true },
    { "name": "Import MySQL dump", "run": "deploy:db:import --file=deploy/nexgen.sql --database=nexgen", "enabled": false }
  ]
}
```

Set `"enabled": false` to skip steps. Initialize the file with:

::: code-group

```bash [npm]
npm run maker deploy:workflow:init
```

```bash [pnpm]
pnpm maker deploy:workflow:init
```

```bash [yarn]
yarn maker deploy:workflow:init
```

```bash [bun]
bun maker deploy:workflow:init
```

:::

## Environment Variables

### App (`deploy/.env`)

| Variable | Auto-detected | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Database connection string (synced with server) |
| `REDIS` | Yes | Enable Redis (true/false) |
| `REDIS_URL` | Yes | Set to `redis://redis-global:6379` when Redis enabled |
| `APP_URL` | — | Public URL of your app |
| `JWT_*` | — | JWT secrets (must set before production) |
| `COOKIE_SECRET` | — | Cookie signing secret (must set before production) |
| `AUTO_MIGRATE` | — | Set `true` to auto-run migrations on container start |
| `APP_NAME` | — | Used as container name prefix |

### Server (`deploy/server/.env`)

| Variable | Purpose |
|---|---|
| `MYSQL_ROOT_PASSWORD` | MySQL root password |
| `POSTGRES_PASSWORD` | Postgres password |
| `REDIS` | Enable/disable Redis service |
| `DATABASE_NAME` | Default database name (used by the app) |
| `LETSENCRYPT_*` | SSL certificate config (for production) |

## Troubleshooting

### View app logs

```bash
docker compose -f deploy/docker-compose.yml logs -f app
```

### View server infra logs

```bash
docker compose -f deploy/server/docker-compose.yml logs -f mysql-global
```

### Rebuild without cache

```bash
docker compose -f deploy/docker-compose.yml build --no-cache app
docker compose -f deploy/docker-compose.yml up -d --force-recreate app
```

### Enter the app container

```bash
docker exec -it <app-container-name> sh
```
