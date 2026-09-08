# `jwt` — token generation & verification

Imported from the facade: `import { jwt } from "@/framework/facade.js"`.

Guide: [JWT](./../guide/support/jwt).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `jwt.generateToken` | `(payload, type, expirySeconds?) => Promise<{ token, jti?, exp }>` | Sign HS256 access/refresh token with `iat`/`exp`/`type` claims |
| `jwt.verifyToken` | `(token, type) => Promise<object|null>` | Verify signature/expiry and enforce token type |

## Use cases

```ts
import { jwt } from "@/framework/facade.js";

const { token, exp } = await jwt.generateToken({ id: user.id, email: user.email }, "access");
const payload = await jwt.verifyToken(token, "access"); // null if invalid
```

### Real world — issue access + refresh

```ts
const accessToken = await jwt.generateToken({ id: user.id, email: user.email, remember }, "access");
const refreshToken = await jwt.generateToken({ id: user.id, email: user.email, remember }, "refresh", refreshExpiry);

if (refreshToken.jti) {
  await db.insert(refreshTokens).values({ userId: user.id, jti: refreshToken.jti, revoked: 0, expiresAt: new Date(refreshToken.exp * 1000) });
}

await cookie.setAuth(c, accessToken.token);
await cookie.setRefresh(c, refreshToken.token, refreshExpiry);
```

### Real world — revoke on logout

```ts
const token = await cookie.getRefresh(c);
if (token) {
  const payload = await jwt.verifyToken(token, "refresh");
  if (payload?.jti) await db.delete(refreshTokens).where(eq(refreshTokens.jti, payload.jti as string));
}
cookie.deleteAuth(c);
cookie.deleteRefresh(c);
```

## Notes

- Secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) come from `.env`; expiries live in `config/jwt.ts`.
- `type` binds the token to its purpose — an access token cannot be used where a refresh token is expected.

## Related

- [password](./password) · [cookie](./cookie)