# AGENTS.md — nexwire (Hono)

You are working in a **nexwire** application: a full-stack TypeScript framework
(**Hono** HTTP layer + Vue 3 SPA + Drizzle ORM). This file is the contract. Read
it before writing code and follow it exactly.

- Docs: https://niyamulahsan.github.io/nexwire/
- AI index (one file, every page): https://niyamulahsan.github.io/nexwire/llms.txt
- Conventions: https://niyamulahsan.github.io/nexwire/guide/conventions

## Ground rules

1. **Never edit `src/framework/**`.** That is the framework itself. Application
   code lives in `src/modules/**`, `src/middlewares/**`, `src/providers/**`,
   `src/config/**` and `src/resources/**`.
2. **Directory = meaning.** The framework discovers files by folder, never by
   filename. A file works because of where it sits (`controllers/`, `services/`,
   `routes/`, `schemas/`, `database/models/`, …). The name is only for humans.
3. **Every source file names its own location on line 1, then one blank line:**

   ```ts
   // ./src/modules/blog/controllers/post.ts

   import { postService } from "@/modules/blog/services/post.js";
   ```

   Vue SFCs use the HTML form: `<!-- ./src/resources/src/pages/Home.vue -->`.
4. **Import through the `@/` alias.** In backend code `@/` is `src/`; inside the
   UI (`src/resources/**`) `@/` is `src/resources/src/`. Do not use `./` or `../`
   to cross folders (a sibling import in the same folder is fine). Import the
   framework only from `@/framework/facade.js`, never from `@/framework/<deep>/…`.
5. **Schemas are the source of truth.** Declare each request shape once in
   `schemas/` and derive its type on the next line (see below). `types/` holds
   only custom shapes that do not come from a schema.
6. **Modules talk through facades.** Another module's public API is its
   `facade.ts` — nothing else.
7. **Scaffold with `maker`.** Create module files with `npm run maker module:*`
   so they land in the right folder with the right shape. `maker` has many
   commands — run `npm run maker -- --help` to find the right one rather than
   guessing a name or a flag.
8. **helper = computes, service = does.** Pure logic → `helpers/`. Anything that
   touches the database, files or network → `services/`.

## Project layout

```
src/
├── config/        configuration (env.ts, app.ts, database.ts, auth.ts, …)
├── database/      schema barrel + migrations
├── framework/     the framework — do not edit
├── middlewares/   app-wide middleware (auth-middleware.ts, role-middleware.ts)
├── modules/       your features — one folder per module
├── providers/     app-wide capability providers
├── resources/     Vue 3 SPA (resources/src/**)
├── storage/       runtime files (logs, uploads, sqlite)
└── types/         global type declarations
```

## Module anatomy

Everything for one feature lives under `src/modules/<module>/`:

| Kind       | Folder              | Example              |
| ---------- | ------------------- | -------------------- |
| controller | `controllers/`      | `post.ts`            |
| service    | `services/`         | `post.ts`            |
| helper     | `helpers/`          | `post.ts`            |
| route      | `routes/`           | `index.ts`           |
| schema     | `schemas/`          | `post.ts`            |
| model      | `database/models/`  | `post.ts`            |
| seeder     | `database/seeders/` | `post.ts`            |
| middleware | `middlewares/`      | `post.ts`            |
| job        | `jobs/`             | `post.ts`            |
| console    | `console/`          | `cleanup.ts`         |
| test       | `__tests__/`        | `post.test.ts`       |
| type       | `types/`            | `post.ts`            |
| **facade** | `facade.ts` (root)  | public API of module |

## Schemas → types

Declare the schema as a **value** and derive the **type** from it, on the next
line, in the same file:

```ts
// src/modules/blog/schemas/post.ts
import { z } from "@/framework/facade.js";

export const CreatePostSchema = z.object({
  title: z.string().min(1),
  body: z.string()
});

export type CreatePostType = z.input<typeof CreatePostSchema>;
```

- `CreatePostSchema` validates at runtime — the route and `validate()` use it.
- `CreatePostType` is the shape controllers and services accept, so there is no
  second interface to drift.
- Name the pair `<X>Schema` / `<X>Type`. Never re-declare a request shape by hand.

## Facades

`facade.ts` is a module's public API — the one door other modules knock on.

> **Rule 1 — modules talk to each other ONLY through facades.**
> **Rule 2 — facades NEVER import other facades.**
> **Rule 3 — a module NEVER imports its own facade.**

Inside a module, files import each other directly. From outside, always go
through the target module's `facade.ts`.

## The HTTP layer (Hono)

A route file declares `createRoute({…})` objects and wires them to controllers
with `createRouter()`; the framework mounts the default export at
`/api/<module>`.

