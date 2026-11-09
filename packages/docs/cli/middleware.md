# Middleware Commands

Generate and manage middleware — the cross-cutting logic (auth, rate limiting, audit logging) that runs before route handlers.

## Requirements

Middleware lives in `src/middlewares/*.ts` and is applied to route groups or individual routes:

```ts
import { authMiddleware } from "@/middlewares/auth-middleware.js";

// Hono / Express — group-wide (everything after group())
export default createRouter()
  .group(authMiddleware)
  .api(usersIndexRoute, usersIndex);

// Hono / Express — per-route
export default createRouter().api(
  userDestroyRoute,
  [authMiddleware, requireRole("admin")],
  userDestroy,
);
```

```ts
// Fastify — scoped hook and per-route preHandler
app.addHook("preHandler", authMiddleware);
app.route({ ..., preHandler: [authMiddleware, requireRole("admin")], handler: userDestroy });
```

See [Middleware](/guide/middleware) for the full middleware API.

## `middleware:make <name>`

Generate a middleware file at `src/middlewares/<name>-middleware.ts`. The generated file exports a `<camelName>Middleware` function ready to attach:

- `middleware:make rate-limit` → `src/middlewares/rate-limit-middleware.ts` exporting `rateLimitMiddleware`
- `middleware:make auth-check` → `src/middlewares/auth-check-middleware.ts` exporting `authCheckMiddleware`

::: code-group

```bash [npm]
npm run maker middleware:make rate-limit
npm run maker middleware:make rate-limit -- --force
```

```bash [pnpm]
pnpm maker middleware:make rate-limit
pnpm maker middleware:make rate-limit --force
```

```bash [yarn]
yarn maker middleware:make rate-limit
yarn maker middleware:make rate-limit --force
```

```bash [bun]
bun maker middleware:make rate-limit
bun maker middleware:make rate-limit --force
```

:::

| Option      | Alias   | Description                                                       |
| ----------- | ------- | ----------------------------------------------------------------- |
| `--force`   | `--yes` | Overwrite an existing middleware file (fails otherwise)           |
| `--dry-run` | —       | Validate the name and print what would be created without writing |

### Generated output

The file uses your engine's middleware signature — fill in the checks, then `next()` (Express) / `return await next()` (Hono) / return normally (Fastify) to continue:

::: code-group

```ts [Hono]
// src/middlewares/rate-limit-middleware.ts
import type { Context, Next } from "hono";
import { db } from "@/framework/facade.js";

/**
 * Why: Runs before route handlers to enforce cross-cutting rules for rate-limit.
 * When: Attach to a route group or a specific route.
 * Where: Add it to a group: group(rateLimitMiddleware), or per route:
 *        .api(route, [rateLimitMiddleware], handler)
 * How: c.get("auth") is populated when authMiddleware ran first; db gives
 *      typed access to your module models. Await next() to continue.
 */
export async function rateLimitMiddleware(c: Context, next: Next) {
  return await next();
}
```

```ts [Express]
// src/middlewares/rate-limit-middleware.ts
import type { NextFunction, Request, Response } from "express";
import { db } from "@/framework/facade.js";

/**
 * Why: Runs before route handlers to enforce cross-cutting rules for rate-limit.
 * When: Attach to a route group or a specific route.
 * Where: Add it to a group: group(rateLimitMiddleware), or per route:
 *        .api(route, [rateLimitMiddleware], handler)
 * How: res.locals.auth is populated when authMiddleware ran first; db gives
 *      typed access to your module models. Call next() to continue.
 */
export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  return next();
}
```

```ts [Fastify]
// src/middlewares/rate-limit-middleware.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "@/framework/facade.js";

/**
 * Why: Runs before route handlers to enforce cross-cutting rules for rate-limit.
 * When: Attach to a route scope or a specific route.
 * Where: Add it globally: app.addHook("preHandler", rateLimitMiddleware), or per route:
 *        app.route({ ..., preHandler: rateLimitMiddleware, handler })
 * How: request.auth is populated when authMiddleware ran first; db gives
 *      typed access to your module models. Return nothing to continue, or
 *      return a reply to stop the request.
 */
export async function rateLimitMiddleware(
  _request: FastifyRequest,
  _reply: FastifyReply,
) {
  // Guard the request here; send a reply to stop, or return to continue.
}
```

:::

Middleware shares state between handlers via the request context — `c.set`/`c.get` on Hono, `res.locals` on Express, and the extended `request` on Fastify. The generated stub's doc comment notes which fields `authMiddleware` already populated.
