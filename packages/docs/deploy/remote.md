# Remote Deploy

Deploy to a remote Linux server (VPS, dedicated server, or cloud VM) via SSH. The deploy system uses `rsync` to upload your project and Docker Compose to run it on the remote host.

## How Remote Deploy Works

```
Your Machine                        Remote Server (VPS)
     │                                      │
     │  Step 1: Configure workflow          │
     │  deploy/workflow.remote.json         │
     │                                      │
     │  Step 2: Run remote workflow         │
     │  maker deploy:workflow:remote        │
     │                                      │
     │  ── ssh mkdir -p /home/deploy/app ──>│
     │                                      │
     │  ── rsync ./ user@host:/target/ ────>│
     │      (excludes node_modules, .git,   │
     │       dist, .env*)                   │
     │                                      │
     │  ── ssh docker network create ─────> │
     │  ── ssh docker compose up -d ───────>│
     │      (server infra)                  │
     │  ── ssh docker compose up -d ───────>│
     │      --build (app)                   │
     │                                      │
     │                              ┌───────┴────────┐
     │                              │  App running at │
     │                              │  your-domain.com │
     │                              └────────────────┘
```

## Prerequisites

- **Remote server** running Linux with Docker and Docker Compose installed
- **SSH access** with key-based authentication
- **A domain** pointing to your server's IP (for nginx-proxy + letsencrypt SSL)

## Step 1 — Generate Deploy Scaffolding

Run this locally (one-time):

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

This generates the full `deploy/` directory. See [Deploy Overview](/deploy/overview) for details.

## Step 2 — Configure Remote Workflow

::: code-group

```bash [npm]
npm run maker deploy:workflow:remote:init
```

```bash [pnpm]
pnpm maker deploy:workflow:remote:init
```

```bash [yarn]
yarn maker deploy:workflow:remote:init
```

```bash [bun]
bun maker deploy:workflow:remote:init
```

:::

This creates `deploy/workflow.remote.json`. Edit it with your server's details:

```json
{
  "remote": {
    "host": "203.0.113.10",
    "user": "deploy",
    "port": 22,
    "keyPath": "~/.ssh/id_rsa",
    "targetPath": "/home/deploy/nexgen"
  },
  "databaseImport": {
    "enabled": false,
    "file": "deploy/nexgen.sql",
    "database": "nexgen",
    "container": "mysql-global",
    "user": "root"
  }
}
```

| Field | Purpose |
|---|---|
| `remote.host` | Server IP or hostname |
| `remote.user` | SSH user |
| `remote.port` | SSH port (default 22) |
| `remote.keyPath` | Path to your SSH private key |
| `remote.targetPath` | Directory on the remote server where the project will be uploaded |
| `databaseImport.enabled` | Whether to import a SQL dump after deploy |
| `databaseImport.file` | Path to the SQL dump file |
| `databaseImport.database` | Target database name |
| `databaseImport.container` | Docker container name (`mysql-global`) |
| `databaseImport.user` | Database user (`root`) |

## Step 3 — Deploy

### Full pipeline (rsync + server infra + app)

::: code-group

```bash [npm]
npm run maker deploy:workflow:remote
```

```bash [pnpm]
pnpm maker deploy:workflow:remote
```

```bash [yarn]
yarn maker deploy:workflow:remote
```

```bash [bun]
bun maker deploy:workflow:remote
```

:::

This single command:

1. **Creates target directory** on the remote server: `ssh user@host mkdir -p /home/deploy/nexgen`
2. **Uploads the project** via rsync (excludes `node_modules`, `.git`, `dist`, `.env*`, logs):
   ```bash
   rsync -avz --delete --exclude=node_modules --exclude=.git \
     --exclude=dist --exclude=.env* -e "ssh -p 22 -i ~/.ssh/id_rsa" \
     ./ deploy@203.0.113.10:/home/deploy/nexgen/
   ```
