# Routing

nexwire uses one of three HTTP engines for routing: **Hono** (default), **Express**, or **Fastify**. `create-nexwire` asks interactively when you don't pass `--engine`; pass `--engine=hono`, `--engine=express`, or `--engine=fastify` to skip the prompt. Routes are defined per module and auto-registered at startup.

Hono and Express share the same facade (`createRoute`, `group`, `HttpStatusCodes`, `jsonContent`, ...) and differ only in the handler signature. Fastify is a native Fastify application: route files export a plugin, and schemas go straight into the route object. Read [Fastify Engine](./fastify) for the full Fastify shape.

| Concern             | Hono                                   | Express                             | Fastify                                          |
| ------------------- | -------------------------------------- | ----------------------------------- | ------------------------------------------------ |
| Route unit          | `group().api(route, handler)`          | `group().api(route, handler)`       | `FastifyPluginAsyncZod` plugin                   |
| Handler signature   | `(c: Context)`                         | `(req: Request, res: Response)`     | `(request: FastifyRequest, reply: FastifyReply)` |
| Validated body      | `c.req.valid("json")`                  | `req.body`                          | `request.body`                                   |
| Path param          | `c.req.param("id")`                    | `req.params.id`                     | `request.params.id`                              |
| Query param         | `c.req.query("page")`                  | `req.query.page`                    | `request.query.page`                             |
| JSON response       | `c.json(data, status)`                 | `res.status(status).json(data)`     | `reply.code(status).send(data)`                  |
| Middleware context  | `c.set("key", value)` / `c.get("key")` | `res.locals.key`                    | `request.auth` / `request.sessionId`             |
| Types imported from | `"hono"` (`Handler`, `Context`)        | `"express"` (`Request`, `Response`) | `"fastify"` (`FastifyRequest`, `FastifyReply`)   |

## Basic Route

Every route file exports a `group()` that collects route handlers:

```ts
// src/modules/posts/routes/index.ts
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
  responses: {
    [HttpStatusCodes.OK]: jsonContent(z.array(PostSchema), "list"),
  },
});
```

The route definition is identical on both engines — only the handler changes:

::: code-group

```ts [Hono]
export default group().api(listRoute, (c) =>
  c.json([{ id: 1, title: "Hello" }]),
);
```

```ts [Express]
import type { Request, Response } from "express";

export default group().api(listRoute, (_req: Request, res: Response) =>
  res.json([{ id: 1, title: "Hello" }]),
);
```

:::

On Fastify the route file exports a plugin and puts the schema directly on the route. There is no `createRoute()` step:

```ts
// src/modules/posts/routes/index.ts
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { HttpStatusCodes, z } from "@/framework/facade.js";
import { index } from "@/modules/posts/controllers/post.js";
import { PostSchema } from "@/modules/posts/schemas/post.js";

const postRoutes: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: "GET",
    url: "/",
    schema: {
      tags: ["Posts"],
      description: "List all posts",
      response: { [HttpStatusCodes.OK]: z.array(PostSchema) },
    },
    handler: index,
  });
};

export default postRoutes;
```

## Route Groups

Use `group()` to organize routes into logical groups with shared middleware — identical on Hono and Express:

```ts
import { group } from "@/framework/facade.js";

// Public routes (no auth required)
const publicGroup = group().api(registerRoute, register).api(loginRoute, login);

// Protected routes (auth middleware applied)
const protectedGroup = group(authMiddleware)
  .api(listRoute, index)
  .api(showRoute, show);
```

`group(...)` is literally `createRouter().group(...)` — indistinguishable. These two statements are identical:

```ts
// Identical — pick either
export default group().api(listRoute, list);
export default createRouter().group().api(listRoute, list);
```

Use `createRouter()` directly only when a single file needs multiple independent groups composed together (e.g. public + protected under the same prefix via `.route()`):

| Pattern                            | Use case                                                           |
| ---------------------------------- | ------------------------------------------------------------------ |
| `group(middleware)`                | Simple single-group export, no sub-grouping needed                 |
| `createRouter().group(middleware)` | Multiple independent groups in the same file (public vs protected) |

