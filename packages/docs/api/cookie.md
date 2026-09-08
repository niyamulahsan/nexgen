# `cookie` — auth cookie helpers

Imported from the facade: `import { cookie } from "@/framework/facade.js"`.

Guide: [Cookie](./../guide/support/cookie).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `cookie.setAuth` | `(c, token) => Promise<void>` | Sets the `{name}_access` httpOnly cookie |
| `cookie.setRefresh` | `(c, token, maxAge?) => Promise<void>` | Sets the `{name}_refresh` httpOnly cookie |
| `cookie.getAuth` | `(c) => Promise<string|undefined>` | Reads the access cookie |
| `cookie.getRefresh` | `(c) => Promise<string|undefined>` | Reads the refresh cookie |
| `cookie.deleteAuth` | `(c) => void` | Clears the access cookie |
| `cookie.deleteRefresh` | `(c) => void` | Clears the refresh cookie |

## Use cases

```ts
import { cookie } from "@/framework/facade.js";

cookie.setAuth(c, accessToken);
cookie.setRefresh(c, refreshToken, 604800); // override refresh maxAge (7 days)
cookie.deleteAuth(c); cookie.deleteRefresh(c); // logout
```

### Real world — set after issuing tokens

```ts
await cookie.setAuth(c, accessToken.token);
await cookie.setRefresh(c, refreshToken.token, refreshExpiry);
```

## Notes

- Auto-toggles `SameSite=None; Secure` when `APP_URL` and `FRONTEND_URL` differ (cross-origin deployment).
- `cookie`/`session` share the cross-origin detection logic.

## Related

- [jwt](./jwt) · [password](./password) · [session](./session)