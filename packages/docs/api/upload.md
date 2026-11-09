# `upload` / `fields` — file upload middleware (Express and Fastify)

> **Express and Fastify engines.** Backed by `multer` (memory storage) on Express and `@fastify/multipart` on Fastify. On Hono, use `c.req.parseBody()` instead. See [Upload guide](./../guide/support/upload).

Imported from the facade: `import { upload, fields } from "@/framework/facade.js"`.

Parser factories for `multipart/form-data` requests. They parse before the controller runs so handlers receive ready-to-use buffers (`req.file` / `req.files` on Express, `request.upload` / `request.uploads` on Fastify) with size/extension/MIME rules already enforced.

## Functions

| Function | Signature                                              | Description                                                                                       |
| -------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `upload` | `(options: UploadOptions) => RequestHandler`           | Parse a single file (or up to `multiple` files) from one form field into `req.file` / `req.files` |
| `fields` | `(spec: UploadFieldsSpec, options?) => RequestHandler` | Parse multiple labeled file fields into `req.files` (object keyed by field name)                  |

On Fastify both factories return a `preHandler` hook of the same shape.

### `UploadOptions`

| Option              | Type       | Description                                                      |
| ------------------- | ---------- | ---------------------------------------------------------------- |
| `field`             | `string`   | Form field name that carries the file(s)                         |
| `multiple`          | `number`   | Accept an array of up to N files on the field                    |
| `maxSize`           | `number`   | Max allowed file size in bytes (default unlimited)               |
| `allowedExtensions` | `string[]` | Lowercase extensions with dot, e.g. `[".xlsx"]`                  |
| `allowedMimeTypes`  | `string[]` | Allowed MIME types; both extension and MIME type must be allowed |

### `UploadFieldsSpec`

| Field      | Type     | Description                     |
| ---------- | -------- | ------------------------------- |
| `name`     | `string` | Form field name                 |
| `maxCount` | `number` | Max files for one labeled field |

### `UploadFieldsOptions`

| Option              | Type       | Description                                                      |
| ------------------- | ---------- | ---------------------------------------------------------------- |
| `maxSize`           | `number`   | Max allowed file size in bytes (default unlimited)               |
| `allowedExtensions` | `string[]` | Lowercase extensions with dot, e.g. `[".xlsx"]`                  |
| `allowedMimeTypes`  | `string[]` | Allowed MIME types; both extension and MIME type must be allowed |

## Use cases

### Route-level enforcement

On Express, enforce rules before the controller runs by passing the middleware into `.api()`:

```ts
import { createRoute, group, z, upload } from "@/framework/facade.js";
import type { Request, Response } from "express";

export default group().api(
  uploadRoute,
  [
    upload({
      field: "file",
      maxSize: 2 * 1024 * 1024,
      allowedExtensions: [".jpg", ".png"],
    }),
  ],
  (req: Request, res: Response) => {
    res.json(req.file);
  },
);
```

On Fastify, pass the same factory as a `preHandler`:

```ts
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { upload } from "@/framework/facade.js";

const routes: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: "POST",
    url: "/",
    preHandler: upload({
      field: "file",
      maxSize: 2 * 1024 * 1024,
      allowedExtensions: [".jpg", ".png"],
    }),
    handler: async (request, reply) => reply.code(200).send(request.upload),
  });
};

export default routes;
```

### Combined with other middleware

`upload()` composes with auth/role middleware like any other middleware:

```ts
// Express
export default group().api(
  avatarRoute,
  [requireRole("user"), upload({ field: "avatar" })],
  storeAvatar,
);

// Fastify
app.route({
  method: "POST",
  url: "/avatar",
  preHandler: [requireRole("user"), upload({ field: "avatar" })],
  handler: storeAvatar,
});
```

### Failure shape

Failures surface as `422` before the controller runs, so handlers never receive a missing/wrong file:

```ts
// error.status === 422
// error.message === "File size must be less than 2 MB"
// error.message === "File must be .jpg or .png"
// error.message === "File type image/gif is not allowed"
// error.message === "Too many files, max 3 allowed"
// error.message === "File required"
```

## Notes

- Memory storage only — buffers live in `req.file` / `req.files` (Express) or `request.upload` / `request.uploads` (Fastify); persist with `storage.putFile` etc. (see [Storage > Multipart File Upload](/guide/storage#multipart-file-upload)).
- Both exports are available on Express and Fastify only; Hono apps parse bodies via `c.req.parseBody()`.
