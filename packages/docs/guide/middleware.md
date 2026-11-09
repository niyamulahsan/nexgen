# Middleware

Middleware is code that runs **before** a route handler. It reads the request, attaches data for the handler, or stops the request with a response.

All three engines expose the same middleware concept; only the function signature and the way you attach it differs. Hono and Express use the `group()` / route-array helpers, while Fastify uses **hooks** (`app.addHook("preHandler", …)`) and per-route `preHandler` options.

## Where middleware lives

| Kind | Location | Who writes it |
| --- | --- | --- |
| Global | `src/framework/http/app.ts` | The framework — applies CORS, sessions, security headers, logging and rate limiting to every request |
| Route-level | `src/middlewares/<name>-middleware.ts` | You |
| Framework route-level | `src/framework/http/*` | The framework — e.g. `loginLimiter` on the public auth routes |

The scaffold ships two in `src/middlewares/`:

| File | Export | Purpose |
| --- | --- | --- |
| `auth-middleware.ts` | `authMiddleware` | Authenticates the request and puts `auth` on the request |
| `role-middleware.ts` | `requireRole(...roles)` | Rejects the request unless `auth.role` is one of the allowed roles |

## Applying middleware

### Whole group

On Hono and Express, pass the middleware to `group()`:

```ts
export default group(authMiddleware)
  .api(listRoute, index)
  .api(showRoute, show);
```

Every route added after `group(...)` on that router runs the middleware.

On Fastify, a route file is already a plugin, so a scoped hook covers every route the plugin registers:

```ts
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { authMiddleware } from "@/middlewares/auth-middleware.js";

const routes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", authMiddleware);

  app.get("/", index);
  app.get("/:id", show);
};

export default routes;
```

Hooks are **encapsulated**: `app.addHook` applies to the plugin's own routes and any child plugins, not to sibling routes or the rest of the app. To gate a subset, register a nested plugin with `app.register(plugin, { prefix })` and add the hook inside it.

### Single route

Hono and Express take an array of middleware as the second argument:

```ts
export default group()
  .api(listRoute, index)
  .api(adminRoute, [authMiddleware, requireRole("admin")], remove);
```

The array runs left to right, before the handler.

Fastify takes a `preHandler` option per route:

```ts
app.route({
  method: "DELETE",
  url: "/:id",
  preHandler: [authMiddleware, requireRole("admin")],
  handler: remove,
});
```

### Independent groups in one file

Hono and Express keep group middleware scoped to the router that declared it. It is merged into each `api()` call rather than registered as a catch-all, so two groups mounted at the same prefix never share middleware:

```ts
const publicRoutes = createRouter().group(loginLimiter).api(loginRoute, login);
const protectedRoutes = createRouter().group(authMiddleware).api(meRoute, me);

// /auth/login runs only the limiter; /auth/me runs only auth.
export default createRouter().route("/", publicRoutes).route("/", protectedRoutes);
```

On Fastify the same split is two nested plugins, each with its own hook:

```ts
app.register(async (publicRoutes) => {
  publicRoutes.addHook("preHandler", loginLimiter);
  publicRoutes.post("/login", login);
});

app.register(async (protectedRoutes) => {
  protectedRoutes.addHook("preHandler", authMiddleware);
  protectedRoutes.get("/me", me);
});
```

### Order matters

Middleware runs in the order you list it. On Hono and Express each one must call `next()` to continue; a middleware that sends a response and does not call `next()` ends the chain. On Fastify a hook **returns nothing** to continue, or **returns a reply** to stop:

```ts
// authMiddleware runs first, so requireRole can read what it wrote.
app.route({ ..., preHandler: [authMiddleware, requireRole("admin")], handler: remove });
```

Reversing that array returns `401` from `requireRole` on every request, because `auth` was never set.

## Writing middleware

Generate the file and fill in the body:

::: code-group

```bash [npm]
npm run maker middleware:make request-id
```

```bash [pnpm]
pnpm maker middleware:make request-id
```

```bash [yarn]
yarn maker middleware:make request-id
```

```bash [bun]
bun maker middleware:make request-id
```

