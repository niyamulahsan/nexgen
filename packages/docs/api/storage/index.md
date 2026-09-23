# `storage` — file storage

Imported from the facade: `import { storage } from "@/framework/facade.js"`.

Unified API for **local disk** + **S3-compatible** storage (AWS S3, DigitalOcean Spaces, Cloudflare R2, MinIO). Swap the driver in `config/storage.ts` without touching code. See [Storage guide](/guide/storage).

## Disks

| Disk      | Purpose                         | Local path                 |
| --------- | ------------------------------- | -------------------------- |
| `public`  | Public files (avatars, uploads) | `src/storage/app/public/`  |
| `private` | User-specific / sensitive files | `src/storage/app/private/` |
| `tmp`     | Ephemeral generated files       | `src/storage/app/tmp/`     |

## Functions

Top-level methods operate on the **default disk**; `disk()` targets a specific disk with the same API.

| Function                                     | Signature                                          | Description                                                        |
| -------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| `storage.put`                                | `(file, data) => Promise<string>`                  | Write a file (string, Buffer, Uint8Array, ArrayBuffer, Blob, File) |
| `storage.putFile`                            | `(directory, file, name?) => Promise<string>`      | Store a browser `File` with unique naming                          |
| `storage.get`                                | `(file) => Promise<Buffer>`                        | Read file content                                                  |
| `storage.delete`                             | `(file) => Promise<void>`                          | Remove a file                                                      |
| `storage.copy`                               | `(from, to) => Promise<string>`                    | Duplicate within the same disk                                     |
| `storage.move`                               | `(from, to) => Promise<string>`                    | Rename or relocate                                                 |
| `storage.exists` / `missing`                 | `(file) => Promise<boolean>`                       | Presence check (and its inverse)                                   |
| `storage.files` / `directories`              | `(directory?) => Promise<string[]>`                | List files / subdirectories                                        |
| `storage.makeDirectory` / `deleteDirectory`  | `(directory) => Promise<boolean>`                  | Create / remove a directory tree                                   |
| `storage.size` / `mimeType` / `lastModified` | `(file) => Promise<number \| string>`              | Metadata                                                           |
| `storage.readStream` / `writeStream`         | `(file[, stream]) => Promise<Readable>`            | Stream a file in/out                                               |
| `storage.url`                                | `(file) => string`                                 | Public URL                                                         |
| `storage.temporaryUrl`                       | `(file, ttl?) => Promise<string>`                  | Signed URL (S3) or local proxy URL                                 |
| `storage.path`                               | `(file) => string`                                 | Absolute local path (local driver only)                            |
| `storage.setVisibility` / `getVisibility`    | `(file, visibility?) => Promise<boolean>`          | Toggle / read `"public"` \| `"private"` ACL                        |
| `storage.disk`                               | `(disk) => DiskAPI`                                | Disk-scoped API with every method above                            |
| `storage.download`                           | `(c, file, filename?) => Promise<Response>`        | Attachment download response for controllers                       |
| `storage.generateForDownload`                | `({ prefix, extension, data }) => Promise<string>` | Write a temp file for deferred download                            |
| `storage.consumeGenerated`                   | `(file) => Promise<Buffer>`                        | Read **and delete** a temp file (one-time download)                |

## Use cases

### Default disk

```ts
import { storage } from "@/framework/facade.js";

const fileBuffer = Buffer.from("avatar bytes"); // e.g. fs.readFile(...) or an upload
await storage.put("avatars/user-1.jpg", fileBuffer);
const data = await storage.get("avatars/user-1.jpg");
await storage.delete("avatars/user-1.jpg");
```

### Explicit disk

```ts
const disk = storage.disk("private");
const pdfBuffer = Buffer.from("%PDF-1.4 ..."); // e.g. playwright.pdf() output
await disk.put("invoices/42.pdf", pdfBuffer);
if (await disk.exists("invoices/42.pdf")) {
  const url = await disk.temporaryUrl("invoices/42.pdf", 300);
}
```

### Multipart upload

The request-parsing step is the only engine difference — the `storage` calls are identical:

::: code-group

```ts [Hono]
export const upload: Handler = async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File))
    return c.json({ message: "File is required" }, 422);

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

export default group().api(
  uploadRoute,
  [upload({ field: "file" })], // multer wrapper → in-memory buffer
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(422).json({ message: "File is required" });

    const path = await storage.disk("public").putFile("uploads", req.file);
    return res.json({
      message: "File uploaded successfully",
      path,
      url: storage.disk("public").url(path),
    });
  },
);
```

:::

