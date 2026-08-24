# Routing

nexgen uses **Hono** for API routing with automatic route discovery. Routes are defined per module and auto-registered at startup.

## Basic Route

Every route file exports a `group()` that collects route handlers:

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
  responses: {
    [HttpStatusCodes.OK]: jsonContent(z.array(PostSchema), "list"),
  },
});

export default group().api(listRoute, (c) =>
  c.json([{ id: 1, title: "Hello" }]),
);
```

## Route Groups

Use `group()` to organize routes into logical groups with shared middleware:

```ts
import { group } from "@/framework/facade.js";

// Public routes (no auth required)
const publicGroup = group().api(registerRoute, register).api(loginRoute, login);

// Protected routes (auth middleware applied)
const protectedGroup = group(authMiddleware)
  .api(listRoute, index)
  .api(showRoute, show);
```

## OpenAPI Mode

When `OPEN_API=true`, routes use `createRoute()` with `.api()` for full OpenAPI documentation at `/api-docs`:

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

When `OPEN_API=false`, routes use plain verb methods without metadata:

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

Apply middleware per-route or per-group:

```ts
import { group } from "@/framework/facade.js";
import { authMiddleware } from "@/middlewares/auth-middleware.js";
import { requireRole } from "@/middlewares/role-middleware.js";

export default group(authMiddleware) // all routes require auth
  .api(listRoute, index)
  .api(showRoute, [requireRole("admin")], show); // only admin role
```

## Built-in Middleware

The framework applies these globally in `src/framework/http/app.ts`:

| Middleware              | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| `corsMiddleware`        | CORS headers                             |
| `sessionMiddleware`     | Session cookie + ID                      |
| `rateLimiterMiddleware` | Global rate limiting                     |
| `loggerMiddleware`      | Request logging (when `loggingConfig.httpRequests` is true in `config/logging.ts`) |

## Request Validation

With OpenAPI enabled, validation is automatic via route schemas:

```ts
// Controller receives validated data
export const store: Handler = async (c) => {
  const body = c.req.valid("json"); // validated against CreateSchema
  // body is typed — no manual validation needed
};
```

Without OpenAPI, use the `validate()` helper:

```ts
import { validate } from "@/framework/facade.js";

export const store: Handler = async (c) => {
  const body = await validate(CreatePostSchema, await c.req.json());
};
```

## Frontend Routes

Frontend routing uses Vue Router and is defined in `src/resources/src/router/`. See [Frontend > Router](/guide/resources/router) for details.
