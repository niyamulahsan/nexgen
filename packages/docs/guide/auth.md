# Authentication

## Overview

The auth system uses a **dual-token JWT strategy** with automatic refresh:

- **Access token** (short-lived, 15 min default) — stored in httpOnly cookie, sent on every request
- **Refresh token** (long-lived, 30 days default) — stored in httpOnly cookie, used to silently rotate access tokens when they expire

The middleware handles transparent token refresh — clients never need to implement refresh logic.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JWT_ACCESS_SECRET` | — | **Required.** Secret for signing access tokens (HS256) |
| `JWT_REFRESH_SECRET` | — | **Required.** Secret for signing refresh tokens (HS256) |
| `JWT_ACCESS_EXPIRY` | `900` (15 min) | Access token TTL in seconds |
| `JWT_REFRESH_EXPIRY` | `2592000` (30 days) | Refresh token TTL in seconds |
| `JWT_REFRESH_REMEMBER_EXPIRY` | `604800` (7 days) | Refresh token TTL when "remember me" is checked |
| `COOKIE_NAME` | `nexgen` | Prefix for auth cookies (`{name}_access`, `{name}_refresh`) |
| `COOKIE_SECRET` | — | **Required.** Secret for cookie signing |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | `false` | Require email verification before login |

## Auth Flow

```
Client                          Server
  │                                │
  │  POST /api/auth/login          │
  │  { email, password }           │
  │ ───────────────────────────>   │
  │                                │  verify password
  │                                │  generate access + refresh tokens
  │                                │  store refresh token in DB (jti)
  │                                │  set httpOnly cookies
  │ <───────────────────────────   │
  │  200 { user, access_token }    │
  │                                │
  │  GET /api/auth/me              │
  │  (cookie: nexgen_access=...)   │
  │ ───────────────────────────>   │
  │                                │  authMiddleware reads cookie
  │                                │  verifies JWT
  │                                │  c.set("auth", user)
  │ <───────────────────────────   │
  │  200 { user }                  │
```

## Auth Middleware

The `authMiddleware` protects routes. It always returns 401 if unauthenticated:

```ts
import { authMiddleware } from "@/middlewares/auth-middleware.js";
```

**Logic:**
1. Read `{COOKIE_NAME}_access` cookie → verify JWT → set `c.set("auth", { id, email, roleId, role })`
2. If access token expired/missing → read `{COOKIE_NAME}_refresh` cookie → verify JWT → check `jti` in DB → issue **new** access token → set new cookie
3. If nothing valid → return 401

The `auth` object is available in all protected handlers:

```ts
export const me: Handler = async (c: any) => {
  const auth = c.get("auth");
  // auth.id, auth.email, auth.roleId, auth.role
};
```

## API Routes

All mounted at `/api/auth/`.

### Public

| Method | Path | Handler | Description |
|---|---|---|---|
| `POST` | `/register` | register | Create account |
| `POST` | `/login` | login | Sign in |
| `POST` | `/forgot-password` | forgotPassword | Request reset email |
| `POST` | `/reset-password` | resetPassword | Reset with token |
| `POST` | `/verify-email` | verifyEmail | Verify email address |
| `POST` | `/refresh-token` | refreshToken | Exchange refresh token for new pair |

### Protected (authMiddleware)

| Method | Path | Handler | Description |
|---|---|---|---|
| `GET` | `/me` | me | Current user profile |
| `POST` | `/logout` | logout | Revoke current session |
| `POST` | `/logout-all` | logoutAllDevices | Revoke all sessions |

## Role Middleware

Use `requireRole()` to restrict routes to specific roles:

```ts
import { requireRole } from "@/middlewares/role-middleware.js";
import { authMiddleware } from "@/middlewares/auth-middleware.js";

