# JWT

## Overview

The JWT utility provides **token generation and verification** for the auth system. It uses HS256 signing with separate secrets for access and refresh tokens, and automatically embeds `iat`, `exp`, and `type` claims.

## JWT Utility

```ts
import { jwt } from "@/framework/facade.js";
```

| Method | Purpose |
|---|---|
| `jwt.generateToken(payload, type, expirySeconds?)` | Creates a signed JWT. Access tokens get `type: "access"`; refresh tokens also get a `jti` (UUID). Returns `{ token, jti, exp }`. |
| `jwt.verifyToken(token, type)` | Verifies the signature, checks expiry, and enforces the expected `type` claim. Returns the decoded payload or `null` on failure. |

## Usage

### Generate tokens

```ts
const access = await jwt.generateToken({ id: user.id, email: user.email }, "access");
// { token: "...", jti: undefined, exp: 1700000000 }

const refresh = await jwt.generateToken({ id: user.id }, "refresh");
// { token: "...", jti: "uuid", exp: 1700300000 }
```

### Verify tokens

```ts
const payload = await jwt.verifyToken(token, "access");
// null if expired, bad signature, or wrong type
if (payload) {
  // payload.id, payload.email, payload.type
}
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JWT_ACCESS_SECRET` | — | **Required.** Secret for signing access tokens (HS256) |
| `JWT_REFRESH_SECRET` | — | **Required.** Secret for signing refresh tokens (HS256) |
| `JWT_ACCESS_EXPIRY` | `900` (15 min) | Default access token TTL in seconds |
| `JWT_REFRESH_EXPIRY` | `2592000` (30 days) | Default refresh token TTL in seconds |
