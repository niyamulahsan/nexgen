# Deploy Commands

Docker-based deployment commands for local and remote environments. See the [Deploy guide](/deploy/overview) for architecture details.

> Deploy commands skip `.env` loading because they need to generate `.env` files first. All detection (database dialect, Redis) reads `.env` directly.

::: code-group

```bash [npm]
npm run maker <command> [options]
```

```bash [pnpm]
pnpm maker <command> [options]
```

```bash [yarn]
yarn maker <command> [options]
```

```bash [bun]
bun maker <command> [options]
```

:::

## Scaffold Commands

### `deploy:create`

Generate the full deploy scaffolding — Dockerfile, docker-compose, env templates, supervisor config, auto-migration script, and (with `--server`) shared infrastructure compose.

::: code-group

```bash [npm]
npm run maker deploy:create -- --server --runtime=node
npm run maker deploy:create -- --force
npm run maker deploy:create -- --runtime=bun
```

```bash [pnpm]
pnpm maker deploy:create --server --runtime=node
pnpm maker deploy:create --force
pnpm maker deploy:create --runtime=bun
```

```bash [yarn]
yarn maker deploy:create --server --runtime=node
yarn maker deploy:create --force
yarn maker deploy:create --runtime=bun
```

```bash [bun]
bun maker deploy:create --server --runtime=node
bun maker deploy:create --force
bun maker deploy:create --runtime=bun
```

:::

### `deploy:create:app`

Generate only application deploy files (Dockerfile, docker-compose.yml, .env, supervisor, scripts).

::: code-group

```bash [npm]
npm run maker deploy:create:app -- --force
```

```bash [pnpm]
pnpm maker deploy:create:app --force
```

```bash [yarn]
yarn maker deploy:create:app --force
```

```bash [bun]
bun maker deploy:create:app --force
```

:::

### `deploy:create:server`

Generate only shared infrastructure files (server docker-compose, env, pgAdmin config, redis.conf, nginx vhost).

::: code-group

```bash [npm]
npm run maker deploy:create:server -- --force
```

```bash [pnpm]
pnpm maker deploy:create:server --force
```

```bash [yarn]
yarn maker deploy:create:server --force
```

```bash [bun]
bun maker deploy:create:server --force
```

:::

### `deploy:create:server:dev`

Generate server infrastructure with Redis port exposed for local development access.

::: code-group

```bash [npm]
npm run maker deploy:create:server:dev -- --force
```

```bash [pnpm]
pnpm maker deploy:create:server:dev --force
```

```bash [yarn]
yarn maker deploy:create:server:dev --force
```

```bash [bun]
bun maker deploy:create:server:dev --force
```

:::

## Local Runtime Commands

### `deploy:server`

Start the shared infrastructure containers — nginx-proxy, MySQL, PostgreSQL, Redis, phpMyAdmin, pgAdmin. Creates Docker networks (`nginx-proxy`, `infra`) if missing.

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

### `deploy:app`

Build the Docker image (multi-stage: install deps → schema gen → build → production image) and start the app container with supervisor.

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

### `deploy:db:import`

Import a SQL dump into the local MySQL container. Creates the target database if it doesn't exist.

::: code-group

```bash [npm]
npm run maker deploy:db:import -- --file=deploy/nexgen.sql --database=nexgen
npm run maker deploy:db:import -- --file=dump.sql --database=myapp --container=mysql-global --user=root
```

```bash [pnpm]
pnpm maker deploy:db:import --file=deploy/nexgen.sql --database=nexgen
pnpm maker deploy:db:import --file=dump.sql --database=myapp --container=mysql-global --user=root
```

```bash [yarn]
yarn maker deploy:db:import --file=deploy/nexgen.sql --database=nexgen
yarn maker deploy:db:import --file=dump.sql --database=myapp --container=mysql-global --user=root
```

```bash [bun]
bun maker deploy:db:import --file=deploy/nexgen.sql --database=nexgen
bun maker deploy:db:import --file=dump.sql --database=myapp --container=mysql-global --user=root
```

:::

## Remote Commands

### `deploy:remote:server`

Start server infrastructure on a remote host via SSH.

::: code-group

```bash [npm]
npm run maker deploy:remote:server -- --config=deploy/workflow.remote.json
```

```bash [pnpm]
pnpm maker deploy:remote:server --config=deploy/workflow.remote.json
```

```bash [yarn]
yarn maker deploy:remote:server --config=deploy/workflow.remote.json
```

```bash [bun]
bun maker deploy:remote:server --config=deploy/workflow.remote.json
```

:::

### `deploy:remote:app`

Build and start the app on a remote host via SSH.

::: code-group

```bash [npm]
npm run maker deploy:remote:app -- --config=deploy/workflow.remote.json
```

```bash [pnpm]
pnpm maker deploy:remote:app --config=deploy/workflow.remote.json
```

```bash [yarn]
yarn maker deploy:remote:app --config=deploy/workflow.remote.json
```

```bash [bun]
bun maker deploy:remote:app --config=deploy/workflow.remote.json
```

:::

### `deploy:db:import:remote`

Import a SQL dump into the remote MySQL container via SSH pipe.

::: code-group

```bash [npm]
npm run maker deploy:db:import:remote -- --config=deploy/workflow.remote.json --file=deploy/nexgen.sql --database=nexgen
npm run maker deploy:db:import:remote -- --config=workflow.remote.json --file=dump.sql --database=myapp --dry-run
```

```bash [pnpm]
pnpm maker deploy:db:import:remote --config=deploy/workflow.remote.json --file=deploy/nexgen.sql --database=nexgen
pnpm maker deploy:db:import:remote --config=workflow.remote.json --file=dump.sql --database=myapp --dry-run
```

