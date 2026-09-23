# `paginateModel` — eager-loading pagination

Imported from the facade: `import { paginateModel } from "@/framework/facade.js"`.

Pagination backed by relational eager loading via `db.query.table.findMany({ with })` — returns fetched relations alongside paged rows. See [Database](./../guide/database).

## Signature

| Function        | Signature                                           | Description                                                                                                                 |
| --------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `paginateModel` | `(context, options) => Promise<PaginatedResult<T>>` | Relational eager loading via `db.query.table.findMany({ with })` — `context` is the request (`c` on Hono, `req` on Express) |

Options:

| Option    | Type               | Description                                                       |
| --------- | ------------------ | ----------------------------------------------------------------- |
| `table`   | `Table`            | The Drizzle table (for building count clauses)                    |
| `query`   | `db.query.<table>` | The relation query builder                                        |
| `where`   | `SQL/boolean`      | Filter clause                                                     |
| `with`    | `object`           | Relation tree for eager loading (nested allowed)                  |
| `columns` | `object`           | Column selection                                                  |
| `orderBy` | `SQL / SQL[]`      | Sort order for the query results                                  |
| `perPage` | `number`           | Items per page (default `15`)                                     |
| `path`    | `string`           | Base path for pagination URLs (default `c.req.path` / `req.path`) |

## Use cases

### With a relation tree

::: code-group

```ts [Hono]
import { desc } from "drizzle-orm";
import { db, paginateModel } from "@/framework/facade.js";

const result = await paginateModel(c, {
  table: users,
  query: db.query.users,
  where: eq(users.status, "1"),
  with: { role: true, profile: true }, // nested eager loading works too
  orderBy: desc(users.id),
  perPage: 10,
  path: c.req.path, // Hono — use req.path on Express
});
```

```ts [Express]
import { desc } from "drizzle-orm";
import { db, paginateModel } from "@/framework/facade.js";

const result = await paginateModel(req, {
  table: users,
  query: db.query.users,
  where: eq(users.status, "1"),
  with: { role: true, profile: true }, // nested eager loading works too
  orderBy: desc(users.id),
  perPage: 10,
  path: req.path, // Express
});
```

:::

### Real world — deep nested relations

The `entity` module composes the full option surface in one call — `with` relation objects built per role, plus `where`, `columns`, `orderBy`, and `path`:

::: code-group

```ts [Hono]
// modules/entity/controllers/entity.controller.ts (simplified)
const result = await paginateModel(c, {
  // Hono — pass req on Express
  table: entities,
  query: db.query.entities,
  where: and(eq(entities.status, "1"), roleFilter),
  with: { commissionerates: { with: { districts: true } }, users: true },
  columns: { hidden: false },
  orderBy: desc(entities.id),
  perPage: 15,
});
```

```ts [Express]
// modules/entity/controllers/entity.controller.ts (simplified)
const result = await paginateModel(req, {
  // Hono — pass req on Express
  table: entities,
  query: db.query.entities,
  where: and(eq(entities.status, "1"), roleFilter),
  with: { commissionerates: { with: { districts: true } }, users: true },
  columns: { hidden: false },
  orderBy: desc(entities.id),
  perPage: 15,
});
```

:::

## Notes

- Uses the same `PaginatedResult` shape as `paginate` — see that page for the type.
- Prefer `paginateModel` when the client needs the full object graph in one request; prefer `paginate` for flat rows with joins/aggregates.

## Related

- [paginate](./paginate) · [paginateTable](./paginateTable) · [paginateQuery](./paginateQuery)
