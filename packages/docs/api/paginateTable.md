# `paginateTable` — single-table pagination

Imported from the facade: `import { paginateTable } from "@/framework/facade.js"`.

Pagination for a single table with optional `WHERE`/`ORDER BY` — no request object, no joins. Pages values are passed explicitly. See [Database](./../guide/database).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `paginateTable` | `(database, table, options?) => Promise<PaginatedResult<T>>` | Single-table pagination; explicit page/perPage, optional where/orderBy/path |

Options:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `page` | `number` | `1` | Page number |
| `perPage` | `number` | `15` | Items per page |
| `where` | `SQL` | — | Filter clause (e.g. `or(...clauses)`) |
| `orderBy` | `SQL | SQL[]` | — | Sort (`[desc(reports.id)]`) |
| `path` | `string` | `""` | Base path for pagination URLs |

## Use cases

### Basic

```ts
import { desc, eq } from "drizzle-orm";
import { db, paginateTable } from "@/framework/facade.js";

const result = await paginateTable(db, posts, {
  page: 1,
  perPage: 10,
  where: eq(posts.authorId, userId),
  orderBy: [desc(posts.createdAt)],
});
```

### Real world — search + index

The common "index with optional search" handler reads `search` from the query, builds Drizzle clauses with `ilike`, and pages the single table:

```ts
// modules/report/controllers/files.controller.ts
import { desc, ilike, or } from "drizzle-orm";
import { db, HttpStatusCodes, paginateTable } from "@/framework/facade.js";

export const index: Handler = async (c: any) => {
  const query = c.req.valid("query");
  const search = String(query.search || "").trim();

  const clauses: any[] = [];
  if (search) clauses.push(ilike(reports.name, `%${search}%`));

  const result = await paginateTable(db, reports, {
    page: Number(query.page || 1),
    perPage: Number(query.size || 10),
    where: clauses.length ? or(...clauses) : undefined,
    orderBy: [desc(reports.id)],
    path: c.req.path,
  });

  return c.json({ message: "Files fetched successfully", data: result }, HttpStatusCodes.OK);
};
```

## Notes

- Use when there are no joins and no request context needed — the caller supplies `page`/`perPage` directly.
- Returns the same `PaginatedResult` shape as the other three helpers.

## Related

- [paginate](./paginate) · [paginateModel](./paginateModel) · [paginateQuery](./paginateQuery)