# Upload — Express only

> **Express engine only.** The Hono engine parses multipart bodies natively via `c.req.parseBody()` (see [Storage > Multipart File Upload](./../storage)). The `upload` / `fields` helpers exist only on the **Express** engine, where they wrap `multer` so controllers receive ready-to-use buffers.

## Overview

`upload()` and `fields()` are middleware factories (exported from the facade) that parse `multipart/form-data` requests into **in-memory buffers** before your controller runs. Size, extension, and MIME rules are enforced in the middleware — failures turn into readable `422` errors.

## Import

```ts
import { upload, fields } from "@/framework/facade.js";
```

## Single File

Attach `upload({ field })` to a route. Multer parses the incoming file into `req.file`:

```ts
// src/modules/files/routes/api.ts
import type { Request, Response } from "express";
import {
  createRoute,
  group,
  HttpStatusCodes,
  jsonContent,
  z,
  upload,
} from "@/framework/facade.js";

const uploadRoute = createRoute({
  path: "/",
  method: "post",
  tags: ["Files"],
  request: { body: z.object({ file: z.instanceof(File) }) },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ path: z.string() }),
      "uploaded",
    ),
  },
});

export default group().api(uploadRoute, [upload({ field: "file" })], store);
```

```ts
// src/modules/files/controllers/file.controller.ts
import type { Request, Response } from "express";
import { storage } from "@/framework/facade.js";

export const store = async (req: Request, res: Response) => {
  const file = req.file; // Express.Multer.File — buffer lives in memory

  const path = await storage.disk("public").putFile("uploads", file);
  res.json({ path, url: storage.disk("public").url(path) });
};
```

## Multiple Files

Set `multiple` to the max number of files accepted on that field. Files arrive in `req.files` (an array):

```ts
export default group().api(
  uploadImagesRoute,
  [upload({ field: "images", multiple: 5, maxSize: 2 * 1024 * 1024 })],
  storeMany,
);
```

```ts
import type { Request, Response } from "express";

export const storeMany = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[]; // up to 5 files
  res.json({ count: files.length });
};
```

## Multiple Labeled Fields

Use `fields()` when one request carries several different inputs (avatar + document). `req.files` becomes an object keyed by field name:

```ts
export default group().api(
  profileRoute,
  [
    fields([
      { name: "avatar", maxCount: 1 },
      { name: "docs", maxCount: 5 },
    ]),
  ],
  storeProfile,
);
```

```ts
import type { Request, Response } from "express";

export const storeProfile = (req: Request, res: Response) => {
  const avatar = (req.files as Record<string, Express.Multer.File[]>)[
    "avatar"
  ]?.[0];
  const docs =
    (req.files as Record<string, Express.Multer.File[]>)["docs"] ?? [];
  res.json({ avatar: avatar?.originalname, docs: docs.length });
};
```

## Options

| Option                          | Type                             | `upload()` | `fields()` | Description                                                               |
| ------------------------------- | -------------------------------- | ---------- | ---------- | ------------------------------------------------------------------------- |
| `field`                         | `string`                         | ✅         | —          | Form field name holding the file(s)                                       |
| `multiple`                      | `number`                         | ✅         | —          | When set, accept up to N files on the field (arrays into `req.files`)     |
| `maxSize`                       | `number` (bytes)                 | ✅         | ✅         | Max file size; default unlimited                                          |
| `allowedExtensions`             | `string[]` (lowercase, with dot) | ✅         | ✅         | e.g. `[".xlsx", ".xlsb"]` — others rejected with 422                      |
| `allowedMimeTypes`              | `string[]`                       | ✅         | ✅         | e.g. `["application/pdf"]`; when combined with extensions, both must pass |
| `maxCount` (in `fields()` spec) | `number`                         | —          | ✅         | Max files for one labeled field                                           |

## Error Handling

All failures are normalized to `422` with clear messages, so your controller only runs on a valid upload:

| Condition                  | Message                            |
| -------------------------- | ---------------------------------- |
| No file received           | `File required`                    |
| Size over `maxSize`        | `File size must be less than 2 MB` |
| Extension not allowed      | `File must be .jpg or .png`        |
| MIME type not allowed      | `File type <mime> is not allowed`  |
| More files than `maxCount` | `Too many files, max 5 allowed`    |

## Notes

- Uses **memory storage** — buffers land in `req.file` / `req.files`, not on disk. Persist them with `storage.put*` (see [Storage](./../storage)).
- For the Hono engine, use `c.req.parseBody()` and `storage.disk("public").putFile(...)` instead.
