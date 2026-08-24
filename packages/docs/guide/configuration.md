# Configuration

All subsystem settings live in `src/config/`. Each file exports a typed config object that reads from environment variables and provides sensible defaults.

```
src/config/
├── index.ts          # Aggregated config barrel
├── app.ts            # App name, port, URL, feature flags
├── auth.ts           # Email verification toggle
├── cache.ts          # Cache TTL and key prefix
├── cookie.ts         # Cookie name and secret
├── cors.ts           # CORS origin settings
├── database.ts       # Database URL and dialect detection
├── jwt.ts            # Access/refresh secrets, expiry times
├── logging.ts        # Log level and HTTP request logging
├── mail.ts           # SMTP host, port, credentials
├── openapi.ts        # OpenAPI spec and Scalar UI settings
├── queue.ts          # Queue names, concurrency, BullBoard
├── rateLimit.ts      # Window, max requests, login limit
├── realtime.ts       # Socket.IO enabled flag and path
├── redis.ts          # Redis URL, prefix, feature toggle
├── session.ts        # Session cookie name, TTL
└── storage.ts        # Storage driver, S3 settings
```

## Usage

Import individual configs or the aggregated barrel:

```ts
// Single config
import { jwtConfig } from "@/config/jwt.js";

// Aggregated config
import { config } from "@/config/index.js";

console.log(config.jwt.accessSecret);
console.log(config.cache.ttlSeconds);
```

## App

```ts
// src/config/app.ts
export default {
  name: env.APP_NAME, // "nexgen"
  environment: env.APP_ENV, // "development" | "production" | "test"
  port: env.APP_PORT, // 3000
  url: env.APP_URL, // "http://localhost:3000"
  frontendUrl: env.FRONTEND_URL, // if frontend is not in same server and need cache session realtime etc
  openApiEnabled: env.OPEN_API, // /api-docs endpoint
  frontendEnabled: env.FRONTEND, // serve Vue SPA
};
```

## OpenAPI

```ts
// src/config/openapi.ts
export default {
  version: "3.0.0",
  title: "nexgen API",
  apiVersion: "0.1.0",
  description: "",

  scalar: {
    specUrl: "/doc",
    docsPath: "/api-docs", // change this to rename the docs URL
    layout: "classic", // "classic" | "modern"
    theme: "moon", // "default" | "moon" | "purple" | "solarized" | "bluePlanet" | "fastify" | "kepler" | "mars" | "nebula" | "none"
    pageTitle: "nexgen API",
    defaultHttpClient: {
      targetKey: "js",
      clientKey: "fetch",
    },
    defaultOpenAllTags: true,
  },
};
```

Controls the OpenAPI spec metadata and the Scalar docs UI at `/api-docs`. Requires `OPEN_API=true` in `.env`. See [OpenAPI](/guide/openapi) for the full guide.

## Auth

```ts
// src/config/auth.ts
export default {
  requireEmailVerification: false,
};
```

When `true`, users must verify their email before logging in. Requires mail configuration and a running queue worker.

## JWT

```ts
// src/config/jwt.ts
export default {
  accessSecret: env.JWT_ACCESS_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  accessExpirySeconds: 900, // 15 minutes
  refreshExpirySeconds: 3600, // 1 hour
  refreshRememberExpirySeconds: 2592000, // 30 days
  algorithm: "HS256",
};
```

## Database

```ts
// src/config/database.ts
export default {
  url: env.DATABASE_URL,
};
```

The dialect (`mysql`, `postgresql`, `sqlite`) is auto-detected from the URL prefix. The `databaseDialect` constant and `detectDialectFrom()` helper are also exported.

## Redis

```ts
// src/config/redis.ts
export default {
  enabled: env.REDIS, // read from REDIS env var
  url: env.REDIS_URL,
  prefix: env.REDIS_PREFIX, // "nexgen"
  commanderPort: 1369,
};
```

Redis must be explicitly enabled. When `enabled: false`, all Redis-backed services degrade gracefully.

## Cache

```ts
// src/config/cache.ts
export default {
  ttlSeconds: 3600, // 1 hour
  keyPrefix: `${redisConfig.prefix}:cache`, // "nexgen:cache"
};
```

## Session

```ts
// src/config/session.ts
export default {
  cookieName: `${cookieConfig.name}_session`, // "nexgen_session"
  ttlSeconds: 7200, // 2 hours
  keyPrefix: `${redisConfig.prefix}:session`, // "nexgen:session"
};
```

## Queue

```ts
// src/config/queue.ts
export default {
  queues: ["default", "mail", "maintenance"], // default queue, you can add or remove
  concurrency: 10,
  autoPruneQueues: true, // auto remove stale key value
  prefix: `${redisConfig.prefix}:queue`, // "nexgen:queue"
  durablePrefix: `${redisConfig.prefix}:durable`, // "nexgen:durable"
  queueUi: "/queues", // queue dashboard
  allowedEmails: "", // if multiple comma-separated emails for dashboard access
};
```

## Rate Limiter

```ts
// src/config/rateLimit.ts
export default {
  windowMs: 60000, // 1 minute
  maxRequests: 500, // per window (global)
  loginMaxRequests: 60, // per window (login)
  keyPrefix: `${redisConfig.prefix}:rl`, // "nexgen:rl"
};
```

## Realtime

```ts
// src/config/realtime.ts
import { env } from "@/env.js";

export default {
  enabled: env.SOCKET, // if true dispatchEvent work else not
  path: "/socket.io",
};
```

## Mail

```ts
// src/config/mail.ts
export default {
  host: "127.0.0.1",
  port: 1089,
  encryption: "none",
  username: env.MAIL_USERNAME,
  password: env.MAIL_PASSWORD,
  fromAddress: "no-reply@example.com",
  failSilent: true,
  maildev: {
    // this is dev mode
    smtpPort: 1089,
    webPort: 1080,
  },
};
```

## Storage

```ts
// src/config/storage.ts
export default {
  driver: "local", // "local" | "s3"
  defaultDisk: "public", // "public" | "private" | "tmp"
  bucket: "",
  region: "us-east-1",
  endpoint: "",
  forcePathStyle: false, // true for MinIO
  signedUrlTtlSeconds: 900, // 15 minutes
  accessKeyId: env.STORAGE_ACCESS_KEY_ID,
  secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
};
```

## Cookie

```ts
// src/config/cookie.ts
export default {
  name: "nexgen",
  secret: env.COOKIE_SECRET,
};
```

## CORS

```ts
// src/config/cors.ts
export default {
  origin: "*", // reflects request origin for credentialed requests (* or http://placeholder.com)
};
```

## Logging

```ts
// src/config/logging.ts
export default {
  level: "info", // "fatal"|"error"|"warn"|"info"|"debug"|"trace"
  httpRequests: true, // if false not store level
};
```

## Redis Key Namespace

All Redis keys are prefixed with `REDIS_PREFIX` (default `nexgen`):

| Service       | Key Pattern        | Config         |
| ------------- | ------------------ | -------------- |
| Cache         | `nexgen:cache:*`   | `cache.ts`     |
| Session       | `nexgen:session:*` | `session.ts`   |
| Queue         | `nexgen:queue:*`   | `queue.ts`     |
| Durable Queue | `nexgen:durable:*` | `queue.ts`     |
| Rate Limit    | `nexgen:rl:*`      | `rateLimit.ts` |
| Broadcast     | `nexgen:broadcast` | `server.ts`    |
