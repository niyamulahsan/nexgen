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
  <a href="https://github.com/niyamulahsan/nexgen/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License"></a>
</p>

---

- [Install](#install)
- [Quick start](#quick-start)
  - [Basic route](#basic-route)
  - [Basic form on the frontend](#basic-form-on-the-frontend)
- [Core concepts](#core-concepts)
  - [Modules](#modules)
  - [Framework](#framework)
  - [Frontend](#frontend)
- [CLI](#cli)
- [Deployment](#deployment)
- [Ecosystem](#ecosystem)
- [Contributing](#contributing)
- [License](#license)

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
# Generate schema, run migrations, seed the database
npm run maker db:migrate --seed

# Start everything: API server + frontend HMR + queue worker
npm run maker dev
```

That's it. Your API is live at `http://localhost:3000`, the Scalar docs at `http://localhost:3000/api-docs`, and the Vue frontend (with hot reload) at `http://localhost:5173`.

### Basic route

```ts
// src/modules/posts/routes/api.ts
import {
  createRoute,
  group,
  HttpStatusCodes,
  jsonContent,
} from "@/framework/facade.js";

const listRoute = createRoute({
  path: "/",
  method: "get",
  tags: ["Posts"],
  responses: { [HttpStatusCodes.OK]: jsonContent(z.array(PostSchema), "list") },
});

export default group().api(listRoute, (c) =>
  c.json([{ id: 1, title: "Hello" }]),
);
```

### Basic form on the frontend

```vue
<script setup lang="ts">
import { useGumForm } from "@/plugins/gum";

const form = useGumForm({ email: "", password: "" });

function login() {
  form.post("/api/auth/login", undefined, {
    onSuccess: () => router.push("/"),
    onError: () => {}, // errors populate form.errors automatically
  });
}
</script>

<template>
  <form @submit.prevent="login">
    <Input v-model="form.data.email" label="Email" :err="form.errors?.email" />
    <InputPasswordToggle
      v-model="form.data.password"
      label="Password"
      :err="form.errors?.password" />
    <Button type="submit" label="Sign In" :loading="form.processing" />
  </form>
</template>
```

## Core concepts

### Modules

Every feature is a self-contained module under `src/modules/<name>/`:

```
src/modules/posts/
├── controllers/       # Request handlers
├── routes/            # HTTP route definitions (auto-discovered)
├── database/
│   ├── models/        # Drizzle schema definitions
│   └── seeders/       # Test data
├── jobs/              # BullMQ queue handlers
├── console/           # CLI commands
└── schedules/         # Cron jobs
```

Modules are auto-discovered — no manual registration needed. Create one with:

```bash
npm run maker module:make blog
npm run maker module:make-controller blog post
npm run maker module:make-route blog post
npm run maker module:make-model blog post
```

### Framework

The framework at `src/framework/` provides all reusable infrastructure:

| Subsystem         | Description                                                            |
| ----------------- | ---------------------------------------------------------------------- |
| **HTTP**          | Hono router, CORS, rate limiter, OpenAPI / Scalar docs                 |
| **Database**      | Drizzle ORM with SQLite, MySQL, PostgreSQL                             |
| **Auth**          | JWT access + refresh token rotation, role middleware                   |
| **Cache**         | Redis-backed TTL cache with `get/put/forget/remember`                  |
| **Session**       | Server-side session store with httpOnly cookies                        |
| **Queue**         | BullMQ job processing with `shouldQueue` decorator                     |
| **Events**        | String-based event dispatcher with broadcast + queue                   |
| **Realtime**      | Socket.IO with auto room joining (user, role, auth)                    |
| **Scheduler**     | Cron-based scheduling with distributed Redis lock                      |
| **Storage**       | Local disk or S3-compatible file storage                               |
| **Notifications** | Database-persisted notifications with broadcast + mail                 |
| **Support**       | JWT, mail (nodemailer), password (bcrypt), signed cookies, URL builder |

Access everything through the facade:

```ts
import {
  db,
  cache,
  session,
  queue,
  dispatchEvent,
  notify,
  storage,
  jwt,
  mail,
  password,
  urls,
  logger,
} from "@/framework/facade.js";
```

### Frontend

A Vue 3 SPA lives at `src/resources/` with three built-in plugins:

| Plugin     | Import                                               | Purpose                                   |
| ---------- | ---------------------------------------------------- | ----------------------------------------- |
| **Gum**    | `import { useGum, useGumForm } from "@/plugins/gum"` | Inertia-style page visits & form handling |
| **Pulse**  | `import { pulse } from "@/plugins/pulse"`            | Socket.IO realtime channels               |
| **Dialog** | `import { dialog } from "@/plugins/dialog"`          | Programmatic alert/confirm/prompt         |

## CLI

| Command                   | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `maker dev`               | Start API server + frontend HMR + queue worker |
| `maker serve`             | API server only (dev or prod)                  |
| `maker queue:work`        | BullMQ worker process                          |
| `maker schedule:work`     | Cron scheduler worker                          |
| `maker db:migrate --seed` | Run migrations + seeders                       |
| `maker module:make`       | Scaffold a new module                          |
| `maker module:make-*`     | Scaffold controllers, routes, models, jobs     |
| `maker deploy:local`      | Docker Compose local deploy                    |
| `maker deploy:remote`     | SSH + Docker remote deploy                     |

## Deployment

```bash
# Build the frontend
npm run maker frontend:build

# Start production server
npm run maker serve --prod

# Or deploy with Docker
npm run maker deploy:local
```

The framework includes Docker Compose files with:

- Multi-stage Node.js app image
- nginx-proxy with auto-SSL (Let's Encrypt)
- Optional MySQL + Redis containers
- Process supervisor for queue worker + scheduler

## Ecosystem

| Package                                                      | Version | Description             |
| ------------------------------------------------------------ | ------- | ----------------------- |
| [create-nexgen](https://www.npmjs.com/package/create-nexgen) | 2.2.3   | Project scaffolding CLI |
| [docs](https://niyamulahsan.github.io/nexgen)                | —       | Full documentation site |

## Contributing

Contributions are welcome. Open an issue or pull request on [GitHub](https://github.com/niyamulahsan/nexgen).

## License

nexgen is open-sourced software licensed under the [MIT license](LICENSE).
