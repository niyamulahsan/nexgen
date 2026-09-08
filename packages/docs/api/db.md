# `db` — database connection & query proxy

Imported from the facade: `import { db, database } from "@/framework/facade.js"`.

The global Drizzle query proxy — resolves the active dialect (`sqlite` / `mysql` / `postgresql`, detected from `DATABASE_URL`) and forwards every property to the initialized instance. See [Database](./../guide/database).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `db` | `Proxy` | Global query surface — forwards every property to the initialized instance |

## Use cases

### Insert / select via the proxy

```ts
import { db } from "@/framework/facade.js";
import { users } from "@/modules/auth/database/models/user.js";

await db.insert(users).values({ name: "Ada", email: "ada@example.com" });

const row = await db.query.users.findFirst({
  where: (table, { eq }) => eq(table.email, "ada@example.com"),
});
```

### Raw SQL — normalized `{ rows }` result

`db.execute()` runs raw queries and normalizes driver-specific shapes (mysql2 tuple, libsql/postgres arrays) into a consistent `{ rows }` shape:

```ts
const result = await db.execute(sql`select * from users where role_id = ${1}`);
console.log(result.rows); // [{ ... }, ...] on every dialect
```

> `db.execute()` is only used for raw SQL — regular queries use the `db` proxy directly.

### Seeders

```ts
import { db, password } from "@/framework/facade.js";
import { users } from "@/modules/auth/database/models/user.js";

for (const row of rows) {
  const existing = await db.query.users.findFirst({ where: (t, { eq }) => eq(t.email, row.email) });
  if (!existing) await db.insert(users).values({ ...row, password: await password.hashPassword(row.password) });
}
```

### Real world — eager loading with `columns` + `with`

An auth module can hide sensitive columns on a select and pull in relations in one call — this is the idiomatic "me" / profile query:

```ts
// modules/auth/controllers/auth.controller.ts — GET /auth/me
const user = await db.query.users.findFirst({
  where: eq(users.id, auth.id),
  columns: { password: false, forgetPassword: false, rememberToken: false }, // { hiddenUserColumns }
  with: { role: true, commissionerate: true },
});
```

When the same restricted select is reused, keep it in a helper — the `role` relation is fetched and password columns are dropped for every caller:

```ts
// modules/collectionbind/controllers/collectionbind.helpers.ts
export async function getCurrentUser(auth: any) {
  if (!auth?.id) return null;
  return db.query.users.findFirst({
    where: eq(users.id, Number(auth.id)),
    with: { role: true },
    columns: { password: false, forgetPassword: false, rememberToken: false },
  });
}
```

## Notes

- `db` is a lazy `Proxy` — it resolves the initialized Drizzle instance per access. Use it only after the framework bootstraps the connection (controllers, seeders, jobs, schedules).
- The single shared instance is created by `initDatabase()` at startup and managed by the CLI (`db:migrate`, `db:fresh`, `db:push`, …).
- For the bootstrap function itself, see [database](./database).

## Related

- [database](./database) · [paginate](./paginate)