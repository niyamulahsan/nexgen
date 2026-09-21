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
await storage.put("avatars/user-1.jpg", fileBuffer);
const data = await storage.get("avatars/user-1.jpg");
await storage.delete("avatars/user-1.jpg");
```

### Explicit Disk

Use `disk()` to target a specific disk:

```ts
const disk = storage.disk("private");

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

| Method                                             | Description                                                     |
| -------------------------------------------------- | --------------------------------------------------------------- |
| `download(c, file, filename?)`                     | Returns a `Response` with attachment headers for controller use |
| `generateForDownload({ prefix, extension, data })` | Writes a temp file (full Buffer) and returns its path for **buffered** download        |
| `generateForDownloadStream({ prefix, extension, stream })` | Pipes an inbound `Readable` to a temp file - **O(1) memory**, for very large exports |
| `consumeGenerated(file)`                           | Reads and **deletes** a temp file — one-time download           |

## Examples

> **Engine note:** the storage calls below are identical on both engines. Handlers are shown with Hono's `(c)` signature; on Express write `(req: Request, res: Response)` and use `req.body` / `req.params.id` / `res.status(n).json(...)` instead of `c.req.valid(...)` / `c.req.param(...)` / `c.json(...)`. Only multipart parsing differs — see the tabs below (Hono `parseBody` vs Express `upload()`).
>
> **Excel** examples use [`exceljs`](https://www.npmjs.com/package/exceljs) — install with `npm run|pnpm|yarn|bun add exceljs`.  
> **PDF** examples use [`playwright`](https://www.npmjs.com/package/playwright) — install with `npm run|pnpm|yarn|bun add playwright && npm run|pnpm|yarn|bun playwright install chromium`.

### Multipart File Upload

::: code-group

```ts [Hono]
export const upload: Handler = async (c) => {
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
import { upload } from "@/framework/facade.js";
import type { Request, Response } from "express";

export default group().api(
  uploadRoute,
  [upload({ field: "file", maxSize: 2 * 1024 * 1024, allowedExtensions: [".jpg", ".png"] })],
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
export const importExcel: Handler = async (c) => {
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

### Generate CSV with One-Time Download

::: code-group

```ts [Hono]
// POST /generate — create temp file
export const generateCsv: Handler = async () => {
  const csv = ["id,title", "1,nexgen report", "2,temporary file"].join("\n");
  const token = await storage.generateForDownload({
    prefix: "report",
    extension: "csv",
    data: csv,
  });
  return c.json({
    token,
    downloadUrl: `/download/${encodeURIComponent(token)}`,
  });
};

// GET /download/:token — serve once and delete
export const downloadCsv: Handler = async (c) => {
  const token = decodeURIComponent(c.req.param("token"));
  try {
    const file = await storage.consumeGenerated(token);
    return new Response(file, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=report.csv",
      },
    });
  } catch {
    return c.json({ message: "Download token expired or invalid" }, 404);
  }
};
```

```ts [Express]
// POST /generate — create temp file
export const generateCsv = async (req: Request, res: Response) => {
  const csv = ["id,title", "1,nexgen report", "2,temporary file"].join("\n");
  const token = await storage.generateForDownload({
    prefix: "report",
    extension: "csv",
    data: csv,
  });
  res.json({
    token,
    downloadUrl: `/download/${encodeURIComponent(token)}`,
  });
};

// GET /download/:token — serve once and delete
export const downloadCsv = async (req: Request, res: Response) => {
  const token = decodeURIComponent(req.params.token);
  try {
    const file = await storage.consumeGenerated(token);
    res
      .set("content-type", "text/csv; charset=utf-8")
      .set("content-disposition", "attachment; filename=report.csv")
      .send(file);
  } catch {
    res.status(404).json({ message: "Download token expired or invalid" });
  }
};
```

:::

> `storage.consumeGenerated()` returns a `Buffer` in both engines. Hono sends it via `new Response(file, ...)`; Express sends it with `res.send(file)` after setting the content headers.

### Generate Styled Excel

```ts
export const generateExcel: Handler = async (c: any) => {
  const ExcelJS = (await import("exceljs")).default;
  const body = c.req.valid("json") as { title: string };

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Data");

  // Title row
  sheet.mergeCells("A1:C1");
  sheet.getCell("A1").value = body.title;
  sheet.getCell("A1").font = { bold: true, size: 14 };

  // Header row
  sheet.addRow(["ID", "Title", "Length"]);
  sheet.getRow(2).font = { bold: true };

  // Data rows
  const rows = [
    { id: 1, title: "nexgen framework" },
    { id: 2, title: "file generation" },
  ];
  for (const row of rows) {
    sheet.addRow([row.id, row.title, row.title.length]);
  }

  // Totals
  sheet.addRow([
    "Subtotal",
    rows.length,
    { formula: `SUM(C3:C${2 + rows.length})` },
  ]);
  sheet.addRow([
    "Grand Total",
    rows.length,
    { formula: `SUM(C3:C${2 + rows.length})` },
  ]);

  sheet.columns = [{ width: 10 }, { width: 38 }, { width: 14 }];

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const token = await storage.generateForDownload({
    prefix: "report",
    extension: "xlsx",
    data: buffer,
  });

  return c.json({
    token,
    downloadUrl: `/download/excel/${encodeURIComponent(token)}`,
  });
};
```

### Stream Excel for Very Large Data (`generateForDownloadStream`)

> **Why this exists:** `generateForDownload({ data })` and `workbook.xlsx.writeBuffer()` hold the **entire workbook in RAM**. For very large exports that memory spike can OOM the process. `generateForDownloadStream` pipes an inbound `Readable` to a temp file with backpressure — memory stays bounded regardless of data size.

> **exceljs API note:** exceljs exposes `write(target)` (pipes the workbook into a `Writable`), `writeBuffer()` (returns the whole `Buffer` — RAM heavy) and `writeFile(path)` — but **`workbook.xlsx.writeStream()` does NOT exist**. Do not emit `workbook.xlsx.writeStream()`; use the `PassThrough` bridge below instead.
>
> The bridge pattern: `workbook.xlsx.write(pass)` writes into the **Writable** side of a `PassThrough`, while `generateForDownloadStream` consumes the **Readable** side. Backpressure flows through the bridge, so memory between exceljs and disk is capped at ~16KB.

::: code-group

```ts [Hono]
import { storage } from "@/framework/facade.js";
import { PassThrough } from "node:stream";
import ExcelJS from "exceljs";

