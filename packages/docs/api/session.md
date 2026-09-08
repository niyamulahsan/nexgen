# `session` — server-side session state

Imported from the facade: `import { session } from "@/framework/facade.js"`.

Redis-backed server-side session documents with an automatic httpOnly cookie. Distinct from auth — works for guests and logged-in users. `sessionMiddleware` attaches `sessionId` to every request (`c.get("sessionId")`). See [Session](./../guide/session).

## Functions

| Function | Signature | Description |
| --- | --- | --- |
| `session.start` | `(data?) => Promise<string>` | Create a session document; returns its ID |
| `session.all` | `(id) => Promise<T|null>` | Fetch the entire session payload |
| `session.get` | `(id, key) => Promise<T|null>` | Read a single key |
| `session.put` | `(id, key, value) => Promise<boolean>` | Write/update a single key (rewrites the document, fresh TTL) |
| `session.refresh` | `(id) => Promise<boolean>` | Extend the TTL (called automatically by the middleware) |
| `session.destroy` | `(id) => Promise<boolean>` | Delete the session document |
| `session.isAvailable` | `() => boolean` | `true` when Redis is configured and connected |

## Use cases

### Read the request session id

```ts
const sessionId = c.get("sessionId"); // set by sessionMiddleware
```

### Store and retrieve data

```ts
// Save a cart
await session.put(sessionId, "cart", [
  { productId: 1, quantity: 2 },
]);

// Read it back
const cart = await session.get<CartItem[]>(sessionId, "cart");
```

### Full payload

```ts
const data = await session.all(sessionId);
// { cart: [...], wizardStep: 3, preferences: {...} }
```

### Independent session

```ts
const newId = await session.start({ source: "webhook", ref: "abc" });
```

### Destroy on logout

```ts
await session.destroy(sessionId);
// only removes the Redis document; the cookie stays and gets a fresh empty session next request
```

### Runtime guard

```ts
if (session.isAvailable()) {
  await session.put(sessionId, "wizardStep", 3);
}
```

## Notes

- A cookie-based auth flow uses `cookie` tokens (`cookie.setAuth`/`setRefresh`, see [cookie](./cookie)) rather than server-side sessions. Prefer `session` when you need state that survives across devices for guests or logged-in users — e.g. multi-step wizards, carts, and partial forms.
- Keys are namespaced as `{REDIS_PREFIX}:session:{id}`; the default TTL is `ttlSeconds` (`config/session.ts`, default 7200s) and is refreshed on every request.
- When Redis is unavailable, mutators return `false`, readers return `null`/`undefined`, and `start` returns `""` — no crashes.
- `destroy` only removes the Redis document — the httpOnly cookie persists and creates a new empty session on the next request.