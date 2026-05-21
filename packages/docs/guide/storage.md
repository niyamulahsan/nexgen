# Storage

## Overview

The storage facade provides a unified API for **local disk** and **S3-compatible** storage. Swap drivers by changing `STORAGE_DRIVER` — no code changes needed.

## Disks

Three isolated disk pools:

| Disk | Purpose | Local path |
|---|---|---|
| `public` | Public files (avatars, uploads) | `src/storage/app/public/` |
| `private` | User-specific / sensitive files | `src/storage/app/private/` |
| `tmp` | Ephemeral generated files | `src/storage/app/tmp/` |

Set the default disk with `STORAGE_DISK=public` in `.env`.

## Configuration

```env
STORAGE_DRIVER=local              # local or s3
STORAGE_DISK=public               # default disk
STORAGE_BUCKET=your-bucket
STORAGE_REGION=us-east-1
STORAGE_ENDPOINT=                 # S3-compatible endpoint URL
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_FORCE_PATH_STYLE=false    # true for MinIO
STORAGE_SIGNED_URL_TTL_SECONDS=900
```

## Usage

Import from the facade:

```ts
import { storage } from "@/framework/facade.js";
```

### Default Disk

Top-level methods use `STORAGE_DISK`:

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

| Method | Description |
|---|---|
| `put(file, data)` | Write a file. `data` can be string, Buffer, Uint8Array, ArrayBuffer, Blob, or File |
| `putFile(directory, file, name?)` | Store a browser `File`/`Blob` with unique naming |
| `get(file)` | Read file content as Buffer |
| `delete(file)` | Remove a file |
| `copy(from, to)` | Duplicate a file within the same disk |
| `move(from, to)` | Rename or relocate a file |
| `exists(file)` | Check if file exists |
| `missing(file)` | Inverse of `exists` — `true` when file does not exist |

### Metadata

| Method | Returns | Description |
|---|---|---|
| `size(file)` | `number` | File size in bytes |
| `mimeType(file)` | `string` | MIME type (always `"application/octet-stream"` on local) |
| `lastModified(file)` | `number` | Last modified timestamp (ms) |

### Directory Operations

| Method | Description |
|---|---|
| `files(directory?)` | List file names in a directory |
| `directories(directory?)` | List subdirectory names |
| `makeDirectory(directory)` | Create a directory |
| `deleteDirectory(directory)` | Remove a directory and all its contents |

### Streaming

| Method | Description |
|---|---|
| `readStream(file)` | Get a `Readable` stream of file content |
| `writeStream(file, stream)` | Write a `Readable` stream to a file |

### URLs & Visibility

| Method | Returns | Description |
|---|---|---|
| `url(file)` | `string` | Public URL for the file |
| `temporaryUrl(file, ttl?)` | `string` | Signed URL with TTL (S3) or local proxy URL |
| `path(file)` | `string` | Absolute local filesystem path (local driver only) |
| `setVisibility(file, visibility)` | `string` | Toggle `"public"` / `"private"` ACL (S3 only) |
| `getVisibility(file)` | `"public"` \| `"private"` | Read current ACL |

### Downloads

| Method | Description |
|---|---|
| `download(c, file, filename?)` | Returns a `Response` with attachment headers for controller use |
| `generateForDownload({ prefix, extension, data })` | Writes a temp file and returns its path for deferred download |
| `consumeGenerated(file)` | Reads and **deletes** a temp file — one-time download |

## Examples

