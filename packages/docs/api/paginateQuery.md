# `paginateQuery` — custom count & data pagination

Imported from the facade: `import { paginateQuery } from "@/framework/facade.js"`.

Pagination with manual `total()` / `data()` callbacks — for when the count query and the data query are structurally different (JOIN + GROUP BY + HAVING, DISTINCT, aggregates). See [Database](./../guide/database).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `paginateQuery` | `(options) => Promise<PaginatedResult<T>>` | Manual `total()` / `data()` callbacks |

Options:

| Option | Type | Description |
| --- | --- | --- |
| `page` | `number` | Page number |
| `perPage` | `number` | Items per page |
| `total` | `async () => number` | **Required.** Runs the count query |
| `data` | `async (limit, offset) => T[]` | **Required.** Runs the data query with limit/offset |
| `path` | `string` | Base path for pagination URLs |

## Use cases

### Aggregates with HAVING

```ts
import { count, eq, gt, sum } from "drizzle-orm";
import { db, paginateQuery } from "@/framework/facade.js";

const result = await paginateQuery({
  page: 1,
  perPage: 15,
  total: async () => {
    const [row] = await db.select({ total: count() }).from(users).where(eq(users.active, true));
    return Number(row?.total ?? 0);
  },
  data: async (limit, offset) =>
    db.select({ id: users.id, name: users.name, orderCount: count(orders.id) })
      .from(users)
      .leftJoin(orders, eq(users.id, orders.userId))
      .groupBy(users.id)
      .having(gt(count(orders.id), 5))
      .limit(limit)
      .offset(offset),
});
```

## Notes

- Use only when `paginate`/`paginateModel`/`paginateTable` can't express the count query (e.g. `HAVING`-filtered groups, window functions).
- Returns the same `PaginatedResult` shape as the other three helpers.

## Related

- [paginate](./paginate) · [paginateModel](./paginateModel) · [paginateTable](./paginateTable)