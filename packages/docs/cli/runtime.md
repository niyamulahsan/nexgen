# Runtime Commands

Start, serve, and manage your application's runtime processes — API server, queue workers, scheduler, frontend, and developer tools.

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

## Development Server

### `dev`

Start the full development stack — API server, Vue 3 frontend, queue worker (if Redis enabled), and optional dev tools — all in parallel with a single command.

**What starts:**

| Process | Started when | Command |
|---|---|---|
| API server | Always | `serve --src` (hot-reload via tsx watch) |
| Frontend | `FRONTEND != "false"` | Vite dev server on port 5173 |
| Queue worker | `REDIS != "false"` | `queue:work --queue=default,mail --src` |
| Optional tools | `--view` / `--with` flags | MailDev, Redis Commander, Drizzle Studio |

All child processes are tracked. If any required process exits unexpectedly, the entire stack shuts down.

::: code-group

```bash [npm]
npm run maker dev
```

```bash [pnpm]
pnpm maker dev
```

```bash [yarn]
yarn maker dev
```

```bash [bun]
bun maker dev
```

:::

### Additional tools

::: code-group

```bash [npm]
npm run maker dev -- --view=redis,maildev,studio,bullmq
npm run maker dev -- --with-redis-view --with-maildev --with-db-studio
```

```bash [pnpm]
pnpm maker dev --view=redis,maildev,studio,bullmq
pnpm maker dev --with-redis-view --with-maildev --with-db-studio
```

```bash [yarn]
yarn maker dev --view=redis,maildev,studio,bullmq
yarn maker dev --with-redis-view --with-maildev --with-db-studio
```

```bash [bun]
bun maker dev --view=redis,maildev,studio,bullmq
bun maker dev --with-redis-view --with-maildev --with-db-studio
```

:::

| Tool | Flag | What it provides |
|---|---|---|
| Redis Commander | `redis` / `--with-redis-view` | Web UI at port 1369 to inspect Redis keys |
| MailDev | `maildev` / `--with-maildev` | SMTP server at port 1089 + web UI at port 1080 to view sent emails |
| Drizzle Studio | `studio` / `--with-db-studio` | Web UI at `local.drizzle.studio` for database browsing |
| BullMQ Dashboard | `bullmq` | Queue management UI at `/admin/queues` |

### `frontend:dev`

Start only the Vue 3 frontend dev server (alias: `admin:dev`). Useful when you want to run the API separately.

::: code-group

```bash [npm]
npm run maker frontend:dev
```

```bash [pnpm]
pnpm maker frontend:dev
```

```bash [yarn]
yarn maker frontend:dev
```

```bash [bun]
bun maker frontend:dev
```

:::

## Production Server

### `serve`

Start the HTTP API server.

**Modes:**

| Mode | What happens | Use case |
|---|---|---|
| Source (default) | Runs `tsx src/framework/server.ts` with watch | Development with hot reload |
| `--prod` | Runs compiled `dist/src/framework/server.js` | Docker/production |
| `--runtime=bun` | Uses `bun` instead of Node.js | Bun runtime |

::: code-group

```bash [npm]
npm run maker serve
npm run maker serve -- --prod
npm run maker serve -- --prod --runtime=node
npm run maker serve -- --runtime=bun
npm run maker serve -- --watch
```

```bash [pnpm]
pnpm maker serve
pnpm maker serve --prod
pnpm maker serve --prod --runtime=node
pnpm maker serve --runtime=bun
pnpm maker serve --watch
```

```bash [yarn]
yarn maker serve
yarn maker serve --prod
yarn maker serve --prod --runtime=node
yarn maker serve --runtime=bun
yarn maker serve --watch
```

```bash [bun]
bun maker serve
bun maker serve --prod
bun maker serve --prod --runtime=node
bun maker serve --runtime=bun
bun maker serve --watch
```

:::

## Queue

### `queue:work`

Start a BullMQ queue worker that processes jobs from named queues.

| Queue | Purpose |
|---|---|
| `default` | General application jobs |
| `mail` | Email delivery jobs |

::: code-group

```bash [npm]
npm run maker queue:work
npm run maker queue:work -- --queue=mail
npm run maker queue:work -- --queue=default,mail
npm run maker queue:work -- --prod
npm run maker queue:work -- --queue=default,mail --prod --runtime=node
```

```bash [pnpm]
pnpm maker queue:work
pnpm maker queue:work --queue=mail
pnpm maker queue:work --queue=default,mail
pnpm maker queue:work --prod
pnpm maker queue:work --queue=default,mail --prod --runtime=node
```

```bash [yarn]
yarn maker queue:work
yarn maker queue:work --queue=mail
yarn maker queue:work --queue=default,mail
yarn maker queue:work --prod
yarn maker queue:work --queue=default,mail --prod --runtime=node
```

```bash [bun]
bun maker queue:work
bun maker queue:work --queue=mail
bun maker queue:work --queue=default,mail
bun maker queue:work --prod
bun maker queue:work --queue=default,mail --prod --runtime=node
```

:::

### `queue:clear`

Delete all queue-related Redis keys. Useful for resetting stale job state during development.

::: code-group

```bash [npm]
npm run maker queue:clear
```

```bash [pnpm]
pnpm maker queue:clear
```

```bash [yarn]
yarn maker queue:clear
```

```bash [bun]
bun maker queue:clear
```

:::

## Scheduler

### `schedule:work`

Start the cron scheduler worker. Executes scheduled tasks defined with `defineSchedule()` on their configured intervals.

::: code-group

```bash [npm]
npm run maker schedule:work
npm run maker schedule:work -- --prod
```

```bash [pnpm]
pnpm maker schedule:work
pnpm maker schedule:work --prod
```

```bash [yarn]
yarn maker schedule:work
yarn maker schedule:work --prod
```

```bash [bun]
bun maker schedule:work
bun maker schedule:work --prod
```

:::

## Dev Tools

### `maildev:view`

Start MailDev — a combined SMTP server and web email viewer. Catches all outgoing emails during development.

| Service | Port |
|---|---|
| SMTP | 1089 |
| Web UI | 1080 |

::: code-group

```bash [npm]
npm run maker maildev:view
```

```bash [pnpm]
pnpm maker maildev:view
```

```bash [yarn]
yarn maker maildev:view
```

```bash [bun]
bun maker maildev:view
```

:::

### `redis:view`

Start Redis Commander — a web UI to browse and manage Redis keys.

| Service | Port |
|---|---|
| Web UI | 1369 |

::: code-group

```bash [npm]
npm run maker redis:view
```

```bash [pnpm]
pnpm maker redis:view
```

```bash [yarn]
yarn maker redis:view
```

```bash [bun]
bun maker redis:view
```

:::

### `vite:cache:clear`

Clear Vite caches. Removes `.vite` directories from `node_modules`, `src/resources`, and other locations.

::: code-group

```bash [npm]
npm run maker vite:cache:clear
```

```bash [pnpm]
pnpm maker vite:cache:clear
```

```bash [yarn]
yarn maker vite:cache:clear
```

```bash [bun]
bun maker vite:cache:clear
```

:::

## Summary

| Command | Development | Production |
|---|---|---|
| `dev` | Full stack (API + frontend + queue + tools) | — |
| `serve` | API with watch | API without watch |
| `queue:work` | Queue worker from source | Queue worker from dist |
| `schedule:work` | Scheduler from source | Scheduler from dist |
| `frontend:dev` | Vite dev server | — |
| `queue:clear` | Development cleanup | — |
| `maildev:view` | Email testing | — |
| `redis:view` | Redis inspection | — |
| `vite:cache:clear` | Cache cleanup | — |
