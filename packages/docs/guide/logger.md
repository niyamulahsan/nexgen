# Logger

## Overview

The logger is a **Winston-based structured logger** configured with both console and rotating file transports. It is pre-configured with the framework's log level and service name, and handles uncaught exceptions and promise rejections.

## Logger Utility

```ts
import { logger } from "@/framework/facade.js";
```

The `logger` is a Winston instance with the standard methods:

| Method | Purpose |
|---|---|
| `logger.debug(msg, meta?)` | Detailed debugging information |
| `logger.info(msg, meta?)` | General operational messages |
| `logger.warn(msg, meta?)` | Warning conditions |
| `logger.error(msg, meta?)` | Error conditions (also logged to `fatal.log`) |

## Usage

```ts
import { logger } from "@/framework/facade.js";

logger.info("Server started", { port: env.APP_PORT });
logger.error("Failed to connect", { error: err.message });
```

## Transports

| Transport | Level | File | Details |
|---|---|---|---|
| Console | `debug` | — | Colorized output with timestamp |
| File | `info` | `src/storage/logs/app.log` | Rotating, max 10MB per file, 5 files |
| File | `error` | `src/storage/logs/fatal.log` | Rotating, max 10MB per file, 3 files, handles exceptions & rejections |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `LOG_LEVEL` | `debug` | Minimum log level (`debug`, `info`, `warn`, `error`) |
| `APP_NAME` | `nexgen` | Service name included in log metadata |
