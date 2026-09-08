# `dispatchCommand` — run a command handler

Imported from the facade: `import { command, dispatchCommand } from "@/framework/facade.js"`.

Runs a handler registered with `command()`. Synchronous in-process by default; with `async: true` it enqueues via the queue instead (`dispatchEvent`'s non-broadcast twin). See [Events & Queue](./../guide/events-queue).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `dispatchCommand` | `(name, payload, options?) => Promise<any>` | Run a registered handler now, or enqueue it when `async: true` |

Options:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `async` | `boolean` | `false` | Run through the queue instead of in-process |
| `queue` | `string` | `"default"` | Target queue when `async: true` |

## Use cases

### Sync by default

```ts
const result = await dispatchCommand("calculate-tax", { subtotal: 100 });
// result => { total: 110 }
```

### In the background via the queue

```ts
await dispatchCommand("calculate-tax", { subtotal: 100 }, { async: true, queue: "default" });
```

## Notes

- Looks up a handler registered with `command()`; returns `null` for unknown names.
- With `async: true` it falls through to `queueJob(name, payload, { queue })` — same idempotency/retry semantics as any queued job.
- Compare with [dispatchEvent](./dispatchEvent) (adds broadcasting) and [queueJob](./queueJob) (bare enqueue).

## Related

- [command](./command) · [queueJob](./queueJob)