Group middleware is scoped to the router it was declared on. It is merged into each `api()` call rather than registered as a catch-all, so mounting both groups at the same prefix keeps them independent:

```ts
const publicRoutes = createRouter().group(loginLimiter).api(registerRoute, register);
const protectedRoutes = createRouter().group(authMiddleware).api(meRoute, me);

// /auth/register runs only the limiter; /auth/me runs only auth.
// Neither group sees the other's middleware, at any mount depth.
export default createRouter().route("/", publicRoutes).route("/", protectedRoutes);
```

On Fastify, the same split is a child plugin with a scoped `preHandler` hook:

```ts
await app.register(async (scope) => {
  scope.addHook("preHandler", authMiddleware);
  scope.get("/me", me);
});
```

## Handlers

A handler receives the request and must return/send a response. Read the input, then respond:

::: code-group

```ts [Hono]
import type { Handler } from "hono";

export const show: Handler = async (c) => {
  const id = c.req.param("id"); // path param
  const page = c.req.query("page"); // query param
  const data = { id, page }; // ... your logic
  return c.json(data, 200);
};
```

```ts [Express]
import type { Request, Response } from "express";

export const show = (req: Request, res: Response) => {
  const id = req.params.id; // path param
  const page = req.query.page; // query param
  const data = { id, page }; // ... your logic
  res.status(200).json(data);
};
```

```ts [Fastify]
import type { FastifyReply, FastifyRequest } from "fastify";

export const show = async (request: FastifyRequest, reply: FastifyReply) => {
  const id = request.params.id; // path param
  const page = request.query.page; // query param
  const data = { id, page }; // ... your logic
  return reply.code(200).send(data);
};
```

:::

## OpenAPI Mode

On Hono and Express, `OPEN_API=true` routes use `createRoute()` with `.api()` for full OpenAPI documentation at `/api-docs`:

```ts
const showRoute = createRoute({
  path: "/{id}",
  method: "get",
  tags: ["Posts"],
  request: { params: PostIdParamsSchema },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(PostResponseSchema, "post details"),
  },
});

export default group().api(showRoute, show);
```

On Fastify the Zod schemas are the documentation — put them in `schema.body`, `schema.params`, `schema.querystring`, and `schema.response`:

```ts
app.route({
  method: "GET",
  url: "/:id",
  schema: {
    tags: ["Posts"],
    params: PostIdParamsSchema,
    response: { [HttpStatusCodes.OK]: PostResponseSchema },
  },
  handler: show,
});
```

When `OPEN_API=false`, routes use plain verb methods without metadata — identical on Hono and Express, and `app.get` / `app.post` on Fastify:

```ts
export default group()
  .get("/", index)
  .get("/:id", show)
  .post("/", store)
  .put("/:id", update)
  .delete("/:id", destroy);
```

## Route Auto-Discovery

Routes are auto-discovered from `src/modules/*/routes/*.ts`. No manual registration needed.

## Generating Routes

::: code-group

```bash [npm]
npm run maker module:make-route blog post
```

```bash [pnpm]
pnpm maker module:make-route blog post
```

```bash [yarn]
yarn maker module:make-route blog post
```

```bash [bun]
bun maker module:make-route blog post
```

:::

This creates `src/modules/blog/routes/post.ts` and auto-links it to the most recently modified controller.

## Middleware

Middleware runs before route handlers. On Hono and Express, apply it to a group or to a single route:

```ts
import { group } from "@/framework/facade.js";
import { authMiddleware } from "@/middlewares/auth-middleware.js";
import { requireRole } from "@/middlewares/role-middleware.js";

export default group(authMiddleware) // all routes require auth
  .api(listRoute, index)
  .api(showRoute, [requireRole("admin")], show); // admin only
```

On Fastify it is a scoped hook or a route `preHandler`:

```ts
await app.register(async (scope) => {
  scope.addHook("preHandler", authMiddleware);
  scope.addHook("preHandler", requireRole("admin"));
  scope.get("/", index);
});

// or per route
app.route({ method: "GET", url: "/", preHandler: authMiddleware, handler: me });
```