3. **Creates Docker networks** on remote (if missing):
   ```bash
   ssh user@host docker network create nginx-proxy
   ssh user@host docker network create infra
   ```
4. **Starts server infra** on remote:
   ```bash
   ssh user@host docker compose -f /path/to/deploy/server/docker-compose.yml up -d
   ```
5. **Syncs pgAdmin servers.json** — loads the server configuration into the pgAdmin container
6. **Builds and starts app** on remote:
   ```bash
   ssh user@host docker compose -f /path/to/deploy/docker-compose.yml up -d --build --force-recreate
   ```
7. **Imports database** (if `databaseImport.enabled: true`)

### Step by step

Alternatively, run individual commands:

::: code-group

```bash [npm]
npm run maker deploy:remote:server
npm run maker deploy:remote:app
npm run maker deploy:db:import:remote -- --file=deploy/nexgen.sql --database=nexgen
```

```bash [pnpm]
pnpm maker deploy:remote:server
pnpm maker deploy:remote:app
pnpm maker deploy:db:import:remote --file=deploy/nexgen.sql --database=nexgen
```

```bash [yarn]
yarn maker deploy:remote:server
yarn maker deploy:remote:app
yarn maker deploy:db:import:remote --file=deploy/nexgen.sql --database=nexgen
```

```bash [bun]
bun maker deploy:remote:server
bun maker deploy:remote:app
bun maker deploy:db:import:remote --file=deploy/nexgen.sql --database=nexgen
```

:::

## SSL with letsencrypt

The server infra includes `jrcs/letsencrypt-nginx-proxy-companion` for automatic SSL certificates. To use it:

1. Set your domain in `deploy/server/.env`:
   ```
   LETSENCRYPT_HOST=app.example.com
   LETSENCRYPT_EMAIL=admin@example.com
   ```

2. Configure the nginx vhost override in `deploy/server/nginx-vhost/app.example.com`:
   ```
   # This file is mounted into nginx-proxy
   # Customize proxy settings if needed
   ```

3. Ensure your domain's DNS points to the server's IP

4. Run `deploy:remote:server` — letsencrypt will automatically obtain and renew certificates.

## Promote Workflow

The promote workflow runs the full local pipeline (tests the build on your machine) then deploys to remote:

::: code-group

```bash [npm]
npm run maker deploy:workflow:promote
```

```bash [pnpm]
pnpm maker deploy:workflow:promote
```

```bash [yarn]
yarn maker deploy:workflow:promote
```

```bash [bun]
bun maker deploy:workflow:promote
```

:::

This is useful for pre-production validation — if the local build succeeds, it proceeds to deploy to the remote server.

## Full Architecture on Remote

```
Remote Server
├─ Docker networks: nginx-proxy, infra
│
├─ Server Infra Containers
│  ├─ nginx-proxy (ports 80, 443) → routes to app
│  ├─ letsencrypt → auto SSL on port 443
│  ├─ mysql-global (port 3306, infra only)
│  ├─ postgres-global (port 5432, infra only)
│  ├─ redis-global (port 6379, infra only)
│  ├─ phpmyadmin → mysql admin at http://ip:8080
│  └─ pgadmin → postgres admin at http://ip:5050
│
└─ App Container (infra network)
   ├─ supervisord
   │  ├─ auto-migrate.sh (one-shot)
   │  ├─ maker serve --prod (port 3000)
   │  ├─ maker queue:work (if Redis)
   │  └─ maker schedule:work
   └─ nginx-proxy routes app.example.com → app:3000
```

## Security Notes

- Never commit `deploy/.env` or `deploy/server/.env` to version control (they contain secrets).
- The server infra `.env.local.example` is for local Docker Desktop overrides — do not use it in production.
- Change default MySQL/Postgres passwords in `deploy/server/.env` before production.
- Generate strong secrets for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `COOKIE_SECRET`.
- The app container does not expose ports directly — all traffic goes through nginx-proxy.
- Set `AUTO_MIGRATE=false` in production if you prefer to run migrations manually.
