# Middleware

Middleware is code that runs **before** a route handler. It reads the request, attaches data for the handler, or stops the request with a response.

Both engines expose the same middleware API on routes; only the function signature differs.

## Where middleware lives

| Kind | Location | Who writes it |
| --- | --- | --- |
| Global | `src/framework/http/app.ts` | The framework — applies CORS, sessions, security headers, logging and rate limiting to every request |
| Route-level | `src/middlewares/<name>-middleware.ts` | You |
| Framework route-level | `src/framework/http/*` | The framework — e.g. `loginLimiter` on the public auth routes |

The scaffold ships two in `src/middlewares/`:

| File | Export | Purpose |
| --- | --- | --- |
| `auth-middleware.ts` | `authMiddleware` | Authenticates the request and puts `auth` on the context |
| `role-middleware.ts` | `requireRole(...roles)` | Rejects the request unless `auth.role` is one of the allowed roles |

## Applying middleware

Two forms, identical on both engines.

### Whole group

```ts
export default group(authMiddleware)
  .api(listRoute, index)
  .api(showRoute, show);
```

Every route added after `group(...)` on that router runs the middleware.

### Single route

```ts
export default group()
  .api(listRoute, index)
  .api(adminRoute, [authMiddleware, requireRole("admin")], remove);
```

The second argument is an array of middleware. It runs left to right, before the handler.

### Independent groups in one file

Group middleware is scoped to the router that declared it. It is merged into each `api()` call rather than registered as a catch-all, so two groups mounted at the same prefix never share middleware:

```ts
const publicRoutes = createRouter().group(loginLimiter).api(loginRoute, login);
const protectedRoutes = createRouter().group(authMiddleware).api(meRoute, me);

// /auth/login runs only the limiter; /auth/me runs only auth.
export default createRouter().route("/", publicRoutes).route("/", protectedRoutes);
```

### Order matters

Middleware runs in the order you list it. Each one must call `next()` to continue; a middleware that sends a response and does not call `next()` ends the chain, and neither the remaining middleware nor the handler runs.

```ts
// authMiddleware runs first, so requireRole can read what it wrote.
.api(adminRoute, [authMiddleware, requireRole("admin")], remove)
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

:::

Rules that hold on both engines:

- Call `next()` exactly once. Never call it twice, and never leave it uncalled by accident.
- Await `next()` on Hono. Without the `await`, the handler can finish after your middleware already returned.
- Do not write a response after `next()` — the handler owns the response by then.
- A thrown error reaches the application error handler (`onError` in both engines) and becomes a `500`, unless the error carries its own status.

### Generated stub

The CLI writes a documented stub, not an empty function:

```ts
export async function requestIdMiddleware(c: Context, next: Next) {
  return await next();
}
```

Its comment block repeats where to attach it (`group(requestIdMiddleware)` or `.api(route, [requestIdMiddleware], handler)`), which is useful when you come back to it later.

## Sharing data with handlers

A middleware writes to the request context; the handler reads it back. The key is a plain string on both engines.

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

:::

Values are untyped, so type them at the point you read them:

```ts
type AuthContext = { id: number | string; email: string; role?: string | null };

const auth = c.get("auth") as AuthContext | undefined;
```

The framework sets three keys for you:

| Key | Set by | Contents |
| --- | --- | --- |
| `auth` | `authMiddleware` | The object your auth provider returns — `id`, `email`, `role`, plus any extra fields |
| `sessionId` | `sessionMiddleware` | Guest/user session id (see [Session](./session)) |
| `requestId` | `loggerMiddleware` | Per-request id, useful in logs |

`res.locals` is per response, so it is never shared between requests. On Hono the context is per request in the same way.

## Built-in middleware

### Global

Applied by the framework in `src/framework/http/app.ts`, so every request runs them:

| Middleware | Purpose |
| --- | --- |
| `corsMiddleware` | CORS headers |
| `sessionMiddleware` | Session cookie + id |
| `securityMiddleware` | Security headers |
| `loggerMiddleware` | Request logging (when `loggingConfig.httpRequests` is true in `config/logging.ts`) |
| `rateLimiterMiddleware` | Global rate limiting |
| `storageStaticMiddleware` | Serves `storage/` (Express: mounted at `/storage`) |

You do not apply these to routes, and you should not re-apply them.

### Route-level

These are applied per route or per group, by you:

| Middleware | Applies to | Purpose |
| --- | --- | --- |
| `authMiddleware` | Both engines | Authenticates the request, sets `auth`, refreshes an expired access token |
| `requireRole(...roles)` | Both engines | `403` unless `auth.role` matches one of the roles |
| `upload({ field })` / `fields(...)` | Express only | Multipart parsing into `req.file` / `req.files` |

`loginLimiter` is also route-level, but the framework applies it to the public auth routes for you. See [Rate Limiter](./rate-limiter) to tune or replace it.

## Auth middleware

`authMiddleware` reads the access cookie, verifies it, loads the user through the auth provider and sets `auth`. If the access token is missing or expired, it tries the refresh cookie, mints a new access token and continues.

```ts
import { authMiddleware } from "@/middlewares/auth-middleware.js";

export default group(authMiddleware).api(meRoute, me);
```

Two outcomes to know about:

- **Authenticated request** — handler reads `auth`.
- **No valid token** — `401`, and the cookies are cleared.
- **No auth provider at all** — the middleware logs a warning and calls `next()` unauthenticated. That is a degraded "don't crash the app" fallback, not authentication: your handler must still handle a missing `auth`.

The full flow, the provider contract and how to replace the built-in auth are in [Authentication](./auth).

## Role middleware

`requireRole()` runs **after** `authMiddleware`; it authorises what authentication allowed through.

```ts
import { requireRole } from "@/middlewares/role-middleware.js";

.api(adminRoute, [authMiddleware, requireRole("admin")], remove)
.api(editorRoute, [authMiddleware, requireRole("admin", "editor")], update)
```

| Situation | Response |
| --- | --- |
| `auth` is missing | `401 Unauthorized` |
| `auth.role` is not in the list | `403 Forbidden` |
| `auth.role` matches | Continues to the handler |

Roles are compared case-insensitively, and `auth.role` must be a **string**. If your provider's `getAuthContext()` returns a role object (`{ id, name }`), `requireRole` will not match it — flatten it to a string in the provider.

See [Authentication → Roles](./auth#roles) for the role model and the seeded values.

## Testing middleware

A middleware is a plain function, so test it directly with a fake context instead of booting the server:

```ts
const next = vi.fn();
await requestIdMiddleware({ set: vi.fn() } as any, next);
expect(next).toHaveBeenCalledOnce();
```

For the auth pair, set `res.locals.auth` (Express) or stub `c.get("auth")` (Hono) and assert the status. See [Unit Testing](./testing) for the test runner setup.

## Related

- [Routing → Middleware](./routing#middleware) — the short version and route syntax.
- [Authentication](./auth) — `authMiddleware`, roles, tokens, providers.
- [Rate Limiter](./rate-limiter) — global and login limits.
- [Middleware Commands](../cli/middleware) — `middleware:make` and `module:make-middleware`.
