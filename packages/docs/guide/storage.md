# Storage

## Overview

The storage facade provides a unified API for **local disk** and **S3-compatible** storage. Swap drivers by changing `driver (config/storage.ts)` — no code changes needed.

## Disks

Three isolated disk pools:

| Disk      | Purpose                         | Local path                 |
| --------- | ------------------------------- | -------------------------- |
| `public`  | Public files (avatars, uploads) | `src/storage/app/public/`  |
| `private` | User-specific / sensitive files | `src/storage/app/private/` |
| `tmp`     | Ephemeral generated files       | `src/storage/app/tmp/`     |

Set the default disk in `src/config/storage.ts`:

## Configuration

```bash
export const storageConfig = {
  driver: "local",              # local or s3
  defaultDisk: "public",        # default disk
  bucket: "",
  region: "us-east-1",
  endpoint: "",                 # S3-compatible endpoint URL
  forcePathStyle: false,
  signedUrlTtlSeconds: 900,
  accessKeyId: env.STORAGE_ACCESS_KEY_ID,
  secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY
};
```

## Usage

Import from the facade:

```ts
import { storage } from "@/framework/facade.js";
```

### Default Disk

Top-level methods use the default disk (configured in `src/config/storage.ts`):

```ts
const fileBuffer = Buffer.from("avatar bytes"); // e.g. fs.readFile(...) or an upload
await storage.put("avatars/user-1.jpg", fileBuffer);
const data = await storage.get("avatars/user-1.jpg");
await storage.delete("avatars/user-1.jpg");
```

### Explicit Disk

Use `disk()` to target a specific disk:

```ts
const disk = storage.disk("private");
const pdfBuffer = Buffer.from("%PDF-1.4 ..."); // e.g. playwright.pdf() output

await disk.put("invoices/42.pdf", pdfBuffer);
await disk.get("invoices/42.pdf");
await disk.exists("invoices/42.pdf");
```

## Function Reference

### File Operations

| Method                            | Description                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `put(file, data)`                 | Write a file. `data` can be string, Buffer, Uint8Array, ArrayBuffer, Blob, or File |
| `putFile(directory, file, name?)` | Store a browser `File`/`Blob` with unique naming                                   |
| `get(file)`                       | Read file content as Buffer                                                        |
| `delete(file)`                    | Remove a file                                                                      |
| `copy(from, to)`                  | Duplicate a file within the same disk                                              |
| `move(from, to)`                  | Rename or relocate a file                                                          |
| `exists(file)`                    | Check if file exists                                                               |
| `missing(file)`                   | Inverse of `exists` — `true` when file does not exist                              |

### Metadata

| Method               | Returns  | Description                                              |
| -------------------- | -------- | -------------------------------------------------------- |
| `size(file)`         | `number` | File size in bytes                                       |
| `mimeType(file)`     | `string` | MIME type (always `"application/octet-stream"` on local) |
| `lastModified(file)` | `number` | Last modified timestamp (ms)                             |

### Directory Operations

| Method                       | Description                             |
| ---------------------------- | --------------------------------------- |
| `files(directory?)`          | List file names in a directory          |
| `directories(directory?)`    | List subdirectory names                 |
| `makeDirectory(directory)`   | Create a directory                      |
| `deleteDirectory(directory)` | Remove a directory and all its contents |

### Streaming

| Method                      | Description                             |
| --------------------------- | --------------------------------------- |
| `readStream(file)`          | Get a `Readable` stream of file content |
| `writeStream(file, stream)` | Write a `Readable` stream to a file     |

### URLs & Visibility

| Method                            | Returns                   | Description                                        |
| --------------------------------- | ------------------------- | -------------------------------------------------- |
| `url(file)`                       | `string`                  | Public URL for the file                            |
| `temporaryUrl(file, ttl?)`        | `string`                  | Signed URL with TTL (S3) or local proxy URL        |
| `path(file)`                      | `string`                  | Absolute local filesystem path (local driver only) |
| `setVisibility(file, visibility)` | `string`                  | Toggle `"public"` / `"private"` ACL (S3 only)      |
| `getVisibility(file)`             | `"public"` \| `"private"` | Read current ACL                                   |

### Downloads

| Method                                                     | Description                                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `download(c, file, filename?)`                             | Returns a `Response` with attachment headers for controller use                      |
| `generateForDownload({ prefix, extension, data })`         | Writes a temp file (full Buffer) and returns its path for **buffered** download      |
| `generateForDownloadStream({ prefix, extension, stream })` | Pipes an inbound `Readable` to a temp file - **O(1) memory**, for very large exports |
| `consumeGenerated(file)`                                   | Reads and **deletes** a temp file — one-time download                                |

## Examples

