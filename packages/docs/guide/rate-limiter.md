# Rate Limiter

## Overview

The rate limiter protects your API from burst abuse and accidental flooding. It applies a **global rate limit** and a **stricter login limiter** on public auth routes to mitigate brute-force attacks.

The key and store differ per engine:

| Engine  | Global limiter                                 | Key                                                    | Store                                |
| ------- | ---------------------------------------------- | ------------------------------------------------------ | ------------------------------------ |
| Hono    | `rateLimiterMiddleware`                        | `sessionId` when authenticated, else `x-forwarded-for` | Redis when available, else in-memory |
| Express | `rateLimiterMiddleware` (`express-rate-limit`) | IP                                                     | in-memory                            |
| Fastify | `@fastify/rate-limit`                          | IP                                                     | in-memory                            |

## Global Rate Limiter

Registered automatically during HTTP setup. Every request consumes from the same per-session/IP bucket:

::: code-group

```ts [Hono / Express]
// src/framework/http/app.ts — applied globally
app.use("*", rateLimiterMiddleware);
```

```ts [Fastify]
// src/framework/http/ratelimiter.ts
app.register(rateLimit, {
  global: true,
  max: rateLimitConfig.maxRequests,
  timeWindow: rateLimitConfig.windowMs,
  enableDraftSpec: true,
  allowList: (request) => isInfrastructurePath(request.url.split("?")[0]),
});
```

:::

### Key generation

- **Hono** — authenticated requests are keyed by `sessionId`; anonymous requests fall back to the `x-forwarded-for` header.
- **Express** — requests are keyed by IP (`req.ip`, honoring trust proxy) via `express-rate-limit`.
- **Fastify** — requests are keyed by IP through `@fastify/rate-limit`. Infrastructure paths (`/health`, `/ready`, `/live`, `/metrics`, `/api-docs`, `/doc`, `/queues`, `/storage`, `/socket.io`) are allow-listed.

## Login Limiter

The `loginLimiter` is applied to all public auth routes (`/register`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`, `/refresh-token`). Import it from `@/framework/facade.js`.

On Hono and Express it is a group middleware:

```ts
const publicRoute = createRouter()
  .group(loginLimiter)
  .api(registerRoute, register)
  .api(loginRoute, login);
// ...
```

On Fastify it is a per-route `config.rateLimit`:

```ts
app.route({
  method: "POST",
  url: "/login",
  schema: { body: LoginSchema },
  config: { rateLimit: loginLimiter },
  handler: login,
});
```

It uses **IP-based** keying so a single IP cannot exceed the login limit regardless of how many sessions it opens.

## Changing Limits

### Via config file (recommended)

Edit `src/config/rateLimit.ts`:

```ts
export const rateLimitConfig = {
  windowMs: 60000, // 1 minute window
  maxRequests: 500, // per window (global)
  loginMaxRequests: 60, // per window (login, per IP)
  keyPrefix: `${redisConfig.prefix}:rl`,
};
```

### Per-route customization

To apply a different limit to a specific route group, create a new limiter in your route file or middleware file:

::: code-group

```ts [Hono]
import { rateLimiter, MemoryStore } from "hono-rate-limiter";

const uploadLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 20,
  keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "unknown",
  store: new MemoryStore(),
  standardHeaders: "draft-6",
});

router.post("/upload", uploadLimiter, uploadHandler);
```

```ts [Express]
import { rateLimit } from "express-rate-limit";

const uploadLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-7",
});

router.post("/upload", uploadLimiter, uploadHandler);
```

```ts [Fastify]
const uploadLimiter = { max: 20, timeWindow: 60_000 };

app.route({
  method: "POST",
  url: "/upload",
  config: { rateLimit: uploadLimiter },
  handler: uploadHandler,
});
```

:::

### Source files

| File                                | What it controls                                                |
| ----------------------------------- | --------------------------------------------------------------- |
| `src/config/rateLimit.ts`           | Rate limit settings (window, max, login max)                    |
| `src/framework/http/ratelimiter.ts` | Core limiter logic — store selection, key generation, skip list |
| `src/framework/http/app.ts`         | Where the limiter is registered globally                        |
| `src/modules/auth/routes/index.ts`  | Where `loginLimiter` is applied to public auth routes           |

## Environment Variables

| Variable       | Default                  | Description                                               |
| -------------- | ------------------------ | --------------------------------------------------------- |
| `REDIS`        | `false`                  | Enable Redis for persistent rate limiting across restarts |
| `REDIS_URL`    | `redis://127.0.0.1:6379` | Redis connection string                                   |
| `REDIS_PREFIX` | `nexwire`                | Key prefix for namespacing                                |

## How It Works

When Redis is available (`REDIS=true`), the **Hono** engine stores limits in Redis under keys prefixed with `{REDIS_PREFIX}:rl:`. This ensures limits survive server restarts and are consistent across multiple instances.

When Redis is unavailable (Hono) — or on the `express-rate-limit` / `@fastify/rate-limit` memory stores (Express/Fastify) — limits reset on server restart.

The limiters send standard `RateLimit-*` headers so clients can programmatically back off.
