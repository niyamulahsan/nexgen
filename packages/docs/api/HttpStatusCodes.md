# `HttpStatusCodes` — status code constants

Imported from the facade: `import { HttpStatusCodes } from "@/framework/facade.js"`.

Numeric HTTP status constants (from `stoker`) used in `createRoute` responses and controller responses (`c.json(..., status)` on Hono / `res.status(status).json(...)` on Express). See [OpenAPI](./../guide/openapi).

## Signature

| Function          | Signature | Description                        |
| ----------------- | --------- | ---------------------------------- |
| `HttpStatusCodes` | `const`   | Numeric HTTP status code constants |

Common values:

| Constant                       | Value | Constant                                | Value |
| ------------------------------ | ----- | --------------------------------------- | ----- |
| `HttpStatusCodes.OK`           | `200` | `HttpStatusCodes.NOT_FOUND`             | `404` |
| `HttpStatusCodes.CREATED`      | `201` | `HttpStatusCodes.INTERNAL_SERVER_ERROR` | `500` |
| `HttpStatusCodes.UNAUTHORIZED` | `401` | `HttpStatusCodes.UNPROCESSABLE_ENTITY`  | `422` |
| `HttpStatusCodes.FORBIDDEN`    | `403` | `HttpStatusCodes.TOO_MANY_REQUESTS`     | `429` |

## Use cases

### Route responses

```ts
createRoute({
  path: "/login",
  method: "post",
  tags: ["Auth"],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(AuthResponseSchema, "Logged in"),
  },
});
```

### Real world — controller responses

::: code-group

```ts [Hono]
if (!user || !(await password.verifyPassword(body.password, user.password))) {
  return c.json(
    { message: "Invalid credentials" },
    HttpStatusCodes.UNAUTHORIZED,
  );
}
if (authConfig.requireEmailVerification && !user.emailVerifiedAt) {
  return c.json(
    { message: "Please verify your email before logging in" },
    HttpStatusCodes.FORBIDDEN,
  );
}
return c.json(
  { message: "User logged in successfully", data },
  HttpStatusCodes.OK,
);
```

```ts [Express]
if (!user || !(await password.verifyPassword(body.password, user.password))) {
  return res
    .status(HttpStatusCodes.UNAUTHORIZED)
    .json({ message: "Invalid credentials" });
}
if (authConfig.requireEmailVerification && !user.emailVerifiedAt) {
  return res
    .status(HttpStatusCodes.FORBIDDEN)
    .json({ message: "Please verify your email before logging in" });
}
res
  .status(HttpStatusCodes.OK)
  .json({ message: "User logged in successfully", data });
```

:::

## Notes

- Keys must match OpenAPI numeric keys for `createRoute` responses.
- **Coverage differs by engine:** Hono re-exports the **full** `stoker/http-status-codes` set (every name). Express ships a **curated subset** (the common codes above plus `GONE`/`PAYLOAD_TOO_LARGE`/`URI_TOO_LONG`/`UNSUPPORTED_MEDIA_TYPE`/`GATEWAY_TIMEOUT`, defined in `src/framework/facade.ts`). The docs use only a handful of names — all present on both engines.
- **Adding a missing code on Express:** append it to `HttpStatusCodes` in `src/framework/facade.ts` with the stoker-matching numeric value.

## Related

- [createRoute](./createRoute) · [jsonContent](./jsonContent)
