# Rate Limiter

## Overview

The rate limiter protects your API from burst abuse and accidental flooding. It applies a **global rate limit** per session (or IP for anonymous visitors) and a **stricter login limiter** on public auth routes to mitigate brute-force attacks.

Both limiters use Redis when available and gracefully fall back to in-memory storage.

## Global Rate Limiter

Registered automatically in the HTTP middleware stack via `rateLimiterMiddleware`. Every request consumes from the same per-session/IP bucket:

```ts
// src/framework/http/app.ts — applied globally
app.use("*", rateLimiterMiddleware);
```

### Key generation

- Authenticated requests are keyed by `sessionId`.
- Anonymous requests fall back to the `x-forwarded-for` header.

## Login Limiter

The `loginLimiter` is applied to all public auth routes (`/register`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`, `/refresh-token`) in `src/modules/auth/routes/api.ts`:

```ts
const publicRoute = createRouter()
  .group(loginLimiter)
  .api(registerRoute, register)
  .api(loginRoute, login)
  // ...
```

It uses **IP-based** keying so a single IP cannot exceed the login limit regardless of how many sessions it opens.

## Changing Limits

### Via environment variables (recommended)

Set `RATE_LIMIT_MAX`, `RATE_LIMIT_LOGIN_MAX`, and `RATE_LIMIT_WINDOW_MS` in your `.env` file:

```env
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=500
RATE_LIMIT_LOGIN_MAX=10
```

The defaults are defined in `src/env.ts:43-45`.

### Per-route customization

To apply a different limit to a specific route group, create a new limiter in your route file:

```ts
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

### Source files

| File | What it controls |
|---|---|
| `src/framework/http/ratelimiter.ts` | Core limiter logic — lazy singleton, store selection, key generation |
| `src/framework/http/app.ts:45` | Where `rateLimiterMiddleware` is registered globally |
| `src/modules/auth/routes/api.ts:139` | Where `loginLimiter` is applied to public auth routes |
| `src/env.ts:43-45` | Environment variable defaults and Zod schema |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | `60000` (1 min) | Time window in milliseconds |
| `RATE_LIMIT_MAX` | `500` | Max requests per window (global) |
| `RATE_LIMIT_LOGIN_MAX` | `10` | Max login requests per window per IP |
| `REDIS` | `false` | Enable Redis for persistent rate limiting across restarts |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection string |
| `REDIS_PREFIX` | `nexgen` | Key prefix for namespacing |

## How It Works

When Redis is available (`REDIS=true`), limits are stored in Redis under keys prefixed with `{REDIS_PREFIX}:rl:`. This ensures limits survive server restarts and are consistent across multiple instances.

When Redis is unavailable, a `MemoryStore` is used instead — limits reset on server restart.

Both limiters send standard `RateLimit-*` headers (`draft-6` format) so clients can programmatically back off.
