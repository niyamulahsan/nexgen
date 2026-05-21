# Modules

Every module lives in `src/modules/<module-name>` and can contain:

```
src/modules/<module>/
├── controllers/
├── routes/
├── database/
│   ├── models/
│   └── seeders/
├── jobs/
└── console/
```

## Creating a Module

::: code-group

```bash [npm]
npm run maker module:make blog
```

```bash [pnpm]
pnpm maker module:make blog
```

```bash [yarn]
yarn maker module:make blog
```

```bash [bun]
bun maker module:make blog
```

:::

## Adding Components

::: code-group

```bash [npm]
npm run maker module:make-controller blog post
npm run maker module:make-route blog post
npm run maker module:make-model blog post
npm run maker module:make-seeder blog post
npm run maker module:make-job blog process-comment
npm run maker module:make-console blog cleanup
```

```bash [pnpm]
pnpm maker module:make-controller blog post
pnpm maker module:make-route blog post
pnpm maker module:make-model blog post
pnpm maker module:make-seeder blog post
pnpm maker module:make-job blog process-comment
pnpm maker module:make-console blog cleanup
```

```bash [yarn]
yarn maker module:make-controller blog post
yarn maker module:make-route blog post
yarn maker module:make-model blog post
yarn maker module:make-seeder blog post
yarn maker module:make-job blog process-comment
yarn maker module:make-console blog cleanup
```

```bash [bun]
bun maker module:make-controller blog post
bun maker module:make-route blog post
bun maker module:make-model blog post
bun maker module:make-seeder blog post
bun maker module:make-job blog process-comment
bun maker module:make-console blog cleanup
```

:::

## OpenAPI Mode

The generated controller, route, and schema files adapt to your `OPEN_API` environment variable. The CLI reads `process.env.OPEN_API` at scaffold time (`env-db.mjs:openApiEnabled()`) and selects the appropriate stub templates.

| Aspect | `OPEN_API=true` (default) | `OPEN_API=false` |
|---|---|---|
| **Controller validation** | `c.req.valid("param")` / `c.req.valid("json")` — Hono's built-in validation driven by route schema | `await validate(Schema, data)` — manual validation call via `@/framework/facade.js` |
| **Schema file** | Full set: `ItemSchema`, `CreateSchema`, `UpdateSchema`, `IdParamsSchema`, response schemas (`ListResponse`, `Response`, `Message`) | Minimal: only `CreateSchema`, `UpdateSchema`, `IdParamsSchema` (input-only) |
| **Route file** | Uses `createRoute()` with `.api()` — each route has metadata (path, method, tags, request params/body, response codes) | Uses direct verb methods `.get("/:id", handler)` — no metadata, no response schemas |
| **Controller imports** | No validation import needed | `import { validate } from "@/framework/facade.js"` |
| **Generated API docs** | Routes appear in Scalar UI at `/api-docs` with full request/response schemas | No auto-generated documentation |

### OPEN_API=true — OpenAPI Stubs

**Controller** (`controller/openapi.ts.stub`):
```ts
import type { Handler } from "hono";

export const show: Handler = async (c: any) => {
  const params = c.req.valid("param");
  return c.json({ message: "Post fetched successfully", data: { id: params.id, name: "" } });
};
```
Validation comes from the route definition — the controller simply accesses validated data via `c.req.valid()`.

**Route** (`route/api.ts.stub`):
```ts
import { createRoute, group, HttpStatusCodes, jsonContent } from "@/framework/facade.js";

const showRoute = createRoute({
  path: "/{id}",
  method: "get",
  tags: ["Blog"],
  request: { params: PostIdParamsSchema },
  responses: { [HttpStatusCodes.OK]: jsonContent(PostResponseSchema, "post details") }
});

export default group()
  .api(showRoute, show);
```

**Schema** (`controller/schema.ts.stub`):
```ts
export const PostItemSchema = z.object({ id: z.number(), name: z.string() });
export const PostResponseSchema = z.object({ message: z.string(), data: PostItemSchema });
// + CreateSchema, UpdateSchema, IdParamsSchema, ListResponseSchema, MessageSchema
```

