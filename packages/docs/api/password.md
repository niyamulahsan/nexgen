# `password` — bcrypt hashing

Imported from the facade: `import { password } from "@/framework/facade.js"`.

Guides: [Password](./../guide/support/password).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `password.hashPassword` | `(plaintext) => Promise<string>` | bcrypt hash (cost 10) |
| `password.verifyPassword` | `(plaintext, hash) => Promise<boolean>` | Constant-time compare vs stored hash |

## Use cases

```ts
import { password } from "@/framework/facade.js";

// Sign up
const hash = await password.hashPassword("user-plaintext-password");
await db.insert(schema.users).values({ email, password: hash });

// Login
const ok = await password.verifyPassword(input.password, user?.password ?? "");
if (ok) { /* grant access */ }
```

### Real world — login

```ts
const user = await db.query.users.findFirst({ where: eq(users.email, body.email) });
if (!user || !(await password.verifyPassword(body.password, user.password))) {
  return c.json({ message: "Invalid credentials" }, HttpStatusCodes.UNAUTHORIZED);
}
```

## Notes

- Backend-only — used in controllers, jobs, middleware, and seeders.
- Uses bcrypt cost 10; `verifyPassword` compares in constant time.

## Related

- [jwt](./jwt) · [cookie](./cookie)