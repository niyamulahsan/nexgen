# `queue` — access a BullMQ queue

Imported from the facade: `import { queue, queueJob, shouldQueue } from "@/framework/facade.js"`.

Gets or lazily creates a BullMQ queue instance (`"default"` if omitted) for monitoring, counts, and advanced control. Most apps only need `queueJob` / `shouldQueue`. See [Events & Queue](./../guide/events-queue).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `queue` | `(name?) => Queue/null` | Get or lazily create a BullMQ queue (`"default"` if omitted) |

## Use cases

### Inspect queue counts

```ts
import { queue } from "@/framework/facade.js";

const q = queue("default");
if (q) {
  const counts = await q.getJobCounts("waiting", "active", "completed", "failed");
}
```

### Named queues

```ts
const mailQueue = queue("mail");
const collectionQueue = queue("collection");
```

## Notes

- Returns `null` when Redis is off — the app never crashes from a missing Redis.
- `queue()` lazily creates the queue on first access; `queueJob` uses the same registry.
- Prefer `queueJob` for enqueueing and `shouldQueue` for handlers; reach for the raw instance only for introspection.

## Related

- [queueJob](./queueJob) · [shouldQueue](./shouldQueue)