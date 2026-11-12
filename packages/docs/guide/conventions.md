# Conventions

How files are named, where they live, and how modules talk to each other.

## The one principle

> **Directory = meaning. Suffix = readability.**

The framework discovers files by **directory**, never by filename. Every glob is
extension-agnostic:

```ts
discoverModuleFiles("**/routes/*.{ts,js}");
discoverModuleFiles("**/jobs/*.{ts,js}");
discoverModuleFiles("**/database/models/*.{ts,js}");
discoverModuleFiles("**/{schedules,console}/*.{ts,js}");
```

So the folder is what makes a file work. The `.controller.ts` / `.service.ts`
suffix is a readability aid only — any filename inside the right folder is valid.

::: warning Don't switch to suffix-based discovery
Writing `**\/*.model.ts` instead of `**/database/models/*` would break every
existing module. Directory stays king.
:::

## Directory table

All paths are relative to `src/modules/<module>/`.

| Kind       | Directory           | Suffix      | Example             |
| ---------- | ------------------- | ----------- | ------------------- |
| test       | `__test__/`         | `*.test.ts` | `post.test.ts`      |
| console    | `console/`          | `*.ts`      | `cleanup.ts`        |
| controller | `controllers/`      | `*.ts`      | `post.ts`           |
| database   | `database/`         | `*.ts`      | `post.ts`           |
| model      | `database/models/`  | `*.ts`      | `post.ts`           |
| seeder     | `database/seeders/` | `*.ts`      | `post.ts`           |
| helper     | `helpers/`          | `*.ts`      | `post.ts`           |
| job        | `jobs/`             | `*.ts`      | `processComment.ts` |
| middleware | `middlewares/`      | `*.ts`      | `calc.ts`           |
| route      | `routes/`           | `*.ts`      | `index.ts`          |
| schema     | `schemas/`          | `*.ts`      | `post.ts`           |
| service    | `services/`         | `*.ts`      | `post.ts`           |
| type       | `types/`            | `*.ts`      | `post.ts`           |
| provider   | `providers/`        | `<name>.ts` | `notification.ts`   |
| **facade** | `facade.ts` (root)  | —           | `facade.ts`         |

A scaffolded module looks like this:

```
src/modules/blog/
├── __tests__/
│   └── post.test.ts
├── console/
│   └── post.ts
├── controllers/
│   └── post.ts
├── database/
│   ├── models/
│   └── seeders/
├── helpers/
│   └── post.ts
├── jobs/
│   └── post.ts
├── middlewares/
│   └── post.ts
├── routes/
│   └── index.ts
├── schemas/
│   └── post.ts
├── services/
│   └── post.ts
├── types/
│   └── post.ts
├── providers/
└── facade.ts
```

