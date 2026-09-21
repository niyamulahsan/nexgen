# Middleware Commands

Generate and manage middleware — the cross-cutting logic (auth, rate limiting, audit logging) that runs before route handlers.

## Requirements

Middleware lives in `src/middlewares/*.ts` and is applied to route groups or individual routes:

```ts
import { authMiddleware } from "@/middlewares/auth-middleware.js";

// Group-wide (everything after group())
export default createRouter()
  .group(authMiddleware)
  .api(usersIndexRoute, usersIndex);

// Per-route
export default createRouter().api(userDestroyRoute, [authMiddleware, requireRole("admin")], userDestroy);
```

See [Routing > Middleware](./../guide/routing) for the full middleware API.

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

| Option | Alias | Description |
| --- | --- | --- |
| `--force` | `--yes` | Overwrite an existing middleware file (fails otherwise) |
| `--dry-run` | — | Validate the name and print what would be created without writing |

### Generated output

The file uses your engine's middleware signature — fill in the checks, then `next()` (Express) / `return await next()` (Hono) to continue:

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
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  return next();
}
```

:::

Middleware shares state between handlers via the request context — `c.set`/`c.get` on Hono, `res.locals` on Express. The generated stub's doc comment notes which fields `authMiddleware` already populated.