:::

This writes `src/middlewares/request-id-middleware.ts` exporting `requestIdMiddleware`. The name you pass is used verbatim as the file prefix and camel-cased for the export.

::: code-group

```ts [Hono]
// src/middlewares/request-id-middleware.ts
import type { Context, Next } from "hono";

export async function requestIdMiddleware(c: Context, next: Next) {
  c.set("requestId", crypto.randomUUID());
  return await next();
}
```

```ts [Express]
// src/middlewares/request-id-middleware.ts
import type { NextFunction, Request, Response } from "express";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.locals.requestId = crypto.randomUUID();
  return next();
}
```

```ts [Fastify]
// src/middlewares/request-id-middleware.ts
import type { FastifyReply, FastifyRequest } from "fastify";

export async function requestIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  (request as FastifyRequest & { requestId: string }).requestId =
    crypto.randomUUID();
  // Return nothing to continue the chain.
}
```

:::

Rules that hold on every engine:

- Continue **exactly once**. On Hono/Express call `next()` once and never leave it uncalled by accident. On Fastify return normally once; do not return a reply and then keep running.
- Await `next()` on Hono. Without the `await`, the handler can finish after your middleware already returned.
- Do not write a response after `next()` — the handler owns the response by then.
- A thrown error reaches the application error handler and becomes a `500`, unless the error carries its own status.

### Generated stub

The CLI writes a documented stub, not an empty function. On Hono the stub is:

```ts
export async function requestIdMiddleware(c: Context, next: Next) {
  return await next();
}
```

On Fastify it is a plain `(request, reply)` hook that returns nothing:

```ts
import type { FastifyReply, FastifyRequest } from "fastify";

export async function requestIdMiddleware(
  _request: FastifyRequest,
  _reply: FastifyReply,
) {
  // Guard the request here; send a reply to stop, or return to continue.
}
```

Its comment block repeats where to attach it — `group(requestIdMiddleware)` / `.api(route, [requestIdMiddleware], handler)` on Hono and Express, or `app.addHook("preHandler", requestIdMiddleware)` / `preHandler: requestIdMiddleware` on Fastify. That is useful when you come back to it later.

## Sharing data with handlers

A middleware writes to the request; the handler reads it back.

::: code-group

```ts [Hono]
// middleware
c.set("tenantId", 42);

// handler
const tenantId = c.get("tenantId");
```

```ts [Express]
// middleware
res.locals.tenantId = 42;

// handler
const tenantId = res.locals.tenantId;
```

```ts [Fastify]
// middleware
request.tenantId = 42;

// handler
const { tenantId } = request;
```

:::

Values are untyped, so type them at the point you read them. On Fastify, declare extra request fields once in `src/framework/http/fastify.d.ts`:

```ts
declare module "fastify" {
  interface FastifyRequest {
    tenantId?: number;
  }
}
```

The framework sets these for you:

| Key | Hono / Express | Fastify | Set by | Contents |
| --- | --- | --- | --- | --- |
| `auth` | `c.get("auth")` / `res.locals.auth` | `request.auth` | `authMiddleware` | The object your auth provider returns — `id`, `email`, `role`, plus any extra fields |
| `sessionId` | `c.get("sessionId")` / `res.locals.sessionId` | `request.sessionId` | `sessionMiddleware` | Guest/user session id (see [Session](./session)) |
| `requestId` | `c.get("requestId")` / `res.locals.requestId` | `request.requestId` | `loggerMiddleware` | Per-request id, useful in logs |

`res.locals`, the Hono context and the Fastify request are all per request, so values are never shared between requests.

## Built-in middleware

### Global

Applied by the framework in `src/framework/http/app.ts`, so every request runs them:

| Middleware | Purpose |
| --- | --- |
| `corsMiddleware` / `@fastify/cors` | CORS headers |
| `sessionMiddleware` / `@fastify/cookie` + session hook | Session cookie + id |
| `securityMiddleware` / Fastify `onRequest` hook | Security headers |
| inline request counter | Increments the counters exposed at `/metrics` |
| `loggerMiddleware` | Request logging (when `loggingConfig.httpRequests` is true in `config/logging.ts`) |
| `rateLimiterMiddleware` / `@fastify/rate-limit` | Global rate limiting |
| `storageStaticMiddleware` / `@fastify/static` | Serves `storage/` (mounted at `/storage`) |