```ts
// ./src/modules/blog/routes/index.ts

import { createRoute, createRouter, HttpStatusCodes, jsonContent } from "@/framework/facade.js";
import { store } from "@/modules/blog/controllers/post.js";
import { CreatePostSchema, PostResponseSchema } from "@/modules/blog/schemas/post.js";

const storeRoute = createRoute({
  path: "/",
  method: "post",
  tags: ["Blog"],
  request: { body: jsonContent(CreatePostSchema, "Create post payload") },
  responses: { [HttpStatusCodes.CREATED]: jsonContent(PostResponseSchema, "Created") }
});

export default createRouter().api(storeRoute, store);
```

A controller is a Hono `Handler` that reads the validated body and returns
`c.json(body, status)`:

```ts
// ./src/modules/blog/controllers/post.ts

import type { Handler } from "hono";
import { HttpStatusCodes } from "@/framework/facade.js";
import type { CreatePostType } from "@/modules/blog/schemas/post.js";
import { postService } from "@/modules/blog/services/post.js";

export const store: Handler = async (c: any) => {
  const body = c.req.valid("json") as CreatePostType;
  const data = await postService.create(body);
  return c.json({ message: "Created", data }, HttpStatusCodes.CREATED);
};
```

Gate routes with `createRouter().group(authMiddleware)` (or
`group([authMiddleware, requireRole("admin")])`). Read the authenticated user
from `c.get("auth")`.

## The frontend (Vue 3)

The UI is a Vue 3 + Pinia + Vue Router SPA under `src/resources/`, served by
Vite. **Inside this tree `@/` means `src/resources/src/`** — a different root
from backend code, where `@/` is `src/`. Import across folders with the alias,
never with `../`:

```vue
<script setup lang="ts">
import Button from "@/components/Button.vue";
import DataTable from "@/components/datatable/index.vue";
import { useAuth } from "@/composables/useAuth";
import { usePostsStore } from "@/stores/posts";
import { useGum } from "@/plugins/gum";
</script>
```

### Reuse the shipped components

`src/resources/src/components/` already has the UI kit — do not hand-roll form
controls, tables or modals. Import and reuse:

| Need        | Component                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| buttons     | `@/components/Button.vue`, `FeatureButton.vue`, `FloatButton.vue`, `Href.vue`                                       |
| form fields | `@/components/Input.vue`, `InputPasswordToggle.vue`, `InputGroup.vue`, `TextArea.vue`, `Checkbox.vue`, `Switch.vue` |
| dropdown    | `@/components/Select.vue` (searchable, infinite scroll, API-fetching)                                               |
| date        | `@/components/Datepicker.vue`                                                                                       |
| table       | `@/components/datatable/index.vue` (+ `DataTableSkeleton.vue`)                                                      |
| overlays    | `@/components/Modal.vue`, `Toast.vue`, `Spinner.vue`                                                                |
| page chrome | `@/components/Pagebar.vue` (header title), `Refresh.vue` (header refresh), `FeatureButton.vue` (header action)      |

Props, slots and events for each:
https://niyamulahsan.github.io/nexwire/guide/resources/components

### Pages and routes

A page is a single-file component at
`src/resources/src/pages/<feature>/index.vue`. Register it as a lazy child of
the `dashlayout` route in `src/resources/src/router/index.ts`:

```ts
{ path: "/posts", name: "posts", component: () => import("@/pages/posts/index.vue"), meta: { requiresAuth: true } }
```

Guest pages go under `authlayout` with `meta: { guestOnly: true }`. Set the tab
title with `useHead({ title: "Posts" })`, and the in-app header title with
`<Pagebar title="Posts" />`.

### State and API calls

Shared state and the requests that change it live in a Pinia store
(`src/resources/src/stores/<name>.ts`, `defineStore`). `stores/example.ts` is the
shape to copy — one `index` / `show` / `store` / `update` / `destroy` action per
resource. Each action calls the API through `@/plugins/axios` (base URL,
`withCredentials`, the `X-Requested-With` header and the 401 redirect are already
configured), never a raw `fetch`:

```ts
// ./src/resources/src/stores/posts.ts
import axios from "@/plugins/axios";

export const usePostsStore = defineStore("posts", () => {
  const store = async (payload: CreatePostPayload) => {
    const { data } = await axios.post("/api/posts", payload);
    return data;
  };

  return { store };
});
```

**Pages do not call axios themselves.** A page owns a form with
`useGum(defaults)`, then submits it to the store action through the matching
`*With` helper — `form.postWith` / `putWith` / `patchWith` / `deleteWith`, or
`gum.postWith` / `getWith` / … for a visit with no form. Use only the verb the
request needs:

