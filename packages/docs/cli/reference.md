# CLI Reference

The **`maker`** CLI is the framework's command center — code generation, database management, runtime control, and deployment orchestration, all from one entry point.

## How It Works

The CLI is a Node.js script at `src/framework/maker-cli/src/index.mjs` registered as the `maker` binary in `package.json`. It uses **Commander.js** for argument parsing and **dotenv** for environment loading.

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

### Env loading behavior

- **All commands except deploy** — loads `.env` before running (so commands have access to `DATABASE_URL`, `REDIS`, etc.)
- **Deploy commands** — skip `.env` loading because they need to generate `.env` files first

### Package manager detection

The CLI auto-detects your package manager from the `npm_config_user_agent` env variable:

| Detected | Usage hint |
|---|---|
| npm | `npm run maker` |
| pnpm | `pnpm maker` |
| yarn | `yarn maker` |
| bun | `bun maker` |

## Command Categories

| Category | File | Commands | Purpose |
|---|---|---|---|
| [Module](/cli/module) | `level-2/module/` | 17 | Scaffold modules, controllers, models, routes, jobs, seeders, schedules |
| [Database](/cli/database) | `level-2/db/` | 13 | Schema generation, migrations, seeding, push, studio |
| [Runtime](/cli/runtime) | `level-2/runtime/` | 10 | Dev server, queue worker, scheduler, frontend, dev tools |
| [Deploy](/cli/deploy) | `level-2/deploy/` | 16 | Docker scaffolding, local/remote compose, workflows, DB import |

## Architecture

```
index.mjs (entry)
  ├─ dotenv (load .env, skipped for deploy commands)
  ├─ Commander program
  ├─ registerModuleCommands()  → module/index.mjs → module/core.mjs
  ├─ registerDeployCommands()  → deploy/index.mjs → deploy/core.mjs
  ├─ registerDbCommands()      → db/index.mjs     → db/core.mjs
  └─ registerRuntimeCommands() → runtime/index.mjs → runtime/core.mjs

Shared utilities (level-1/):
  ├─ help.mjs     — Package manager prefix detection, help display
  ├─ naming.mjs   — Name validation, PascalCase conversion
  ├─ env-db.mjs   — Dialect detection, URL parsing, feature flags
  ├─ flags.mjs    — Flag/option parsing helpers
  ├─ file-ops.mjs — File write strategies (skip, overwrite, bulk)
  └─ process.mjs  — Child process spawn, local binary resolution
```
