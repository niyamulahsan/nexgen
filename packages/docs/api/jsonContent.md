# `jsonContent` — JSON media-type wrapper

Imported from the facade: `import { jsonContent } from "@/framework/facade.js"`.

Wraps a Zod schema as an `application/json` media type with a description — used in `createRoute` `request.body` and `responses`. See [OpenAPI](./../guide/openapi).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `jsonContent` | `(schema, description) => { content }` | Wrap a schema as a JSON media type with description |

## Use cases

### Response

```ts
responses: {
  [HttpStatusCodes.OK]: jsonContent(z.array(PostSchema), "list of posts"),
  [HttpStatusCodes.CREATED]: jsonContent(PostSchema, "created post"),
}
```

### Request body

```ts
request: { body: jsonContent(CreatePostSchema, "post data") },
```

## Notes

- Works with any `z` schema — including inline `z.object({ message, data })` wrappers and `z.array(...)`.
- Combined with `HttpStatusCodes` in `responses`, it drives the Scalar UI.

## Related

- [createRoute](./createRoute) · [z](./z) · [HttpStatusCodes](./HttpStatusCodes)