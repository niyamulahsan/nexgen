# Fastify Engine

nexwire has three HTTP engines: **Hono** (default), **Express**, and **Fastify**. The Fastify engine is a real Fastify application — plugins, scoped hooks, and route schemas — not a compatibility shim over the Hono API. Scaffold it with `--engine=fastify`:

```bash
npm create nexwire@latest my-project -- --engine=fastify
```

Fastify is Node-only. The scaffold ships without Bun engines or a Bun runtime profile.

## What is different

| Concern       | Express                                  | Fastify                                              |
| ------------- | ---------------------------------------- | ---------------------------------------------------- |
| Route unit    | `group().api(route, handler)`            | `FastifyPluginAsyncZod` plugin                       |
| Handler       | `(req: Request, res: Response)`          | `(request: FastifyRequest, reply: FastifyReply)`     |
| Body          | `req.body`                               | `request.body`                                       |
| Path param    | `req.params.id`                          | `request.params.id`                                  |
| Query         | `req.query.page`                         | `request.query.page`                                 |
| Response      | `res.status(200).json(data)`             | `reply.code(200).send(data)`                         |
| Group auth    | `group(authMiddleware)`                  | `scope.addHook("preHandler", authMiddleware)`        |
| One-off auth  | `.api(route, [authMiddleware], handler)` | `route({ preHandler: authMiddleware, handler })`     |
| Multipart     | `upload({ field })` (`multer`)           | `preHandler: upload({ field })` (`@fastify/multipart`) |
| Types         | `Request`, `Response` from `"express"`   | `FastifyRequest`, `FastifyReply` from `"fastify"`    |

`createRouter()`, `group()`, and `.api()` are **not** exported by the Fastify facade. Route files are ordinary Fastify plugins.

## Route files

Every `src/modules/<name>/routes/*.ts` file exports a `FastifyPluginAsyncZod` default. The module loader registers it under `/api/<module>`.

```ts
// src/modules/posts/routes/index.ts
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { HttpStatusCodes, ValidationErrorSchema, z } from "@/framework/facade.js";
import { index, store } from "@/modules/posts/controllers/post.js";
import { CreatePostSchema, PostSchema } from "@/modules/posts/schemas/post.js";

const ErrorSchema = z.object({ message: z.string() });

const postRoutes: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: "GET",
    url: "/",
    schema: {
      tags: ["Posts"],
      description: "List all posts",
      response: {
        [HttpStatusCodes.OK]: z.array(PostSchema)
      }
    },
    handler: index
  });

  app.route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["Posts"],
      description: "Create a post",
      body: CreatePostSchema,
      response: {
        [HttpStatusCodes.CREATED]: PostSchema,
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: ValidationErrorSchema
      }
    },
    handler: store
  });
};

export default postRoutes;
```

`url` uses Fastify's `:id` params, so a show route is `url: "/:id"` with `params`:

```ts
import { IdParamsSchema } from "@/modules/posts/schemas/post.js";

app.route({
  method: "GET",
  url: "/:id",
  schema: {
    tags: ["Posts"],
    params: IdParamsSchema,
    response: {
      [HttpStatusCodes.OK]: PostSchema,
      [HttpStatusCodes.NOT_FOUND]: ErrorSchema
    }
  },
  handler: show
});
```

Plain verb helpers work too when you do not need schema metadata:

```ts
app.get("/", index);
app.get("/:id", show);
app.post("/", store);
```

## Controllers

Controllers are native Fastify handlers. Read the parsed input from `request` and send through `reply`.

```ts
import type { FastifyReply, FastifyRequest } from "fastify";
import { HttpStatusCodes } from "@/framework/facade.js";
import { posts } from "@/modules/posts/database/models/post.js";

type ShowRequest = FastifyRequest<{ Params: { id: number } }>;

export const show = async (request: ShowRequest, reply: FastifyReply) => {
  const post = await posts.findFirst({ where: { id: request.params.id } });

  if (!post) {
    return reply.code(HttpStatusCodes.NOT_FOUND).send({ message: "Post not found" });
  }

  return reply.code(HttpStatusCodes.OK).send(post);
};

export const index = async (_request: FastifyRequest, reply: FastifyReply) => {
  const all = await posts.findMany();
  return reply.code(HttpStatusCodes.OK).send(all);
};
```

Services that need the request context take `(request, reply, ...args)` — the same shape as the Express engine's `(req, res, ...args)` — so the HTTP layer stays in the controller and the service stays testable.

## Scoped hooks

Use a child plugin when a group of routes shares a hook. `addHook` is scoped to that plugin, so the hook never leaks to sibling routes or other modules.

```ts
const postRoutes: FastifyPluginAsyncZod = async (app) => {
  // Public routes
  app.get("/", index);

  // Protected routes
  await app.register(async (scope) => {
    scope.addHook("preHandler", authMiddleware);
    scope.addHook("preHandler", requireRole("admin"));

    scope.get("/:id", show);
    scope.post("/", store);
  });
};

export default postRoutes;
```

Order matters exactly as it does on Express: `authMiddleware` must run first so `requireRole` can read `request.auth`.

One-off middleware goes on the route:

```ts
app.route({
  method: "POST",
  url: "/:id",
  preHandler: [authMiddleware, requireRole("admin")],
  handler: update
});
```

## Request state

Fastify's request object is extended by the template (`src/framework/http/fastify.d.ts`):