You do not apply these to routes, and you should not re-apply them. On Fastify they are registered as plugins and hooks in order, before your route plugins, so `request.cookies` is parsed by the time your hooks run.

### Route-level

These are applied per route or per group, by you:

| Middleware | Applies to | Purpose |
| --- | --- | --- |
| `authMiddleware` | All engines | Authenticates the request, sets `auth`, refreshes an expired access token |
| `requireRole(...roles)` | All engines | `403` unless `auth.role` matches one of the roles |
| `upload({ field })` / `fields(...)` | Express and Fastify | Multipart parsing into `req.file` / `req.files` (Express) or `request.upload` / `request.uploads` (Fastify) |

`loginLimiter` is also route-level, but the framework applies it to the public auth routes for you. See [Rate Limiter](./rate-limiter) to tune or replace it.

## Auth middleware

`authMiddleware` reads the access cookie, verifies it, loads the user through the auth provider and sets `auth`. If the access token is missing or expired, it tries the refresh cookie, mints a new access token and continues.

```ts
import { authMiddleware } from "@/middlewares/auth-middleware.js";

// Hono / Express
export default group(authMiddleware).api(meRoute, me);

// Fastify
app.addHook("preHandler", authMiddleware);
app.get("/me", me);
```

Three outcomes to know about:

- **Authenticated request** — handler reads `auth`.
- **No valid token** — `401`, and the cookies are cleared.
- **No auth provider at all** — the middleware logs a warning and continues unauthenticated. That is a degraded "don't crash the app" fallback, not authentication: your handler must still handle a missing `auth`.

The full flow, the provider contract and how to replace the built-in auth are in [Authentication](./auth).

## Role middleware

`requireRole()` runs **after** `authMiddleware`; it authorises what authentication allowed through.

```ts
import { requireRole } from "@/middlewares/role-middleware.js";

// Hono / Express
.api(adminRoute, [authMiddleware, requireRole("admin")], remove)
.api(editorRoute, [authMiddleware, requireRole("admin", "editor")], update)

// Fastify
app.route({ ..., preHandler: [authMiddleware, requireRole("admin")], handler: remove });
```

| Situation | Response |
| --- | --- |
| `auth` is missing | `401 Unauthorized` |
| `auth.role` is not in the list | `403 Forbidden` |
| `auth.role` matches | Continues to the handler |

Roles are compared case-insensitively, and `auth.role` must be a **string**. If your provider's `getAuthContext()` returns a role object (`{ id, name }`), `requireRole` will not match it — flatten it to a string in the provider.

See [Authentication → Roles](./auth#roles) for the role model and the seeded values.

## Testing middleware

A middleware is a plain function, so test it directly with a fake request instead of booting the server.

::: code-group

```ts [Hono]
const next = vi.fn();
await requestIdMiddleware({ set: vi.fn() } as any, next);
expect(next).toHaveBeenCalledOnce();
```

```ts [Express]
const next = vi.fn();
requestIdMiddleware({} as any, { locals: {} } as any, next);
expect(next).toHaveBeenCalledOnce();
```

```ts [Fastify]
const request = {} as any;
const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() } as any;
await requestIdMiddleware(request, reply);
expect(reply.send).not.toHaveBeenCalled();
```

:::

For the auth pair, set `res.locals.auth` (Express), stub `c.get("auth")` (Hono) or set `request.auth` (Fastify) and assert the status. See [Unit Testing](./testing) for the test runner setup.

## Related

- [Routing → Middleware](./routing#middleware) — the short version and route syntax.
- [Fastify](./fastify) — hooks, route scopes and native plugins.
- [Authentication](./auth) — `authMiddleware`, roles, tokens, providers.
- [Rate Limiter](./rate-limiter) — global and login limits.
- [Middleware Commands](../cli/middleware) — `middleware:make` and `module:make-middleware`.
