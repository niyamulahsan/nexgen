# `database` — initialize the Drizzle client

Imported from the facade: `import { database } from "@/framework/facade.js"`.

Returns the initialized Drizzle instance for the active dialect, or throws if the framework hasn't bootstrapped the connection. Most application code uses the `db` proxy instead. See [Database](./../guide/database).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `database` | `() => DrizzleInstance` | Returns the initialized Drizzle instance (throws if not bootstrapped) |

## Use cases

### Accessing the raw instance

```ts
import { database } from "@/framework/facade.js";

const drizzle = database(); // throws "Database is not initialized" if not bootstrapped
```

## Notes

- `database()` throws `"Database is not initialized"` if called before bootstrap.
- Prefer the `db` proxy for day-to-day queries — it needs no call and stays a valid reference forever.
- The single shared instance is created by `initDatabase()` at startup and managed by the CLI (`db:migrate`, `db:fresh`, `db:push`, …).

## Related

- [db](./db)