`authMiddleware` authenticates; `requireRole` authorises. Order matters — run auth first.

Running order, writing your own, sharing data with handlers, the global stack and the full list of built-in middleware live in [Middleware](./middleware). Generate a new file with `middleware:make` — see [Middleware Commands](../cli/middleware).

## Request Validation

With OpenAPI enabled, validation is automatic via route schemas:

::: code-group

```ts [Hono]
// Controller receives validated data
import type { Handler } from "hono";

export const store: Handler = async (c) => {
  const body = c.req.valid("json"); // validated against CreateSchema
  // body is typed — no manual validation needed
};
```

```ts [Express]
// Controller receives validated data
import type { Request, Response } from "express";

export const store = (req: Request, res: Response) => {
  const body = req.body; // validated against CreateSchema
  // body is typed — no manual validation needed
};
```

```ts [Fastify]
// Controller receives validated data
import type { FastifyReply, FastifyRequest } from "fastify";

export const store = async (request: FastifyRequest, reply: FastifyReply) => {
  const body = request.body; // validated against CreateSchema
  // body is typed — no manual validation needed
};
```

:::

Without OpenAPI, use the `validate()` helper (identical on all engines):

::: code-group

```ts [Hono]
import { validate } from "@/framework/facade.js";

export const store: Handler = async (c) => {
  const body = await validate(CreatePostSchema, await c.req.json());
};
```

```ts [Express]
import { validate } from "@/framework/facade.js";

export const store = async (req: Request, res: Response) => {
  const body = await validate(CreatePostSchema, req.body);
};
```

```ts [Fastify]
import { validate } from "@/framework/facade.js";

export const store = async (request: FastifyRequest, reply: FastifyReply) => {
  const body = await validate(CreatePostSchema, request.body);
};
```

:::

## File Uploads

Multipart parsing is engine-specific:

- **Hono** — `await c.req.parseBody()` returns the raw body; files arrive as `File` instances.
- **Express** — attach the `upload({ field })` / `fields()` facade middlewares to the route; files arrive as in-memory buffers on `req.file` / `req.files`.
- **Fastify** — attach the same `upload()` / `fields()` helpers as a `preHandler`; files arrive as in-memory buffers on `request.upload` / `request.uploads`.

::: code-group

```ts [Hono]
import type { Handler } from "hono";

// Hono controller file
export const upload: Handler = async (c: any) => {
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File))
    return c.json({ message: "File is required" }, 422);

  const path = await storage.disk("public").putFile("uploads", file);
  return c.json({ path, url: storage.disk("public").url(path) });
};
```

```ts [Express]
// Express api file
import { upload } from "@/framework/facade.js";
import type { Request, Response } from "express";

export default group().api(
  uploadRoute,
  [upload({ field: "file", maxSize: 2 * 1024 * 1024 })],
  async (req: Request, res: Response) => {
    const file = req.file!; // in-memory buffer
    const path = await storage.disk("public").putFile("uploads", file);
    res.json({ path, url: storage.disk("public").url(path) });
  },
);
```

```ts [Fastify]
// Fastify route file
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { upload } from "@/framework/facade.js";
import { store } from "@/modules/files/controllers/file.js";

const fileRoutes: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: "POST",
    url: "/",
    preHandler: upload({ field: "file", maxSize: 2 * 1024 * 1024 }),
    handler: store,
  });
};

// Controller: request.upload is an in-memory buffer
export const store = async (request: FastifyRequest, reply: FastifyReply) => {
  const file = request.upload!;
  const path = await storage.disk("public").putFile("uploads", file);
  return reply.code(200).send({ path, url: storage.disk("public").url(path) });
};
```

:::

See [Upload — Express and Fastify](/guide/support/upload) and [Storage: Multipart File Upload](/guide/storage#multipart-file-upload) for the full detail.

## UI Routes

UI routing uses Vue Router and is defined in `src/resources/src/router/`. See [UI > Router](/guide/resources/router) for details.
