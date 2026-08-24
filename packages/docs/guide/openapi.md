# OpenAPI

nexgen has built-in OpenAPI 3.0 support powered by `@hono/zod-openapi` and `stoker`. When enabled, your routes automatically generate an interactive API documentation UI at `/api-docs` using Scalar.

## Enable / Disable

Set `OPEN_API` in `.env`:

```bash
OPEN_API=true   # /api-docs + /doc enabled
OPEN_API=false  # bare API, no docs endpoints
```

Routes still work when disabled — only the documentation endpoints are removed.

## Endpoints

| Endpoint | Description |
|---|---|
| `/api-docs` | Scalar interactive API docs UI (moon theme) |
| `/doc` | OpenAPI 3.0.0 JSON spec |

## How It Works

When `OPEN_API=true`, the framework creates an `OpenAPIHono` router instead of a plain Hono router. Every route registered via `.api()` is documented automatically:

```ts
import { createRoute, z } from "@hono/zod-openapi";
import { HttpStatusCodes, jsonContent, group } from "@/framework/facade.js";

const listRoute = createRoute({
  path: "/",
  method: "get",
  tags: ["Posts"],
  summary: "List all posts",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(z.array(PostSchema), "list of posts"),
  },
});

export default group().api(listRoute, async (c) => {
  const posts = await db.query.posts.findMany();
  return c.json(posts);
});
```

This route appears in the Scalar UI at `/api-docs` with full request/response schemas.

## Without OpenAPI

When `OPEN_API=false`, use plain verb methods:

```ts
import { group } from "@/framework/facade.js";

export default group()
  .get("/", index)
  .get("/:id", show)
  .post("/", store)
  .put("/:id", update)
  .delete("/:id", destroy);
```

No documentation is generated, but the routes still work exactly the same way.

## Defining Schemas

Schemas are Zod objects with `.openapi()` metadata for docs:

```ts
import { z } from "@hono/zod-openapi";

export const PostSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  title: z.string().min(1).openapi({ example: "Hello World" }),
  body: z.string().optional(),
  createdAt: z.string().openapi({ example: "2024-01-15T08:30:00.000Z" }),
}).openapi("Post");

export const CreatePostSchema = z.object({
  title: z.string().min(1).openapi({ example: "New Post" }),
  body: z.string().optional(),
});
```

## Defining Routes

Each route specifies path, method, tags, request schemas, and response schemas:

```ts
import { createRoute, z } from "@hono/zod-openapi";
import { HttpStatusCodes, jsonContent } from "@/framework/facade.js";

// List route
const listRoute = createRoute({
  path: "/",
  method: "get",
  tags: ["Posts"],
  summary: "List all posts",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(z.array(PostSchema), "list of posts"),
  },
});

// Show route
const showRoute = createRoute({
  path: "/{id}",
  method: "get",
  tags: ["Posts"],
  summary: "Get a post by ID",
  request: {
    params: z.object({
      id: z.coerce.number().openapi({ example: 1 }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(PostSchema, "post details"),
    [HttpStatusCodes.NOT_FOUND]: {
      description: "Post not found",
    },
  },
});

// Store route
const storeRoute = createRoute({
  path: "/",
  method: "post",
  tags: ["Posts"],
  summary: "Create a new post",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreatePostSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(PostSchema, "created post"),
  },
});
```

## Registering Routes

Use `.api()` on the group to register OpenAPI-documented routes:

```ts
export default group()
  .api(listRoute, index)
  .api(showRoute, show)
  .api(storeRoute, store);
```

## Per-Route Middleware

Apply middleware to specific routes:

```ts
import { group } from "@/framework/facade.js";
import { authMiddleware } from "@/middlewares/auth-middleware.js";
import { requireRole } from "@/middlewares/role-middleware.js";

export default group(authMiddleware)
  .api(listRoute, index)
  .api(showRoute, [requireRole("admin")], show);
```

## Request Validation

With OpenAPI enabled, request validation is automatic. The handler receives typed, validated data:

```ts
export const store = async (c) => {
  const body = c.req.valid("json"); // validated against CreatePostSchema
  // body is typed — no manual validation needed
};
```

Without OpenAPI, use the `validate()` helper manually:

```ts
import { validate } from "@/framework/facade.js";

export const store = async (c) => {
  const body = await validate(CreatePostSchema, await c.req.json());
};
```

## Health Endpoint

The `/health` endpoint is also documented when OpenAPI is enabled:

```json
{
  "message": "Application is healthy"
}
```

## Customizing the API Info

Edit `src/config/openapi.ts` to change the API title, version, description, or Scalar UI settings:

```ts
// src/config/openapi.ts
export const openApiConfig = {
  version: "3.0.0",
  title: "My API",
  apiVersion: "1.0.0",
  description: "Description of your API",

  scalar: {
    specUrl: "/doc",
    docsPath: "/api-docs",  // change this to rename the docs URL
    layout: "classic",   // "classic" or "modern"
    theme: "moon",       // "default" | "moon" | "purple" | "solarized" | "bluePlanet" | "fastify" | "kepler" | "mars" | "nebula" | "none"
    pageTitle: "My API Documentation",
    defaultHttpClient: {
      targetKey: "js",
      clientKey: "fetch",
    },
    defaultOpenAllTags: true,
  },
} as const;
```

The framework reads this config automatically — no code changes needed.

## Toggling in Deploy

The `OPEN_API` flag is carried into deploy environments. `deploy:init` reads it from your `.env` and writes it into `deploy/.env.example`:

```bash
# deploy/.env.example
OPEN_API=false  # set to true in development, false in production
```