```bash [yarn]
yarn maker deploy:db:import:remote --config=deploy/workflow.remote.json --file=deploy/nexgen.sql --database=nexgen
yarn maker deploy:db:import:remote --config=workflow.remote.json --file=dump.sql --database=myapp --dry-run
```

```bash [bun]
bun maker deploy:db:import:remote --config=deploy/workflow.remote.json --file=deploy/nexgen.sql --database=nexgen
bun maker deploy:db:import:remote --config=workflow.remote.json --file=dump.sql --database=myapp --dry-run
```

:::

## Workflow Commands

### `deploy:workflow`

Run a custom workflow from a JSON config file. Executes each defined step sequentially.

::: code-group

```bash [npm]
npm run maker deploy:workflow -- --config=deploy/workflow.local.json
npm run maker deploy:workflow -- --config=custom.json --dry-run
```

```bash [pnpm]
pnpm maker deploy:workflow --config=deploy/workflow.local.json
pnpm maker deploy:workflow --config=custom.json --dry-run
```

```bash [yarn]
yarn maker deploy:workflow --config=deploy/workflow.local.json
yarn maker deploy:workflow --config=custom.json --dry-run
```

```bash [bun]
bun maker deploy:workflow --config=deploy/workflow.local.json
bun maker deploy:workflow --config=custom.json --dry-run
```

:::

### `deploy:workflow:init`

Create `deploy/workflow.local.json` with default steps (server + app). Edit the file to customize.

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

### `deploy:workflow:local`

Run the local deploy pipeline — a convenience wrapper around `deploy:workflow --config=deploy/workflow.local.json`.

::: code-group

```bash [npm]
npm run maker deploy:workflow:local
npm run maker deploy:workflow:local -- --server-only
npm run maker deploy:workflow:local -- --app-only
npm run maker deploy:workflow:local -- --refresh
```

```bash [pnpm]
pnpm maker deploy:workflow:local
pnpm maker deploy:workflow:local --server-only
pnpm maker deploy:workflow:local --app-only
pnpm maker deploy:workflow:local --refresh
```

```bash [yarn]
yarn maker deploy:workflow:local
yarn maker deploy:workflow:local --server-only
yarn maker deploy:workflow:local --app-only
yarn maker deploy:workflow:local --refresh
```

```bash [bun]
bun maker deploy:workflow:local
bun maker deploy:workflow:local --server-only
bun maker deploy:workflow:local --app-only
bun maker deploy:workflow:local --refresh
```

:::

### `deploy:workflow:remote`

Full remote deploy pipeline — uploads project via rsync, then runs server infra and/or app on the remote host.

**What happens:**
1. Creates target directory on remote: `ssh mkdir -p /home/deploy/nexgen`
2. Rsyncs project (excludes `node_modules`, `.git`, `dist`, `.env*`)
3. Creates Docker networks on remote
4. Starts server infra compose
5. Builds and starts app compose

::: code-group

```bash [npm]
npm run maker deploy:workflow:remote
npm run maker deploy:workflow:remote -- --config=deploy/workflow.remote.json
npm run maker deploy:workflow:remote -- --server-only
npm run maker deploy:workflow:remote -- --app-only
```

```bash [pnpm]
pnpm maker deploy:workflow:remote
pnpm maker deploy:workflow:remote --config=deploy/workflow.remote.json
pnpm maker deploy:workflow:remote --server-only
pnpm maker deploy:workflow:remote --app-only
```

```bash [yarn]
yarn maker deploy:workflow:remote
yarn maker deploy:workflow:remote --config=deploy/workflow.remote.json
yarn maker deploy:workflow:remote --server-only
yarn maker deploy:workflow:remote --app-only
```

```bash [bun]
bun maker deploy:workflow:remote
bun maker deploy:workflow:remote --config=deploy/workflow.remote.json
bun maker deploy:workflow:remote --server-only
bun maker deploy:workflow:remote --app-only
```

:::

### `deploy:workflow:remote:init`

Create `deploy/workflow.remote.json` with SSH connection template. Edit with your server details.

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

### `deploy:workflow:promote`

Run local workflow first (validate the build), then remote workflow (deploy to production). Useful for pre-production testing.

::: code-group

```bash [npm]
npm run maker deploy:workflow:promote
npm run maker deploy:workflow:promote -- --config=deploy/workflow.remote.json
```

```bash [pnpm]
pnpm maker deploy:workflow:promote
pnpm maker deploy:workflow:promote --config=deploy/workflow.remote.json
```

```bash [yarn]
yarn maker deploy:workflow:promote
yarn maker deploy:workflow:promote --config=deploy/workflow.remote.json
```

```bash [bun]
bun maker deploy:workflow:promote
bun maker deploy:workflow:promote --config=deploy/workflow.remote.json
```

:::

## Options Reference

### Shared flags

| Flag | Available on | Purpose |
|---|---|---|
| `--force` | `deploy:create:*` | Overwrite existing files |
| `--runtime=node\|bun` | `deploy:create*` | Choose Dockerfile runtime |
| `--dry-run` | Most | Preview without executing |
| `--config=<path>` | Remote/workflow | Path to workflow JSON config |
| `--server-only` | Workflow commands | Skip app, run infra only |
| `--app-only` | Workflow commands | Skip infra, run app only |
| `--refresh` | Workflow commands | Regenerate deploy files before running |

### Remote config (`deploy/workflow.remote.json`)

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

### Local workflow config (`deploy/workflow.local.json`)

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