router.api(route, [authMiddleware, requireRole("admin")], handler);
```

Returns `401` if unauthenticated, `403` if wrong role.

## Token System

### Access Token

- Algorithm: HS256
- Secret: `JWT_ACCESS_SECRET`
- Default expiry: 15 min (`JWT_ACCESS_EXPIRY`)
- Stored in cookie: `{COOKIE_NAME}_access`

### Refresh Token

- Algorithm: HS256
- Secret: `JWT_REFRESH_SECRET`
- Default expiry: 30 days (`JWT_REFRESH_EXPIRY`)
- With "remember me": 7 days (`JWT_REFRESH_REMEMBER_EXPIRY`)
- Stored in cookie: `{COOKIE_NAME}_refresh`
- Tracked in DB: `refresh_tokens` table by `jti` (unique JWT ID)
- Can be revoked (logout, password reset)

### Token Verification

```ts
import { jwt } from "@/framework/facade.js";

const payload = await jwt.verifyToken(token, "access");
// null if expired, bad signature, or wrong type
```

## Password Hashing

Uses **bcrypt** (cost factor 10):

```ts
import { password } from "@/framework/facade.js";

const hash = await password.hashPassword(plainPassword);
const match = await password.verifyPassword(plainPassword, hash);
```

## Cookies

All auth cookies are `httpOnly`, `sameSite: "Lax"`, `path: "/"`:

| Cookie | Contents | Max-Age |
|---|---|---|
| `{COOKIE_NAME}_access` | JWT access token | `JWT_ACCESS_EXPIRY` |
| `{COOKIE_NAME}_refresh` | JWT refresh token | `JWT_REFRESH_EXPIRY` |

## Session

The session system manages guest sessions via a separate cookie:

```ts
import { session } from "@/framework/facade.js";

// Available in any request via c.get("sessionId")
await session.put(sessionId, "cart", items);
const cart = await session.get(sessionId, "cart");
```

- Cookie: `SESSION_COOKIE` (default `nexgen_session`)
- Backend: Redis (gracefully no-op if Redis is off)
- TTL: `SESSION_TTL_SECONDS` (default 2 hours)

Session is separate from auth — it works for both guests and logged-in users.

## Database Models

### users

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | auto-increment |
| `name` | varchar(255) | |
| `email` | varchar(255) | unique |
| `password` | text | bcrypt hash |
| `roleId` | int FK → roles.id | set null on delete |
| `emailVerifiedAt` | timestamp | nullable |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### roles

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | auto-increment |
| `name` | varchar(255) | unique |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### refresh_tokens

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | auto-increment |
| `userId` | int FK → users.id | set null on delete |
| `jti` | varchar(191) | unique, JWT ID |
| `revoked` | boolean | default false |
| `expiresAt` | timestamp | |
| `createdAt` | timestamp | |

Usage example with route definition:

```ts
// src/modules/posts/routes/api.ts
import { createRoute, createRouter } from "@/framework/facade.js";
import { authMiddleware } from "@/middlewares/auth-middleware.js";
import { requireRole } from "@/middlewares/role-middleware.js";
import { list, create, update, remove } from "../controllers/post.controller.js";

// Public
const listRoute = createRoute({ path: "/", method: "get", ... });

// Protected — any authenticated user
const createRouteDef = createRoute({ path: "/", method: "post", ... });

// Protected — admin only
const adminRoute = createRoute({ path: "/{id}", method: "delete", ... });

export default createRouter()
  .api(listRoute, list)
  .api(createRouteDef, [authMiddleware], create)
  .api(adminRoute, [authMiddleware, requireRole("admin")], remove);
```

## Email Verification

When `AUTH_REQUIRE_EMAIL_VERIFICATION=true`:

1. Registration creates a `email_verification_tokens` record (24h expiry)
2. Dispatches `"user:verify-email"` job to send email
3. User clicks link → `POST /api/auth/verify-email` with `email` + `token`
4. `emailVerifiedAt` is set, user can now login

## Forgot / Reset Password

1. `POST /api/auth/forgot-password` — creates `password_reset_tokens` record (15 min expiry), sends email
2. User clicks link → `POST /api/auth/reset-password` with `email` + `token` + new `password`
3. Password is updated, all refresh tokens revoked (logs out all devices)
