# `paginate` — request-driven pagination

Imported from the facade: `import { paginate } from "@/framework/facade.js"`.

The default pagination helper: reads `page` / `per_page` / `size` from the request query string, runs a lean count, and returns a full `PaginatedResult`. Best for route handlers with joins, `WHERE`, `GROUP BY`, `HAVING`, or `DISTINCT`. See [Database](./../guide/database).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `paginate` | `(c, query, perPage?, options?) => Promise<PaginatedResult<T>>` | Request-driven pagination for select queries |

Options (4th arg, optional):

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `perPage` | `number` | `15` | Items per page (also `3rd` argument, shorthand) |
| `path` | `string` | `c.req.path` | Base path used in generated URLs |

Response — same shape as all four pagination helpers:

```ts
type PaginatedResult<T> = {
  current_page: number;
  data: T[];
  first_page_url: string | null;
  from: number | null;
  last_page: number;
  last_page_url: string | null;
  links: Array<{ url: string | null; label: string; page: number | null; active: boolean }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
};
```

## Use cases

### From request with joins

```ts
import { desc } from "drizzle-orm";
import { db, paginate } from "@/framework/facade.js";
import { posts } from "@/modules/blog/database/models/post.js";

const query = db
  .select({ id: posts.id, title: posts.title, authorName: users.name })
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id))
  .where(eq(posts.published, true))
  .orderBy(desc(posts.id));

const result = await paginate(c, query, 15);
// GET /posts?page=2&per_page=20 => current_page: 2, per_page: 20
```

### Custom path

```ts
const result = await paginate(c, query, 15, { path: "/api/posts" });
```

## Notes

- Reads `page`/`per_page`/`size` from the request query string; clamps `current_page` to the last page and enforces `maxPerPage` (default `100`).
- Uses a **lean count subquery** (`SELECT count(*) FROM (SELECT 1 FROM ...) AS _inner`) instead of wrapping the full SELECT — faster on wide tables and complex joins.

## Related

- [paginateModel](./paginateModel) · [paginateTable](./paginateTable) · [paginateQuery](./paginateQuery) · [db](./db)