# Logger

## Overview

The logger is a **Pino-based structured logger** configured with both console and rotating file transports. It is pre-configured with the framework's log level and service name, and handles uncaught exceptions and promise rejections.

## Logger Utility

```ts
import { logger } from "@/framework/facade.js";
```

The `logger` is a Pino instance with a compat `(message, meta)` call signature:

| Method | Purpose |
|---|---|
| `logger.debug(msg, meta?)` | Detailed debugging information |
| `logger.info(msg, meta?)` | General operational messages |
| `logger.warn(msg, meta?)` | Warning conditions |
| `logger.error(msg, meta?)` | Error conditions (also logged to `fatal.log`) |
| `logger.fatal(msg, meta?)` | Critical errors (exits process after logging) |
| `logger.trace(msg, meta?)` | Fine-grained trace information |
| `logger.child(bindings)` | Create a child logger with added context |

## Usage

```ts
import { logger } from "@/framework/facade.js";

logger.info("Server started", { port: env.APP_PORT });
logger.error("Failed to connect", { error: err.message });

const child = logger.child({ module: "auth" });
child.info("User logged in", { userId: 42 });
```

## Transports

| Transport | Level | File | Details |
|---|---|---|---|
| Console | matches `level` config | — | Colorized output with timestamp |
| File | `info` | `src/storage/logs/app.log` | Rotating, max 10MB per file, 5 files |
| File | `error` | `src/storage/logs/fatal.log` | Rotating, max 10MB per file, 3 files, handles exceptions & rejections |

## Configuration

Logging settings are in `src/config/logging.ts`:

| Setting | Default | Description |
|---|---|---|
| `level` | `"info"` | Minimum log level (`debug`, `info`, `warn`, `error`, `fatal`, `trace`) |
| `httpRequests` | `true` | Log per-request HTTP access lines |