### OPEN_API=false — Plain Stubs

**Controller** (`controller/plain.ts.stub`):
```ts
import type { Handler } from "hono";
import { validate } from "@/framework/facade.js";
import { CreatePostSchema, UpdatePostSchema, PostIdParamsSchema } from "./post.schema.js";

export const show: Handler = async (c: any) => {
  const params = await validate(PostIdParamsSchema, c.req.param());
  return c.json({ message: "Post fetched successfully", data: { id: params.id, name: "" } });
};
```
Validation is explicit — the controller calls `validate()` directly on the raw input.

**Route** (`route/plain.ts.stub`):
```ts
import { group } from "@/framework/facade.js";

export default group()
  .get("/", index)
  .get("/:id", show)
  .post("/", store)
  .put("/:id", update)
  .delete("/:id", destroy);
```

**Schema** (`controller/schema.plain.ts.stub`):
```ts
export const CreatePostSchema = z.object({ name: z.string().min(1) });
export const UpdatePostSchema = z.object({ name: z.string().min(1) });
export const PostIdParamsSchema = z.object({ id: z.coerce.number().int().positive() });
// No response schemas — only input validation schemas
```

### Route Auto-Linking

When you add a new route with `module:make-route`, the CLI automatically links it to the most recently modified controller in the module:

```bash
bun maker module:make-route blog
```

The linker (`resolveRouteControllerName` in `core.mjs`) works like this:

1. If you specify a controller name (e.g. `module:make-route blog post`), it checks for `controllers/post.controller.ts` and `controllers/post.schema.ts`
2. If those exist, it uses them. If not, it scans the module's `controllers/` directory and picks the **most recently modified** `.controller.ts` file
3. Falls back to the module name

The generated route file imports the controller's handlers and schemas:

```ts
import { index, show, store, update, destroy } from "@/modules/blog/controllers/post.controller.js";
// In OPEN_API mode, also imports schemas
import { PostIdParamsSchema, PostListResponseSchema } from "@/modules/blog/controllers/post.schema.js";
```

The route uses the `OPEN_API` setting active at **scaffold time** to decide the route style:

| | `OPEN_API=true` | `OPEN_API=false` |
|---|---|---|
| Route registration | `.api(createRoute({...}), handler)` — each route carries full request/response schema metadata | `.get("/", handler)` — plain verb method, no metadata |
| Schema import | Full set: params, body, response schemas | None — controller handles validation |
| Controller handlers wired | All 5 CRUD: `index, show, store, update, destroy` | All 5 CRUD: `index, show, store, update, destroy` |

**Important:** The route file is a **wrapper** — it does not contain business logic. It defines the HTTP metadata (path, method, params, response codes) and delegates execution to the controller. This keeps your controllers framework-agnostic and your route definitions declarative.

### Switching Modes

To scaffold in plain mode, set `OPEN_API=false` before running the generator:

```bash
OPEN_API=false bun maker module:make-controller blog post
OPEN_API=false bun maker module:make-route blog post
```

To create a route that links to a specific controller:

```bash
# Links to controllers/post.controller.ts + controllers/post.schema.ts
bun maker module:make-route blog post
# Saves as routes/post.ts (instead of api.ts)

bun maker module:make-route blog --force
# Overwrites routes/api.ts if it already exists
```

Or set it in your `.env` to persist the choice. The CLI will print which mode it used at scaffold time.

> Example stubs (`example/controller.ts`, `example/route.api.ts`) and notification stubs always generate in OpenAPI style regardless of the `OPEN_API` flag — they serve as reference implementations.

## Auto-Discovery

**nexgen** automatically discovers and registers:

- **Routes** from `*/routes/*.ts`
- **Jobs** from `*/jobs/*.ts` with `shouldQueue`
- **Console** from `*/console/*.ts` with `defineSchedule`
- **Models** from `*/database/models/*.ts`
- **Seeders** from `*/database/seeders/*.ts`
