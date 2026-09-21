# `upload` / `fields` — file upload middleware (Express only)

> **Express engine only.** On Hono, use `c.req.parseBody()` instead. See [Upload guide](./../guide/support/upload).

Imported from the facade: `import { upload, fields } from "@/framework/facade.js"`.

Parser factories for `multipart/form-data` requests. They wrap `multer` (memory storage) so controllers receive ready-to-use buffers (`req.file` / `req.files`) with size/extension/MIME rules already enforced.

## Functions

| Function | Signature | Description |
| --- | --- | --- |
| `upload` | `(options: UploadOptions) => RequestHandler` | Parse a single file (or up to `multiple` files) from one form field into `req.file` / `req.files` |
| `fields` | `(spec: UploadFieldsSpec, options?) => RequestHandler` | Parse multiple labeled file fields into `req.files` (object keyed by field name) |

### `UploadOptions`

| Option | Type | Description |
| --- | --- | --- |
| `field` | `string` | Form field name that carries the file(s) |
| `multiple` | `number` | Accept an array of up to N files on the field |
| `maxSize` | `number` | Max allowed file size in bytes (default unlimited) |
| `allowedExtensions` | `string[]` | Lowercase extensions with dot, e.g. `[".xlsx"]` |
| `allowedMimeTypes` | `string[]` | Allowed MIME types; both extension and MIME type must be allowed |

### `UploadFieldsSpec`

| Field | Type | Description |
| --- | --- | --- |
| `name` | `string` | Form field name |
| `maxCount` | `number` | Max files for one labeled field |

### `UploadFieldsOptions`

| Option | Type | Description |
| --- | --- | --- |
| `maxSize` | `number` | Max allowed file size in bytes (default unlimited) |
| `allowedExtensions` | `string[]` | Lowercase extensions with dot, e.g. `[".xlsx"]` |
| `allowedMimeTypes` | `string[]` | Allowed MIME types; both extension and MIME type must be allowed |

## Use cases

### Route-level enforcement

Enforce rules before the controller runs by passing the middleware into `.api()`:

```ts
import { createRoute, group, z, upload } from "@/framework/facade.js";
import type { Request, Response } from "express";

export default group().api(
  uploadRoute,
  [upload({ field: "file", maxSize: 2 * 1024 * 1024, allowedExtensions: [".jpg", ".png"] })],
  (req: Request, res: Response) => {
    res.json(req.file);
  },
);
```

### Combined with other middleware

`upload()` composes with auth/role middleware like any other `RequestHandler`:

```ts
export default group().api(
  avatarRoute,
  [requireRole("user"), upload({ field: "avatar" })],
  storeAvatar,
);
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

- Memory storage only — buffers live in `req.file` / `req.files`; persist with `storage.putFile` etc. (see [Storage](./../guide/storage)).
- Express-only export: importing from a Hono project fails at type-check; Hono apps parse bodies via `c.req.parseBody()`.