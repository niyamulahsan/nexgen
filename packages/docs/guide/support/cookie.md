# Cookie

## Overview

The cookie utility provides helpers for managing **auth-related httpOnly cookies** — setting, reading, and clearing access/refresh token cookies. It wraps Hono's cookie API with the framework's environment-based naming and defaults.

## Cookie Utility

```ts
import { cookie } from "@/framework/facade.js";
```

| Method | Purpose |
|---|---|
| `cookie.setAuth(c, token)` | Sets the access token cookie (`{COOKIE_NAME}_access`) with the configured access expiry. Use on login/register/refresh. |
| `cookie.setRefresh(c, token, maxAge?)` | Sets the refresh token cookie (`{COOKIE_NAME}_refresh`) with the configured refresh expiry. Use on login/register/refresh. |
| `cookie.getAuth(c)` | Reads the access token cookie from the request context. Use in auth middleware or helpers. |
| `cookie.getRefresh(c)` | Reads the refresh token cookie from the request context. Use in refresh/logout flows. |
| `cookie.deleteAuth(c)` | Clears the access token cookie. Use on logout or invalid token. |
| `cookie.deleteRefresh(c)` | Clears the refresh token cookie. Use on logout or invalid token. |

## Usage

### Set cookies on login

```ts
import { cookie } from "@/framework/facade.js";

cookie.setAuth(c, accessToken);
cookie.setRefresh(c, refreshToken);
// Optionally override refresh maxAge
cookie.setRefresh(c, refreshToken, 604800); // 7 days
```

### Read cookies in middleware

```ts
const accessToken = cookie.getAuth(c);
const refreshToken = cookie.getRefresh(c);
```

### Clear cookies on logout

```ts
cookie.deleteAuth(c);
cookie.deleteRefresh(c);
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `COOKIE_NAME` | `nexgen` | Prefix for auth cookie names |
| `COOKIE_SECRET` | — | **Required.** Secret for cookie signing |
| `JWT_ACCESS_EXPIRY` | `900` (15 min) | Max-Age for access cookie |
| `JWT_REFRESH_EXPIRY` | `2592000` (30 days) | Default Max-Age for refresh cookie |

All cookies are httpOnly, sameSite `Lax`, and scoped to `/`.
