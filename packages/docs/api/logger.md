# `logger` — structured logging

Imported from the facade: `import { logger } from "@/framework/facade.js"`.

Guide: [Logger](./../guide/support/logger).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `logger.trace/debug/info/warn/error/fatal` | `(message, meta?) => void` | Leveled logs to console + rotating files |
| `logger.child` | `(bindings) => CompatLogger` | Child logger with added context |

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