> **Engine note:** the storage calls below are identical on both engines. Handlers are shown with Hono's `(c)` signature; on Express write `(req: Request, res: Response)` and use `req.body` / `req.params.id` / `res.status(n).json(...)` instead of `c.req.valid(...)` / `c.req.param(...)` / `c.json(...)`. Only multipart parsing differs — see the tabs below (Hono `parseBody` vs Express `upload()`).
>
> **Excel** examples use [`exceljs`](https://www.npmjs.com/package/exceljs) — install with `npm run|pnpm|yarn|bun add exceljs`.  
> **PDF** examples use [`playwright`](https://www.npmjs.com/package/playwright) — install with `npm run|pnpm|yarn|bun add playwright && npm run|pnpm|yarn|bun playwright install chromium`.

### Multipart File Upload

::: code-group

```ts [Hono]
// under controller folder *.controller.ts file

import { Hanlder } from "hono";

export const upload: Handler = async (c: any) => {
  const body = await c.req.parseBody();
  const file = body.file;

  if (!(file instanceof File)) {
    return c.json({ message: "File is required" }, 422);
  }

  const path = await storage.disk("public").putFile("uploads", file);

  return c.json({
    message: "File uploaded successfully",
    path,
    url: storage.disk("public").url(path),
  });
};
```

```ts [Express]
// under route folder *.ts file

import type { Request, Response } from "express";
import { upload } from "@/framework/facade.js";

export default group().api(
  uploadRoute,
  [
    upload({
      field: "file",
      maxSize: 2 * 1024 * 1024,
      allowedExtensions: [".jpg", ".png"],
    }),
  ],
  async (req: Request, res: Response) => {
    const file = req.file; // in-memory buffer provided by multer

    const path = await storage.disk("public").putFile("uploads", file);

    res.json({
      message: "File uploaded successfully",
      path,
      url: storage.disk("public").url(path),
    });
  },
);
```

:::

> The Express engine exposes the `upload()` / `fields()` middleware factories for multipart parsing (built on `multer`). See [Upload — Express only](./support/upload).

### Import Excel (parse uploaded .xlsx)

::: code-group

```ts [Hono]
import type { Handler } from "hono";

export const importExcel: Handler = async (c: any) => {
  const ExcelJS = (await import("exceljs")).default;

  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File))
    return c.json({ message: "File is required" }, 422);

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  const headers = sheet
    .getRow(1)
    .values.slice(1)
    .map((v: unknown) => String(v || "").trim());

  const rows: Record<string, any>[] = [];
  sheet.eachRow((row: any, rowNumber: number) => {
    if (rowNumber === 1) return;
    const record: Record<string, any> = {};
    headers.forEach((key, i) => {
      record[key] = row.values[i + 1];
    });
    rows.push(record);
  });

  return c.json({
    message: "Excel imported",
    totalRows: rows.length,
    preview: rows.slice(0, 20),
  });
};
```

```ts [Express]
import type { Request, Response } from "express";

export const importExcel = async (req: Request, res: Response) => {
  const ExcelJS = (await import("exceljs")).default;

  const buffer = req.file.buffer; // in-memory buffer from upload({ field: "file" })
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  const headers = sheet
    .getRow(1)
    .values.slice(1)
    .map((v: unknown) => String(v || "").trim());

  const rows: Record<string, any>[] = [];
  sheet.eachRow((row: any, rowNumber: number) => {
    if (rowNumber === 1) return;
    const record: Record<string, any> = {};
    headers.forEach((key, i) => {
      record[key] = row.values[i + 1];
    });
    rows.push(record);
  });

  res.json({
    message: "Excel imported",
    totalRows: rows.length,
    preview: rows.slice(0, 20),
  });
};
```

:::

> Express: read the uploaded bytes directly from `req.file.buffer` (in-memory) and process. `req.file` is `Express.Multer.File` in memory storage.

### Stream a File

```ts
import type { Handler } from "hono";

export const streamVideo: Handler = async (c: any) => {
  const stream = await storage.disk("public").readStream("videos/tutorial.mp4");
  return new Response(stream as any, {
    headers: { "content-type": "video/mp4" },
  });
};
```

### Move a File Within the Same Disk

```ts
// Rename after processing
const finalPath = await storage
  .disk("public")
  .move("uploads/temp.jpg", "images/processed.jpg");
```

### Copy Across Disks (Manual)

```ts
// Copy from tmp to public, then clean up
const data = await storage.disk("tmp").get("exports/report.csv");
await storage.disk("public").put("reports/report.csv", data);
await storage.disk("tmp").delete("exports/report.csv");
```

## S3 Provider Compatibility

| Provider            | `endpoint` (config/storage.ts)               | `forcePathStyle` |
| ------------------- | -------------------------------------------- | ---------------- |
| AWS S3              | (empty)                                      | `false`          |
| DigitalOcean Spaces | `https://<region>.digitaloceanspaces.com`    | `false`          |
| Cloudflare R2       | `https://<account>.r2.cloudflarestorage.com` | `false`          |
| MinIO               | `http://localhost:9000`                      | `true`           |