| Property          | Set by             | Contents                                                    |
| ----------------- | ------------------ | ----------------------------------------------------------- |
| `request.auth`    | `authMiddleware`   | The auth provider context — `id`, `email`, `role`, and extras |
| `request.sessionId` | `sessionMiddleware` | Guest/user session id                                     |
| `request.upload`  | `upload()`         | Single uploaded file                                        |
| `request.uploads` | `upload()` / `fields()` | Array (or labeled map) of uploaded files              |
| `request.id`      | Fastify            | UUID per request (`crypto.randomUUID()`), also echoed in `X-Request-ID` |

`request.sessionId` replaces the Express `req.sessionId` and Hono `c.get("sessionId")`; there is no `res.locals` on Fastify.

## Validation

`fastify-type-provider-zod` validates `body`, `params`, and `querystring` from the route `schema`. A failure returns Fastify's validation error, which the centralized error handler normalizes to `422` with the shared contract:

```json
{
  "success": false,
  "error": {
    "name": "ZodError",
    "issues": [{ "path": ["email"], "message": "Invalid email", "code": "string" }]
  }
}
```

Without a route schema, call the shared `validate()` helper — it throws the same `422` contract:

```ts
import { validate } from "@/framework/facade.js";
import { CreatePostSchema } from "@/modules/posts/schemas/post.js";

export const store = async (request: FastifyRequest, reply: FastifyReply) => {
  const body = await validate(CreatePostSchema, request.body);
  // body is typed
};
```

## Response schemas are enforced

Fastify serializes responses at runtime. A handler that sends a shape the declared schema does not allow raises a serialization error (`500`), so keep response schemas honest:

- Use the same schema you actually return.
- Mark fields the handler omits as `.optional()` — for example, `data` is optional in `RegisterResponseSchema` because the endpoint returns only `{ message }` when email verification is required.
- Declare error statuses you return (`401`, `403`, `404`, `422`) or omit them from the schema and let the handler send plain objects.

## Middleware and hooks

The framework registers its own hooks during boot — CORS, cookies, security headers, logging, rate limiting, sessions, and static files. Route-level middleware is just a Fastify hook or `preHandler`:

```ts
// src/middlewares/request-id-middleware.ts
import type { FastifyReply, FastifyRequest } from "fastify";

export async function requestIdMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  // Fastify already provides request.id; use it or attach your own state
  (request as FastifyRequest & { requestId?: string }).requestId = request.id;
}
```

```ts
scope.addHook("preHandler", requestIdMiddleware);
// or: app.route({ ..., preHandler: requestIdMiddleware, handler })
```

See [Middleware](./middleware) for the shared concepts and the Express/Hono equivalents.

## OpenAPI

The Fastify engine uses `@fastify/swagger` plus `fastify-type-provider-zod` to turn route schemas into an OpenAPI 3 document, and `@scalar/fastify-api-reference` to render it. Set `OPEN_API=true` and open `/api-docs`; the spec is served at `/doc`.

```ts
app.route({
  method: "GET",
  url: "/",
  schema: {
    tags: ["Posts"],
    summary: "List all posts",
    response: { 200: z.array(PostSchema) }
  },
  handler: index
});
```

`jsonContent()` and `createRoute()` belong to the Hono/Express facade. On Fastify, put the Zod schema directly in `schema.body`, `schema.params`, `schema.querystring`, and `schema.response`. See [OpenAPI](./openapi) for the config and UI options.

## Rate limiting

`@fastify/rate-limit` runs globally with an in-memory store, matching Express. Infrastructure paths (`/health`, `/ready`, `/live`, `/metrics`, `/api-docs`, `/doc`, `/queues`, `/storage`, `/socket.io`) are skipped.

Apply the login limiter per route with `config.rateLimit`:

```ts
app.route({
  method: "POST",
  url: "/login",
  schema: { body: LoginSchema },
  config: { rateLimit: loginLimiter },
  handler: login
});
```

See [Rate Limiter](./rate-limiter) for limits and configuration.

## File uploads

`upload()` and `fields()` are Fastify `preHandler`s backed by `@fastify/multipart`. They parse the request into memory and expose `request.upload` / `request.uploads`:

```ts
import { upload } from "@/framework/facade.js";

app.route({
  method: "POST",
  url: "/",
  preHandler: upload({ field: "file", maxSize: 2 * 1024 * 1024 }),
  handler: store
});

export const store = async (request: FastifyRequest, reply: FastifyReply) => {
  const file = request.upload!; // in-memory buffer
  const path = await storage.disk("public").putFile("uploads", file);
  return reply.code(200).send({ path, url: storage.disk("public").url(path) });
};
```

Upload rule violations become `422` errors before the handler runs. See [Upload](./support/upload).

## Queue dashboard

The Bull Board dashboard mounts through `@bull-board/fastify` at `QUEUE_UI` (default `/queues`). A scoped `onRequest` hook enforces the same email allowlist as the other engines. If Redis is down, the framework registers plain fallback routes so the dashboard path still answers instead of crashing boot.

## Static files and SPA fallback

`@fastify/static` serves `src/storage/app/public` under `/storage/` and the built UI from `public/`. The UI mount uses `wildcard: false`, so only real build files get a route; unknown `/api/*` paths fall through to the JSON 404 handler, while other `GET` paths fall back to `public/index.html` for client-side routing.

## Coexistence with Hono and Express

The shared framework files stay byte-identical across engines wherever the HTTP layer is not involved (database, queue, scheduler, storage, support, auth services). The Fastify-specific files are the HTTP bootstrap, cookies, sessions, static serving, rate limiter, security headers, upload, queue UI, and auth HTTP layer. When you change a shared file, apply the same change to all three template trees.
