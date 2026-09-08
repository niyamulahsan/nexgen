# `command` — register a command handler

Imported from the facade: `import { command, dispatchCommand } from "@/framework/facade.js"`.

Registers an in-memory synchronous handler that `dispatchCommand` can run. Commands are process-local — no Redis, no queue — useful for request-flow helpers that return values. See [Events & Queue](./../guide/events-queue).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `command` | `(name, handler) => void` | Register an in-memory synchronous handler |

## Use cases

### Register a handler

```ts
import { command, dispatchCommand } from "@/framework/facade.js";

command("calculate-tax", async (payload) => {
  return { total: payload.subtotal * 1.1 };
});
```

### Note: dispatch

Run it with `dispatchCommand("calculate-tax", ...)` — synchronously by default, or in the background with `{ async: true, queue: "default" }`. See [dispatchCommand](./dispatchCommand).

## Notes

- Handlers are registered once at boot (job files or boot scripts) and looked up by `dispatchCommand` by name.
- Unknown command names make `dispatchCommand` return `null` rather than throw.

## Related

- [dispatchCommand](./dispatchCommand)