Request shapes belong in `schemas/`; `types/` is for custom shapes that do not come
from a schema (see [Schemas are the source of truth](#schemas-are-the-source-of-truth)).

## Every file names its own location

The first line of every source file is a comment with the path the file will have
in the project:

```ts
// ./src/modules/auth/controllers/auth.ts

import { cookie } from "@/framework/facade.js";
```

```vue
<!-- ./src/resources/src/pages/auth/login.vue -->

<template>
  ...
</template>
```

Module folders repeat filenames on purpose — `controllers/auth.ts`,
`services/auth.ts`, `helpers/auth.ts` — and a file pasted into a chat, a diff or a
stack trace loses its path. The header is what says which one it is. Keep the line
when you copy a file, update it when you move one (a `.vue` file uses an HTML
comment), and leave one blank line under it so the header reads as a title rather
than part of the first import. Paths are engine-relative, so the three engines'
identical files keep identical first lines.

Not every file can carry one: `package.json` and `.env` have no comment syntax
(a `//` line breaks npm and the dotenv parser), and `maker-cli/stubs/**` are
templates — a hard-coded path there would end up inside *generated* files.

::: tip Use the `@/` alias, always
Every import inside `src/modules/` uses the `@/` alias, including files in the
same module:

```ts
// ✅ both of these
import { postController } from "@/modules/blog/controllers/post.controller.js";
import { postHelpers } from "@/modules/blog/helpers/post.helpers.js";
```

Relative paths (`./`, `../`) are not used in module code. The alias keeps paths
stable when you move a file between folders.

`helpers/`, `services/`, and `middlewares/` are created empty (`.gitkeep`) by
default — fill them with the matching `module:make-*` command when needed.
:::

## Schemas are the source of truth

A request shape is declared **once**, in `schemas/<module>.ts`, and the TypeScript
type is derived from it on the next line:

```ts
// src/modules/blog/schemas/post.ts
export const CreatePostSchema = z.object({
  title: z.string().min(1),
  body: z.string()
});

export type CreatePostType = z.input<typeof CreatePostSchema>;
```

- `CreatePostSchema` is the **value**. It validates at runtime — the route `schema`
  and `validate()` use it, always.
- `CreatePostType` is the **type**. Controllers and services accept it without a
  second hand-written interface that drifts when the schema changes.
- `z.input` describes the **request** shape: fields with a `.default()` stay
  optional, exactly what a client may send. Use `z.output` (or `z.infer`) when you
  need the post-parse shape instead.
- Name the pair `<X>Schema` / `<X>Type` so a reader can tell the validator from the
  type at a glance.

Both are imported from the same file — value in the route, type in the layers
below it:

```ts
import { CreatePostSchema } from "@/modules/blog/schemas/post.js"; // runtime validation
import type { CreatePostType } from "@/modules/blog/schemas/post.js"; // compile-time shape
```

`types/` is **not** for request shapes. It holds custom types that do not come from
a schema — result unions, DTOs, view models — and `maker module:make-type` still
generates it.

## App-level providers

Providers are capabilities, and capabilities can be app-wide or module-scoped:

| Scope         | Location                          | Who writes it                                                                           |
| ------------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| App-wide      | `src/providers/`                  | You — the capability is shared by the whole app (e.g. SMS)                              |
| Module-scoped | `src/modules/<module>/providers/` | The module — the capability that module offers (e.g. a module's own notification store) |

See [Providers](/guide/providers) for the layout rules (single file vs folder vs module) and the contracts.

## helper vs service — not the same

|         | Test                                    | Examples                                                                  |
| ------- | --------------------------------------- | ------------------------------------------------------------------------- |
| helper  | pure computation, **no I/O**            | `slugify("Hi There")` → `"hi-there"`<br/>`hasRole(u, ["admin"])` → `true` |
| service | **does** something — DB, files, network | `sendPasswordEmail(user)`<br/>`createOrder(data)`                         |

> **helper = computes. service = does.**

If it touches the database, the filesystem, or the network, it is a service.
Helpers stay trivially testable because they cannot fail on I/O.

## Module facades

A `facade.ts` is a module's **public API** — the single door other modules knock on.
It mirrors `framework/facade.ts`, whose own docblock already says
_"App-layer imports should target this file."_

```ts
// src/modules/auth/facade.ts
export { hasRole, getCurrentUser } from "./helpers/auth.helpers.js";
export { createAuthSchema } from "./controllers/auth.schema.js";
```

Other modules import from the door:

```ts
// ✅ through the door
import { hasRole } from "@/modules/auth/facade.js";

// ❌ reaching into internals — breaks the moment you refactor
import { hasRole } from "@/modules/auth/helpers/auth.helpers.js";
```

### The three rules

> **Rule 1 — Modules talk to each other ONLY through facades.**
> 
> **Rule 2 — Facades NEVER import other facades.**
> 
> **Rule 3 — Each module NEVER import/use its own facade.**

Rule 2 exists because a facade re-exports _everything_ in its module, so
`A/facade.ts → B/facade.ts → A/facade.ts` loops trivially.

```
✅ WORKS
   A/facade.ts ──► B/helpers/tax.ts      (single file, NOT the facade)
   B/facade.ts ──► A/helpers/user.ts     (single file, NOT the facade)

❌ BREAKS
   A/facade.ts ──► B/facade.ts ──► A/facade.ts

❌ BREAKS
   A/facade.ts ──► A/helpers/user.ts (circuler import)
```

**Escape hatch:** anything you want to share goes in the facade. If a facade
genuinely needs one file from another module, it imports that **single file** —
never the other facade.

### Inside vs outside a module

| From                            | To                              |                       |
| ------------------------------- | ------------------------------- | --------------------- |
| `modules/auth/controllers/a.ts` | `modules/auth/controllers/b.ts` | ✅ same module, direct |
| `modules/admin/post/…`          | `modules/auth/facade.ts`        | ✅ through the door    |
| `modules/auth/facade.ts`        | `modules/auth/facade.ts`        | ❌ rule 1              |
| `modules/auth/facade.ts`        | `modules/billing/facade.ts`     | ❌ rule 2              |
| `modules/auth/facade.ts`        | `modules/auth/user.ts`          | ❌ rule 3              |
| `modules/blog/controllers/a.ts` | `modules/blog/services/b.ts`    | ✅ same module, direct |

### Decision guide

| Where does the logic live?                              | Where does it go?                 |
| ------------------------------------------------------- | --------------------------------- |
| Only used inside one module                             | that module, beside its caller    |
| Auth-flavored, needed by most modules                   | `auth` module → export via facade |
| Generic, needed by 2+ modules                           | `src/modules/shared/`             |
| Framework-stable, every app needs (`db`, `jwt`, `mail`) | `@/framework/facade.js`           |

::: tip Why facades exist
Rule 1 is the same bug this framework already hit: `config/session.ts` imported
`config/index.js`, which re-exported session. A cycle that only works because
the import happens to resolve before first use — until it doesn't. Facades make
the "public surface" explicit so the cycle checker can enforce it.
:::

## Circular imports

**Database models are exempt.** Drizzle's `relations()` defers cross-references
into lazy callbacks, so `user.ts` ↔ `role.ts` must import each other. That
mutual reference is structural, not accidental.

Everything else must be acyclic.

Models are skipped; `src/resources/**` (the Vue app) is excluded because it is
not part of the module graph.

## Module separation with panel

Sometimes we need to separate APIs by app or by panel. Suppose we have panel APIs—one for the backend and another for the frontend. If we separate them with their own panel names, it will be clear which API is actually for which panel. Similarly, if we separate multiple apps, it will also help in that case. It's very easy to do, you'd think.

::: code-group

```bash [npm]
npm run maker module:make blog --path=admin
npm run maker module:make-controller blog post --path=admin
npm run maker module:make-route blog post --path=admin
npm run maker module:make-model blog post --path=admin
```

```bash [pnpm]
pnpm maker module:make blog --path=admin
pnpm maker module:make-controller blog post --path=admin
pnpm maker module:make-route blog post --path=admin
pnpm maker module:make-model blog post --path=admin
```

```bash [yarn]
yarn maker module:make blog --path=admin
yarn maker module:make-controller blog post --path=admin
yarn maker module:make-route blog post --path=admin
yarn maker module:make-model blog post --path=admin
```

```bash [bun]
bun maker module:make blog --path=admin
bun maker module:make-controller blog post --path=admin
bun maker module:make-route blog post --path=admin
bun maker module:make-model blog post --path=admin
```

:::

## Related

- [Modules](/guide/modules) — creating modules and components
- [Architecture](/guide/architecture) — full project layout
- [Module Commands](/cli/module) — the `maker module:*` commands
