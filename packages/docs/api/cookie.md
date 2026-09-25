# `cookie` — auth cookie helpers

Imported from the facade: `import { cookie } from "@/framework/facade.js"`.

Guide: [Cookie](./../guide/support/cookie).

## Signature

| Function               | Hono                                   | Express                                  | Description                               |
| ---------------------- | -------------------------------------- | ---------------------------------------- | ----------------------------------------- |
| `cookie.setAuth`       | `(c, token) => Promise<void>`          | `(res, token) => Promise<void>`          | Sets the `{name}_access` httpOnly cookie  |
| `cookie.setRefresh`    | `(c, token, maxAge?) => Promise<void>` | `(res, token, maxAge?) => Promise<void>` | Sets the `{name}_refresh` httpOnly cookie |
| `cookie.getAuth`       | `(c) => Promise<string \| undefined>`  | `(req) => Promise<string \| undefined>`  | Reads the access cookie                   |
| `cookie.getRefresh`    | `(c) => Promise<string \| undefined>`  | `(req) => Promise<string \| undefined>`  | Reads the refresh cookie                  |
| `cookie.deleteAuth`    | `(c) => void`                          | `(res) => void`                          | Clears the access cookie                  |
| `cookie.deleteRefresh` | `(c) => void`                          | `(res) => void`                          | Clears the refresh cookie                 |

## Use cases

::: code-group

```ts [Hono]
import { cookie } from "@/framework/facade.js";

cookie.setAuth(c, accessToken);
cookie.setRefresh(c, refreshToken, 604800); // override refresh maxAge (7 days)
cookie.deleteAuth(c);
cookie.deleteRefresh(c); // logout
```

```ts [Express]
import { cookie } from "@/framework/facade.js";

cookie.setAuth(res, accessToken);
cookie.setRefresh(res, refreshToken, 604800); // override refresh maxAge (7 days)
cookie.deleteAuth(res);
cookie.deleteRefresh(res); // logout
```

:::

### Real world — set after issuing tokens

::: code-group

```ts [Hono]
await cookie.setAuth(c, accessToken.token);
await cookie.setRefresh(c, refreshToken.token, refreshExpiry);
```

```ts [Express]
await cookie.setAuth(res, accessToken.token);
await cookie.setRefresh(res, refreshToken.token, refreshExpiry);
```

:::

## Notes

- Auto-toggles `SameSite=None; Secure` when `APP_URL` and `FRONTEND_URL` differ (cross-origin deployment).
- `cookie`/`session` share the cross-origin detection logic.

## Related

- [jwt](./jwt) · [password](./password) · [session](./session)
