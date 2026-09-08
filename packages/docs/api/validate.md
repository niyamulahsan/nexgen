# `validate` — schema validation

Imported from the facade: `import { validate, z } from "@/framework/facade.js"`.

Runs any Zod schema against untrusted input (request bodies outside OpenAPI routes, config values, webhook payloads) and throws a consistent `422` failure on mismatch. See [OpenAPI](./../guide/openapi).

## Functions

| Function | Signature | Description |
| --- | --- | --- |
| `validate` | `(schema: z.ZodTypeAny, data: unknown) => Promise<z.infer<T>>` | Runs `safeParseAsync`; returns typed data or throws a `422` error |

## Use cases

### Validate a plain request body

```ts
import { validate } from "@/framework/facade.js";

export const store = async (c) => {
  const body = await validate(CreatePostSchema, await c.req.json());
  // body is inferred from CreatePostSchema — no casts needed
};
```

### Structured failure shape

When validation fails, `validate` throws an object that the error handler renders as `422`:

```ts
try {
  await validate(CreatePostSchema, rawBody);
} catch (error) {
  // error.status === 422
  // error.message === "Validation failed"
  // error.errors === result.error.flatten()  // { formErrors, fieldErrors }
}
```

### Validate non-HTTP input

```ts
import { validate, z } from "@/framework/facade.js";

const ConfigSchema = z.object({
  host: z.string(),
  port: z.coerce.number().int(),
});

// Throws 422-shaped error when env/input is invalid
const config = await validate(ConfigSchema, { host, port });
```

### Real world — route schemas in the `type` module

Query/params schemas use `z.coerce` so `"?page=3"` arrives as a real number, and tiny response schemas stay inline in routes:

```ts
// modules/type/controllers/type.schema.ts
export const TypeItemSchema = z.object({ id: z.number(), name: z.string() });
export const TypeIdParamsSchema = z.object({ id: z.coerce.number().int().positive() });
export const TypeQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().optional(),
  size: z.coerce.number().optional(),
  per_page: z.coerce.number().optional(),
});
```

```ts
// modules/auth/routes/api.ts — composed response schema
responses: {
  [HttpStatusCodes.OK]: jsonContent(
    z.object({ message: z.string(), data: z.array(UserSchema) }),
    "User list"
  ),
}
```

## Notes

- Prefer OpenAPI route schemas in endpoints — Hono validates automatically via `c.req.valid("json")`. Use `validate` when schema validation is needed outside the route layer.
- The thrown value is a plain object (not an `Error` instance) so the framework's error middleware can map it directly to an HTTP `422` response.