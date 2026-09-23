# `logger` — structured logging

Imported from the facade: `import { logger } from "@/framework/facade.js"`.

Guide: [Logger](./../guide/support/logger).

## Signature

| Function       | Signature                    | Description                                   |
| -------------- | ---------------------------- | --------------------------------------------- |
| `logger.trace` | `(message, meta?) => void`   | Fine-grained trace information                |
| `logger.debug` | `(message, meta?) => void`   | Detailed debugging information                |
| `logger.info`  | `(message, meta?) => void`   | General operational messages                  |
| `logger.warn`  | `(message, meta?) => void`   | Warning conditions                            |
| `logger.error` | `(message, meta?) => void`   | Error conditions (also logged to `fatal.log`) |
| `logger.fatal` | `(message, meta?) => void`   | Critical errors (exits process after logging) |
| `logger.child` | `(bindings) => CompatLogger` | Child logger with added context               |

## Use cases

```ts
import { logger } from "@/framework/facade.js";

logger.info("Server started", { port: 3000 });
logger.error("Failed to connect", { error: err.message });

const child = logger.child({ module: "auth" });
child.info("User logged in", { userId: 42 });
```

## Notes

- Console output is colorized; `error`/`fatal` also write to `fatal.log`.
- Handles `uncaughtException` and `unhandledRejection` globally (logged, and process-exit for exceptions).

## Related

- [mail](./mail) · [shouldQueue](./shouldQueue)
