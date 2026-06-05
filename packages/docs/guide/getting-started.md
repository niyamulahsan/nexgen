# Getting Started

## Prerequisites

- **Node.js** >= 24 or **Bun** >= 1.3
- **MySQL** / **PostgreSQL** / **SQLite** (pick one)
- **Redis** (optional, for cache/session/queue/realtime)

## Create a Project

::: code-group

```bash [npm]
npm create nexgen@latest my-project
```

```bash [pnpm]
pnpm create nexgen my-project
```

```bash [yarn]
yarn create nexgen my-project
```

```bash [bun]
bun create nexgen my-project
```

:::

::: tip
`npx nexgen@latest my-project` also works for npm users without the `create` prefix.
:::

## Setup

::: code-group

```bash [npm]
cd my-project
cp .env.example .env
npm install
```

```bash [pnpm]
cd my-project
cp .env.example .env
pnpm install
```

```bash [yarn]
cd my-project
cp .env.example .env
yarn install
```

```bash [bun]
cd my-project
cp .env.example .env
bun install
```

:::

## Configure Database

Edit `.env` and set your `DATABASE_URL`:

```env
# MySQL
DATABASE_URL=mysql://root:password@localhost:3306/nexgen

# PostgreSQL
DATABASE_URL=postgres://user:password@localhost:5432/nexgen

# SQLite
DATABASE_URL=sqlite:./src/storage/database/nexgen.sqlite
```

## Setup Database

::: code-group

```bash [npm]
npm run maker -- db:migrate --seed
```

```bash [pnpm]
pnpm maker db:migrate --seed
```

```bash [yarn]
yarn maker db:migrate --seed
```

```bash [bun]
bun maker db:migrate --seed
```

:::

This generates the schema from your model files, runs migrations, and seeds the database — all in one step.

## Start Development

The `dev` command starts everything you need at once:

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

This starts:

| Component | Command | Auto-enabled |
|---|---|---|
| API server | `maker serve --src` | Always |
| Vue 3 frontend (HMR) | `maker frontend:dev` | Unless `FRONTEND=false` |
| Queue worker (default + mail) | `maker queue:work` | Unless `REDIS=false` |

All URLs are printed in the console when the dev server starts:

- `http://localhost:3000` — API server
- `http://localhost:3000/api-docs` — API documentation (Scalar)
- `http://localhost:3000/bullmq` — BullMQ queue dashboard (auto-enabled when Redis is on)
- `http://localhost:5173` — Vue 3 frontend (hot reload)

### Sidecar Tools

Add optional dev tools with `--view`:

::: code-group

```bash [npm]
npm run maker dev -- --view=redis,maildev,studio
```

```bash [pnpm]
pnpm maker dev --view=redis,maildev,studio
```

```bash [yarn]
yarn maker dev --view=redis,maildev,studio
```

```bash [bun]
bun maker dev --view=redis,maildev,studio
```

:::

| Tool | URL | Flag |
|---|---|---|
| MailDev (email preview) | `http://localhost:1080` | `--view=maildev` |
| Redis Commander | `http://localhost:1369` | `--view=redis` |
| Drizzle Studio | `https://local.drizzle.studio` | `--view=studio` |
| BullBoard | Already at `/bullmq` | `--view=bullmq` |

### Run Components Individually

You don't have to run everything together. Each component can be started separately:

::: code-group

```bash [npm]
# API server only
npm run maker serve -- --src

# Queue worker (background jobs)
npm run maker queue:work -- --queue=default,mail

# Scheduler (cron jobs)
npm run maker schedule:work

# Vue frontend only
npm run maker frontend:dev

# UI tools on demand
npm run maker maildev:view
npm run maker redis:view
```

```bash [pnpm]
pnpm maker serve --src
pnpm maker queue:work --queue=default,mail
pnpm maker schedule:work
pnpm maker frontend:dev
pnpm maker maildev:view
pnpm maker redis:view
```

```bash [yarn]
yarn maker serve --src
yarn maker queue:work --queue=default,mail
yarn maker schedule:work
yarn maker frontend:dev
yarn maker maildev:view
yarn maker redis:view
```

```bash [bun]
bun maker serve --src
bun maker queue:work --queue=default,mail
bun maker schedule:work
bun maker frontend:dev
bun maker maildev:view
bun maker redis:view
```

:::

This is useful when you want to run only the API server without the frontend, or run the queue worker on a separate machine, or debug a specific component without the overhead of the full dev stack.

### Production Mode

Run compiled (`dist/`) code for production-like testing:

```bash
maker serve --prod --runtime=node
maker queue:work --queue=default,mail --prod --runtime=node
maker schedule:work --prod --runtime=node
```

The `--prod` flag uses the compiled JavaScript in `dist/` instead of running from TypeScript source. The `--runtime` flag switches between `node` and `bun`.
