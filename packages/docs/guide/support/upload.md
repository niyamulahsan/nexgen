# Upload

> **Express and Fastify.** Both engines offer the same `upload()` and `fields()` helpers, backed by `multer` on Express and `@fastify/multipart` on Fastify. The Hono engine parses multipart bodies natively via `c.req.parseBody()` (see [Storage > Multipart File Upload](/guide/storage#multipart-file-upload)).

## Overview

`upload()` and `fields()` are middleware factories exported from the facade. They parse `multipart/form-data` into **in-memory buffers** before your controller runs. Size, extension, and MIME rules are enforced in the middleware — failures turn into readable `422` errors.

| Engine  | Attach as        | File lands on                        |
| ------- | ---------------- | ------------------------------------ |
| Express | route middleware | `req.file` / `req.files`             |
| Fastify | `preHandler`     | `request.upload` / `request.uploads` |

## Import

```ts
import { upload, fields } from "@/framework/facade.js";
```

## Single File

::: code-group

```ts [Express]
// src/modules/files/routes/index.ts
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

```ts [Fastify]
// src/modules/files/routes/index.ts
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { HttpStatusCodes, upload, z } from "@/framework/facade.js";
import { store } from "@/modules/files/controllers/file.js";

const fileRoutes: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["Files"],
      response: {
        [HttpStatusCodes.OK]: z.object({ path: z.string(), url: z.string() }),
      },
    },
    preHandler: upload({ field: "file" }),
    handler: store,
  });
};

export default fileRoutes;
```

:::

```ts
// src/modules/files/controllers/file.ts — Express
import type { Request, Response } from "express";
import { storage } from "@/framework/facade.js";

export const store = async (req: Request, res: Response) => {
  const file = req.file; // Express.Multer.File — buffer lives in memory

  const path = await storage.disk("public").putFile("uploads", file);
  res.json({ path, url: storage.disk("public").url(path) });
};
```

```ts
// src/modules/files/controllers/file.ts — Fastify
import type { FastifyReply, FastifyRequest } from "fastify";
import { storage } from "@/framework/facade.js";

export const store = async (request: FastifyRequest, reply: FastifyReply) => {
  const file = request.upload!; // UploadedFile — buffer lives in memory

  const path = await storage.disk("public").putFile("uploads", file);
  return reply.code(200).send({ path, url: storage.disk("public").url(path) });
};
```

## Multiple Files

Set `multiple` to the max number of files accepted on that field. Files arrive in `req.files` on Express and `request.uploads` on Fastify (an array):

```ts
export default group().api(
  uploadImagesRoute,
  [upload({ field: "images", multiple: 5, maxSize: 2 * 1024 * 1024 })],
  storeMany,
);
```

```ts
// Fastify
app.route({
  method: "POST",
  url: "/images",
  preHandler: upload({ field: "images", multiple: 5, maxSize: 2 * 1024 * 1024 }),
  handler: storeMany,
});
```

```ts
// Express
export const storeMany = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[]; // up to 5 files
  res.json({ count: files.length });
};

// Fastify
export const storeMany = async (request: FastifyRequest, reply: FastifyReply) => {
  const files = request.uploads as UploadedFile[]; // up to 5 files
  return reply.code(200).send({ count: files.length });
};
```

## Multiple Labeled Fields

Use `fields()` when one request carries several different inputs (avatar + document).

::: code-group

```ts [Express]
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

```ts [Fastify]
app.route({
  method: "POST",
  url: "/profile",
  preHandler: fields([
    { name: "avatar", maxCount: 1 },
    { name: "docs", maxCount: 5 },
  ]),
  handler: storeProfile,
});
```

:::

On Express, `req.files` becomes an object keyed by field name:

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

On Fastify, `request.uploads` is the same labeled map:

```ts
import type { FastifyReply, FastifyRequest } from "fastify";

export const storeProfile = (request: FastifyRequest, reply: FastifyReply) => {
  const uploads = request.uploads as Record<string, UploadedFile[]>;
  const avatar = uploads["avatar"]?.[0];
  const docs = uploads["docs"] ?? [];
  return reply.code(200).send({ avatar: avatar?.originalname, docs: docs.length });
};
```

## Options

| Option                          | Type                             | `upload()` | `fields()` | Description                                                                               |
| ------------------------------- | -------------------------------- | ---------- | ---------- | ----------------------------------------------------------------------------------------- |
| `field`                         | `string`                         | ✅          | —          | Form field name holding the file(s)                                                       |
| `multiple`                      | `number`                         | ✅          | —          | When set, accept up to N files on the field (arrays into `req.files` / `request.uploads`) |
| `maxSize`                       | `number` (bytes)                 | ✅          | ✅          | Max file size; default unlimited                                                          |
| `allowedExtensions`             | `string[]` (lowercase, with dot) | ✅          | ✅          | e.g. `[".xlsx", ".xlsb"]` — others rejected with 422                                      |
| `allowedMimeTypes`              | `string[]`                       | ✅          | ✅          | e.g. `["application/pdf"]`; when combined with extensions, both must pass                 |
| `maxCount` (in `fields()` spec) | `number`                         | —          | ✅          | Max files for one labeled field                                                           |

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

- Uses **memory storage** — buffers land in `req.file` / `req.files` (Express) or `request.upload` / `request.uploads` (Fastify), not on disk. Persist them with `storage.put*` (see [Storage guide > Multipart File Upload](/guide/storage#multipart-file-upload)).
- For the Hono engine, use `c.req.parseBody()` and `storage.disk("public").putFile(...)` instead.