> **Excel** examples use [`exceljs`](https://www.npmjs.com/package/exceljs) — install with `bun add exceljs`.  
> **PDF** examples use [`playwright`](https://www.npmjs.com/package/playwright) — install with `bun add playwright && bunx playwright install chromium`.

### Multipart File Upload

```ts
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
    url: storage.disk("public").url(path)
  });
};
```

### Import Excel (parse uploaded .xlsx)

```ts
export const importExcel: Handler = async (c) => {
  const ExcelJS = (await import("exceljs")).default;

  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) return c.json({ message: "File is required" }, 422);

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  const headers = sheet.getRow(1).values.slice(1).map((v: unknown) => String(v || "").trim());

  const rows: Record<string, any>[] = [];
  sheet.eachRow((row: any, rowNumber: number) => {
    if (rowNumber === 1) return;
    const record: Record<string, any> = {};
    headers.forEach((key, i) => { record[key] = row.values[i + 1]; });
    rows.push(record);
  });

  return c.json({ message: "Excel imported", totalRows: rows.length, preview: rows.slice(0, 20) });
};
```

### Generate CSV with One-Time Download

```ts
// POST /generate — create temp file
export const generateCsv: Handler = async () => {
  const csv = ["id,title", "1,nexgen report", "2,temporary file"].join("\n");
  const token = await storage.generateForDownload({
    prefix: "report",
    extension: "csv",
    data: csv
  });
  return c.json({ token, downloadUrl: `/download/${encodeURIComponent(token)}` });
};

// GET /download/:token — serve once and delete
export const downloadCsv: Handler = async (c) => {
  const token = decodeURIComponent(c.req.param("token"));
  try {
    const file = await storage.consumeGenerated(token);
    return new Response(file, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=report.csv"
      }
    });
  } catch {
    return c.json({ message: "Download token expired or invalid" }, 404);
  }
};
```

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
    { id: 2, title: "file generation" }
  ];
  for (const row of rows) {
    sheet.addRow([row.id, row.title, row.title.length]);
  }

  // Totals
  sheet.addRow(["Subtotal", rows.length, { formula: `SUM(C3:C${2 + rows.length})` }]);
  sheet.addRow(["Grand Total", rows.length, { formula: `SUM(C3:C${2 + rows.length})` }]);

  sheet.columns = [{ width: 10 }, { width: 38 }, { width: 14 }];

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const token = await storage.generateForDownload({
    prefix: "report",
    extension: "xlsx",
    data: buffer
  });

  return c.json({ token, downloadUrl: `/download/excel/${encodeURIComponent(token)}` });
};
```

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
      data: pdf
    });
    return c.json({ token, downloadUrl: `/download/pdf/${encodeURIComponent(token)}` });
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
  await dispatchCommand("report.pdf.generate", { requestId, ...body }, {
    async: true, queue: "default"
  });

  return c.json({
    requestId,
    statusUrl: `/pdf/${requestId}`,
    downloadUrl: `/pdf/${requestId}`
  }, 202);
};

// Controller: poll status, then serve
export const downloadPdf: Handler = async (c) => {
  const requestId = c.req.param("requestId");
  const status = await cache.get(`pdf:status:${requestId}`);

  if (!status) return c.json({ message: "Unknown request" }, 404);
  if (status.state === "pending") return c.json({ state: "pending" }, 202);
  if (status.state === "failed") return c.json({ message: status.message }, 500);

  const file = await storage.consumeGenerated(status.token);
  await cache.forget(`pdf:status:${requestId}`);
  return new Response(file, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": "attachment; filename=report.pdf"
    }
  });
};

// Worker
shouldQueue("report.pdf.generate", "default", async (job) => {
  const { requestId, title, rows } = job.data;
  try {
    const token = await generatePdfToken({ title, rows });
    await cache.put(`pdf:status:${requestId}`, { state: "ready", token }, 1800);
  } catch (error) {
    await cache.put(`pdf:status:${requestId}`, { state: "failed", message: String(error) }, 1800);
  }
});
```

### Stream a File

```ts
export const streamVideo: Handler = async (c: any) => {
  const stream = await storage.disk("public").readStream("videos/tutorial.mp4");
  return new Response(stream as any, {
    headers: { "content-type": "video/mp4" }
  });
};
```

### Move a File Within the Same Disk

```ts
// Rename after processing
const finalPath = await storage.disk("public").move("uploads/temp.jpg", "images/processed.jpg");
```

### Copy Across Disks (Manual)

```ts
// Copy from tmp to public, then clean up
const data = await storage.disk("tmp").get("exports/report.csv");
await storage.disk("public").put("reports/report.csv", data);
await storage.disk("tmp").delete("exports/report.csv");
```

## S3 Provider Compatibility

| Provider | `STORAGE_ENDPOINT` | `FORCE_PATH_STYLE` |
|---|---|---|
| AWS S3 | (empty) | `false` |
| DigitalOcean Spaces | `https://<region>.digitaloceanspaces.com` | `false` |
| Cloudflare R2 | `https://<account>.r2.cloudflarestorage.com` | `false` |
| MinIO | `http://localhost:9000` | `true` |