> Express: `req.file` is an `Express.Multer.File` with a `buffer`. Hono: files arrive as web `File` instances via `c.req.parseBody()`. See [Upload](../upload) and [Storage guide > Multipart](/guide/storage#multipart-file-upload).

### One-time generated download

```ts
// Create a temp file (CSV, PDF, XLSX, …)
const csvText = ["name,email", "Ada,ada@example.com"].join("\n");
const token = await storage.generateForDownload({
  prefix: "report",
  extension: "csv",
  data: csvText,
});

// Serve once — read then delete
const file = await storage.consumeGenerated(token);
return new Response(file, { headers: { "content-type": "text/csv" } }); // Hono
// Express: res.set("content-type", "text/csv").send(file)
```

### Real world — file upload with rollback

Upload writes to storage first, then the DB row; if the insert fails the stored file is rolled back so nothing is orphaned:

::: code-group

```ts [Hono]
// modules/report/controllers/files.controller.ts (condensed)
const body = await c.req.parseBody();
const file = body?.file as File | undefined;
if (!file)
  return c.json(
    { message: "File required" },
    HttpStatusCodes.UNPROCESSABLE_ENTITY,
  );

const ext = file.name.split(".").pop()?.toLowerCase() || "";
if (!["xlsx", "xlsb"].includes(ext))
  return c.json(
    { message: "File must be .xlsx or .xlsb" },
    HttpStatusCodes.UNPROCESSABLE_ENTITY,
  );

const buffer = Buffer.from(await file.arrayBuffer());
const path = `uploads/${Date.now()}-${file.name}`;
await storage.put(path, buffer);

try {
  await db
    .insert(reports)
    .values({ name: file.name, path, size: formatSize(file.size) });
} catch (error) {
  await storage.delete(path).catch(() => {});
  throw error;
}
```

```ts [Express]
// modules/report/controllers/files.controller.ts (condensed)
import { upload } from "@/framework/facade.js";

export default group().api(
  uploadRoute,
  [
    upload({
      field: "file",
      maxSize: 2 * 1024 * 1024,
      allowedExtensions: [".xlsx", ".xlsb"],
    }),
  ],
  async (req: Request, res: Response) => {
    if (!req.file)
      return res
        .status(HttpStatusCodes.UNPROCESSABLE_ENTITY)
        .json({ message: "File required" });

    const buffer = req.file.buffer;
    const path = `uploads/${Date.now()}-${req.file.originalname}`;
    await storage.put(path, buffer);

    try {
      await db.insert(reports).values({
        name: req.file.originalname,
        path,
        size: formatSize(req.file.size),
      });
    } catch (error) {
      await storage.delete(path).catch(() => {});
      throw error;
    }

    res.json({ message: "File uploaded successfully", path });
  },
);
```

:::

Downloads stream the stored file straight back as an attachment — identical signature on both engines:

```ts
const file = await db.query.reports.findFirst({ where: eq(reports.id, id) });
return storage.download(c, file.path, file.name); // Hono — Express: storage.download(req, file.path, file.name)
```

### Real world — deferred export download

Export jobs are the ideal `generateForDownload` + `consumeGenerated` pairing: the worker writes the workbook to a single-use temp file and announces a tokenized URL, which the controller consumes and deletes:

```ts
// modules/report/jobs/exportJob.ts (worker)
const token = await storage.generateForDownload({
  prefix: `report_${authId}`,
  extension: "xlsx",
  data: buffer,
});
await dispatchEvent(
  "report.export.ready",
  {
    downloadUrl: `/api/report/export/download/${encodeURIComponent(token)}`,
    authId,
  },
  { broadcast: { users: [authId] } },
);
```

```ts
// modules/report/controllers/report-export.controller.ts (download route)
export const download: Handler = async (c: any) => {
  const { token } = c.req.valid("param");
  const auth = c.get("auth"); // Express: const auth = res.locals.auth
  if (!token.includes(`report_${auth.id}`))
    return c.json({ message: "Unauthorized" }, 403);
  const buffer = await storage.consumeGenerated(token); // read and delete — one-time link
  return c.newResponse(buffer, 200, {
    "Content-Type": "application/octet-stream",
  });
};
```

```ts
// Express engine version of the same controller
export const download = async (req: Request, res: Response) => {
  const token = req.params.token; // validated in place
  const auth = res.locals.auth;
  if (!token.includes(`report_${auth.id}`))
    return res.status(403).json({ message: "Unauthorized" });
  const buffer = await storage.consumeGenerated(token); // read and delete — one-time link
  res.status(200).set("Content-Type", "application/octet-stream").send(buffer);
};
```

### Stream a file

```ts
const stream = await storage.disk("public").readStream("videos/tutorial.mp4");
return new Response(stream as any, {
  headers: { "content-type": "video/mp4" },
}); // Hono
// Express: res.set("content-type", "video/mp4"); stream.pipe(res);
```

### Move / copy across disks

```ts
const finalPath = await storage
  .disk("public")
  .move("uploads/temp.jpg", "images/processed.jpg");

// Cross-disk copy (manual)
const data = await storage.disk("tmp").get("exports/report.csv");
await storage.disk("public").put("reports/report.csv", data);
await storage.disk("tmp").delete("exports/report.csv");
```

## Notes

- Path inputs are sanitized (`..` traversal is blocked); all keys are prefixed with the disk name for S3 objects.
- On local driver, `mimeType` always reports `application/octet-stream`; S3 returns real content types.
- `setVisibility` / `getVisibility` are no-ops (local) or inferred from the disk (local always reports `public`/`private` by disk).
- S3 providers: AWS (empty endpoint, `forcePathStyle: false`), Spaces (region endpoint), R2 (account endpoint), MinIO (`http://localhost:9000`, `forcePathStyle: true`).