// POST /report/sectorwise/export - streaming Excel for very large data
export const exportSectorwise: Handler = async (c: any) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sectorwise");

  // ...fill the sheet row by row...

  const bridge = new PassThrough();
  const pendingToken = storage.generateForDownloadStream({
    prefix: `sectorwise_${authId}`,
    extension: "xlsx",
    stream: bridge,
  });

  await workbook.xlsx.write(bridge);
  const token = await pendingToken;

  return c.json({ token, downloadUrl: `/download/excel/${encodeURIComponent(token)}` });
};
```

```ts [Express]
import { storage } from "@/framework/facade.js";
import { PassThrough } from "node:stream";
import ExcelJS from "exceljs";

// POST /report/sectorwise/export - streaming Excel for very large data
export const exportSectorwise = async (req: Request, res: Response) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sectorwise");

  // ...fill the sheet row by row...

  const bridge = new PassThrough();
  const pendingToken = storage.generateForDownloadStream({
    prefix: `sectorwise_${authId}`,
    extension: "xlsx",
    stream: bridge,
  });

  await workbook.xlsx.write(bridge);
  const token = await pendingToken;

  res.json({ token, downloadUrl: `/download/excel/${encodeURIComponent(token)}` });
};
```

:::

> Both engines resolve `pendingToken` only after the piped stream reaches `close` (file fully written). Keep the token pending **before** writing into the bridge — iterating rows first, then `await workbook.xlsx.write(bridge)` inflates the workbook fully in memory instead of streaming.
>
> Use `generateForDownloadStream` whenever the data size is unknown / very large (100 MB+). Use `generateForDownload({ data })` only when you already hold a small `Buffer` in hand.

### Generate PDF with Playwright (HTML → PDF)

```ts
export const generatePdf: Handler = async (c: any) => {
  const { chromium } = await import("playwright");
  const body = c.req.valid("json") as { title: string; rows: number };

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(buildHtml(body), { waitUntil: "networkidle" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });

    const token = await storage.generateForDownload({
      prefix: "report",
      extension: "pdf",
      data: pdf,
    });
    return c.json({
      token,
      downloadUrl: `/download/pdf/${encodeURIComponent(token)}`,
    });
  } finally {
    await browser.close();
  }
};
```

### Large PDF Generation (Queued + Status Polling)

For heavy reports, generate in a background worker and poll for the result:

```ts
// Controller: queue the work
export const generatePdfQueued: Handler = async (c: any) => {
  const body = c.req.valid("json");
  const requestId = crypto.randomUUID();

  await cache.put(`pdf:status:${requestId}`, { state: "pending" }, 1800);
  await dispatchCommand(
    "report.pdf.generate",
    { requestId, ...body },
    {
      async: true,
      queue: "default",
    },
  );

  return c.json(
    {
      requestId,
      statusUrl: `/pdf/${requestId}`,
      downloadUrl: `/pdf/${requestId}`,
    },
    202,
  );
};

// Controller: poll status, then serve
export const downloadPdf: Handler = async (c) => {
  const requestId = c.req.param("requestId");
  const status = await cache.get(`pdf:status:${requestId}`);

  if (!status) return c.json({ message: "Unknown request" }, 404);
  if (status.state === "pending") return c.json({ state: "pending" }, 202);
  if (status.state === "failed")
    return c.json({ message: status.message }, 500);

  const file = await storage.consumeGenerated(status.token);
  await cache.forget(`pdf:status:${requestId}`);
  return new Response(file, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": "attachment; filename=report.pdf",
    },
  });
};

// Worker
shouldQueue("report.pdf.generate", "default", async (job) => {
  const { requestId, title, rows } = job.data;
  try {
    const token = await generatePdfToken({ title, rows });
    await cache.put(`pdf:status:${requestId}`, { state: "ready", token }, 1800);
  } catch (error) {
    await cache.put(
      `pdf:status:${requestId}`,
      { state: "failed", message: String(error) },
      1800,
    );
  }
});
```

### Stream a File

```ts
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

| Provider            | `endpoint` (config/storage.ts)              | `forcePathStyle` |
| ------------------- | -------------------------------------------- | ------------------ |
| AWS S3              | (empty)                                      | `false`            |
| DigitalOcean Spaces | `https://<region>.digitaloceanspaces.com`    | `false`            |
| Cloudflare R2       | `https://<account>.r2.cloudflarestorage.com` | `false`            |
| MinIO               | `http://localhost:9000`                      | `true`             |
