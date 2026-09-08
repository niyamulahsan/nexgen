# `createRoute` — declare an OpenAPI route

Imported from the facade: `import { createRoute, z, jsonContent, HttpStatusCodes } from "@/framework/facade.js"`.

Declares a fully documented route — path, method, tags, request (`params`/`query`/`body`) and response schemas — that `createRouter().api()` mounts and the OpenAPI spec renders. See [Routing](./../guide/routing) and [OpenAPI](./../guide/openapi).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `createRoute` | `(args: RouteConfig) => RouteConfig` | Declare an OpenAPI route with request/response schemas |

## Use cases

### Basic route

```ts
import { createRoute, group, HttpStatusCodes, jsonContent, z } from "@/framework/facade.js";

const listRoute = createRoute({
  path: "/",
  method: "get",
  tags: ["Posts"],
  summary: "List all posts",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(z.array(PostSchema), "list of posts"),
  },
});

export default group().api(listRoute, async (c) => c.json(await listPosts()));
```

### Request bodies & params

```ts
const storeRoute = createRoute({
  path: "/",
  method: "post",
  tags: ["Posts"],
  request: { body: jsonContent(CreatePostSchema, "post data") },
  responses: { [HttpStatusCodes.CREATED]: jsonContent(PostSchema, "created post") },
});

const showRoute = createRoute({
  path: "/{id}",
  method: "get",
  tags: ["Posts"],
  request: { params: z.object({ id: z.coerce.number().openapi({ example: 1 }) }) },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(PostSchema, "post details"),
    [HttpStatusCodes.NOT_FOUND]: { description: "Post not found" },
  },
});
```

### Real world — the auth router

```ts
// modules/auth/routes/api.ts
const loginRoute = createRoute({
  path: "/login",
  method: "post",
  tags: ["Auth"],
  request: { body: jsonContent(LoginSchema, "Login payload") },
  responses: { [HttpStatusCodes.OK]: jsonContent(AuthResponseSchema, "Logged in") },
});
```

## Notes

- `createRoute` is re-exported from `@hono/zod-openapi` and pairs with the facade's `z` (see [z](./z) for `.openapi()`).
- Requires `OPEN_API=true` to drive the Scalar UI at `/api-docs`.
- Mount it with `createRouter().api(route, handler)` or `group().api(route, handler)` — see [createRouter](./createRouter).