# AI Agents

Every project created with `create-nexwire` ships an **`AGENTS.md`** at its root.
It is the contract a coding agent reads before it writes a line of code: the
project layout, the module conventions, the engine's HTTP idioms, and the
commands to scaffold and verify. This page explains what is in that file and how
the rest of the documentation is exposed to an agent.

## What ships in your project

| File        | Purpose                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| `AGENTS.md` | The rules. Engine-aware — Hono, Express and Fastify each get their own. |

The file is generated per engine because each engine has a native way of doing
the same thing: a Hono controller is a `Handler` and returns `c.json(...)`, an
Express controller is `(req, res, next)` and returns `res.status(...).json(...)`,
and a Fastify controller receives a typed `request` and a `reply`. The shared
rules — directory-based discovery, the `@/` alias, schema-derived types, facades
— are identical in all three.

::: tip Agents read it automatically
Most coding agents (OpenCode, Cursor, Codex, Claude Code, …) look for
`AGENTS.md` in the project root on their own. You do not have to paste it into
the prompt.
:::

## Documentation for agents

The full documentation stays online — nothing is copied into your project.

- **[`llms.txt`](/llms.txt)** — an index of every page with a one-line
  description. Point an agent here first.
- **[`llms-full.txt`](/llms-full.txt)** — every page concatenated into a single
  file, for an agent that would rather read the whole set in one request.

Both are generated from this site at build time, so they never drift from the
published pages. They live at the site root, so the links above resolve to the
same file on the published site and on your local dev server — nothing to
configure, no MCP server.

## The rules the agent follows

These are the conventions described in [Conventions](/guide/conventions) and
[Modules](/guide/modules), restated as the short list an agent needs:

1. **Never edit `src/framework/**`.** It is the framework, not your application.
2. **Directory = meaning.** Files are discovered by folder, not by filename.
3. **Name your location.** The first line of every source file is a comment with
   its engine-relative path, followed by one blank line.
4. **Import through `@/`.** Never `./` or `../` inside `src/modules/**`; import
   the framework only from `@/framework/facade.js`.
5. **Schemas are the source of truth.** Declare each request shape once in
   `schemas/` and derive its type (`z.input<typeof XSchema>`) on the next line.
6. **Modules talk through facades.** Another module's public API is its
   `facade.ts` — nothing else.
7. **Scaffold with `maker`.** Use `npm run maker module:*` so files land in the
   right place. `maker` has a wide surface (modules, database, runtime, testing,
   deploy) — run `npm run maker -- --help` to find the right command instead of
   guessing, and `npm run maker -- <command> --help` for its options. The `--`
   lets npm forward the flag. See the [CLI reference](/cli/reference).
8. **helper = computes, service = does.** Pure logic in `helpers/`, everything
   that touches the database, files or network in `services/`.

## Frontend rules

The UI (`src/resources/`) has its own conventions, and this is where improvised
code drifts most:

- **`@/` means `src/resources/src/` in the UI** — a different root from backend
  code, where `@/` is `src/`. Import components, stores and plugins with the
  alias; never `../`.
- **Reuse the shipped components** (`@/components/**`) — `Button`, `Input`,
  `Select`, `Datepicker`, `DataTable`, `Modal`, `Toast`, `Pagebar` — instead of
  hand-rolling inputs, tables or modals. See
  [Components](/guide/resources/components).
- **Register the route.** A page lives at `pages/<feature>/index.vue` and is a
  lazy child of the `dashlayout` route in `router/index.ts` with
  `meta: { requiresAuth: true }`.
- **State and requests live in a Pinia store** (`stores/<name>.ts`), not
  scattered across pages; `stores/example.ts` is the shape to copy, and each
  action calls the API through `@/plugins/axios` (base URL, credentials and the
  401 redirect are already configured).
- **Pages submit through the store, not axios.** Hold a form with
  `useGum(defaults)` and call the matching `*With` helper — `form.postWith`,
  `putWith`, `patchWith`, `deleteWith` (or `gum.postWith` / `getWith` / … for a
  visit with no form), passing `fetcher: (body) => store.action(body)` plus
  `transform`, `onSuccess` and `onError`. See [Gum](/guide/resources/gum).
- **Realtime goes through `@/plugins/pulse`** — `pulse.channel(name).listen(event, fn)`
  paired with the backend's `dispatchEvent(...)`, cleaned up in `onUnmounted`;
  never a raw `WebSocket`, `EventSource` or polling loop. See
  [Pulse](/guide/resources/pulse).
- **Pure functions go in `helpers/`**, shared reactive state in `composables/`.

The project's `AGENTS.md` spells all of this out; the
[UI guide](/guide/resources/) is the reference.

## Verifying the agent's work

The `AGENTS.md` asks an agent to finish with the same gates you would run
yourself:

```bash
npx tsc -p tsconfig.json --noEmit   # types
npm run typecheck:ui                # the Vue UI
npm run lint                        # biome
npm run test:run                    # vitest
```

See [Unit Testing](/guide/testing) for the module test pattern.