```vue
<script setup lang="ts">
import { dialog } from "@/plugins/dialog";
import { useGum } from "@/plugins/gum";
import { useAuthStore, type RegisterPayload } from "@/stores/auth";

const auth = useAuthStore();
const gum = useGum({ name: "", email: "", password: "", password_confirmation: "" });
const form = gum.form;

const onSubmit = () =>
  form.postWith({
    fetcher: (body) => auth.register(body as RegisterPayload),
    transform: (data) => ({ ...data, name: data.name.trim() }),
    onSuccess: () => form.reset(),
    onError: (_errors, error) => dialog.alert(error instanceof Error ? error.message : "Failed")
  });
</script>
```

- `fetcher` receives the form body and calls the store action; `transform`
  reshapes the body first; `onSuccess` / `onError` run after the request.
- `form.data` is the reactive model (`v-model="form.data.email"`),
  `form.errors` carries server validation errors onto fields
  (`:err="form.errors.email"`), `form.processing` disables the submit button, and
  `form.reset("password")` clears one field (no argument clears the whole form).
- `useGum()` with no defaults has no `form` — use `gum.postWith({ fetcher })` for
  a one-off request, e.g. verifying an email token.

Full surface (visit options, hooks, every `*With` helper):
https://niyamulahsan.github.io/nexwire/guide/resources/gum

### Plugins, composables, helpers

- `@/plugins/dialog` — `dialog.alert() / confirm() / prompt()` (`$dialog` in templates).
- `@/plugins/pulse` — realtime; see **Realtime** below.
- `@/plugins/browserDetect` and `@/plugins/routeProgress` — already wired in `main.ts`; do not re-register.
- `@/composables/useAuth` — `useAuth()`, `hasRole("admin")`, `authUser`.
- `@/helpers/utils`, `@/helpers/nformatter`, `@/helpers/assets` — pure helpers. Put new pure functions in `helpers/`, shared reactive state in `composables/`, never inline in a component.

A new global plugin must be registered in `src/resources/src/main.ts`.

### Realtime — use `pulse`

Anything live (notifications, presence, chat, a list that changes under the
user) goes through `@/plugins/pulse`. It wraps the Socket.IO client,
authenticates the socket and re-joins rooms after a reconnect — do not add a raw
`WebSocket`, `EventSource` or a polling loop.

```ts
import { pulse } from "@/plugins/pulse";
import { onUnmounted, ref } from "vue";

const latest = ref<{ orderId: number } | null>(null);

// `auth`, `user:{id}` and `role:{name}` are auto-joined; custom rooms are not.
const ch = pulse.channel("orders");
const handler = (payload: { orderId: number }) => (latest.value = payload);

ch.listen("order.placed", handler);
onUnmounted(() => ch.stopListening("order.placed", handler));
```

The matching backend broadcast is
`dispatchEvent("order.placed", payload, { broadcast: { rooms: ["orders"] } })`
(from `@/framework/facade.js`) — the room name and the channel name must be the
same string. Full API: https://niyamulahsan.github.io/nexwire/guide/resources/pulse

### Styling

Bootstrap 5 classes plus scoped `<style>` blocks that use the theme CSS
variables (`var(--app-border)`, `var(--app-surface)`, …). Do not add another CSS
framework.

## Commands

```bash
npm run dev                                  # API + UI + queue in one process
npm run dev -- --with=redis,maildev,studio   # API + UI + queue in one process with sidecar UI
npm run maker module:make blog               # scaffold a whole module
npm run maker module:make-controller blog post
npm run maker module:make-route blog post
npm run maker module:make-model blog post
npm run maker module:make-schema blog post
npm run maker module:migrate blog            # create + run the module's migration
npm run maker db:migrate -- --seed
npm run lint                                 # biome
npm run test:run                             # vitest
```

`maker` has a wide surface — modules, database, runtime, testing, deploy. **Do
not guess a command name or flag.** List everything with
`npm run maker -- --help`, and read one command's options with
`npm run maker -- <command> --help` (the `--` is required so npm forwards the
flag instead of swallowing it). Full reference:
https://niyamulahsan.github.io/nexwire/cli/reference

Use `--path=<panel>` to nest a module under a panel
(`module:make blog --path=admin` → `src/modules/admin/blog`).

## Before you say "done"

- `npx tsc -p tsconfig.json --noEmit` → 0 errors.
- `npm run typecheck:ui` → 0 errors (the Vue UI).
- `npm run lint` → clean.
- `npm run test:run` → green.
- Every new file has its location header + blank line and uses `@/` imports.
- Backend: request shapes live in `schemas/`, not `types/`.
- Frontend: pages reuse `@/components/**`, the route is registered, and shared
  state lives in a store.
