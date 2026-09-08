# `z` — extended Zod for OpenAPI

Imported from the facade: `import { z } from "@/framework/facade.js"`.

The frontend of `@hono/zod-openapi` — the Zod namespace with `.openapi()`, which attaches examples/descriptions and names schemas so the Scalar UI renders them. See [OpenAPI](./../guide/openapi).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `z` | `ZodNamespace` | Extended Zod from `@hono/zod-openapi` (adds `.openapi()`) |
| `z.any().openapi(meta)` | `(meta) => Z` | Attach `{ example, description, ... }` metadata |
| `z.any().openapi("Name")` | `(name) => Z` | Name the schema in the generated spec |

## Use cases

### Schema with examples

```ts
const PostSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  title: z.string().min(1).openapi({ example: "Hello World" }),
}).openapi("Post");
```

### Request coercion

`z.coerce` turns query/params strings into real numbers:

```ts
// modules/type/controllers/type.schema.ts
export const TypeIdParamsSchema = z.object({ id: z.coerce.number().int().positive() });
export const TypeQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().optional(),
  size: z.coerce.number().optional(),
  per_page: z.coerce.number().optional(),
});
```

### Inline response composition

Tiny response shapes stay inline in routes (`auth/routes/api.ts`):

```ts
responses: {
  [HttpStatusCodes.OK]: jsonContent(
    z.object({ message: z.string(), data: z.array(UserSchema) }),
    "User list",
  ),
}
```

## Notes

- Import `z` from the facade — never from `zod` directly — so `.openapi()` metadata flows into the spec.
- Enhancements auto-populate the Scalar UI at `/api-docs` when `OPEN_API=true`.
- Prefer `z.coerce.number()` for query/params so `"?page=3"` arrives as a number.

## Related

- [createRoute](./createRoute) · [validate](./validate) · [jsonContent](./jsonContent)