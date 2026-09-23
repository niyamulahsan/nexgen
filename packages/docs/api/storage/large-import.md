# Large Excel Import into the Database

Streaming a parsed Excel workbook into the DB with **chunked inserts**, so a 200 MB .xlsx never blows up memory and never blocks the event loop. The Vue uploads the file; the backend (with the queue worker) parses + persists in batches. See [Storage Overview](./index) for the everyday upload / download patterns.

## The Unit

`Vue` ← `POST /import/excel` (multipart) → `Hono/Express route` ← `ExcelJS.stream.xlsx.WorkbookReader` (row-by-row) ← `db.insert().values(batch)` (batches of 500)

## Why Chunked Inserts

That import loop loads **the whole workbook into an array** (`rows`) and then does one giant `db.insert().values(rows)` — fine for hundreds of rows, dangerous for thousands (RAM + one huge SQL statement). For big .xlsx imports the pattern is: stream-upload to `tmp` (previous section) → queue an **import worker** that reads the sheet with `ExcelJS.stream.xlsx.WorkbookReader` (rows never live in memory together) → insert **batches of 500** so memory and transaction size stay bounded:

```ts
// modules/report/jobs/importExcelJob.ts — worker (engine-agnostic)
import ExcelJS from "exceljs";
import { performance } from "node:perf_hooks";
import { cache, db, shouldQueue, storage } from "@/framework/facade.js";
import { posts } from "@/modules/blog/database/models/post.js";

export async function importExcelJob(input: {
  filePath: string;
  disk?: string;
  batchSize?: number;
}) {
  const t0 = performance.now();
  const { filePath, disk = "tmp", batchSize = 500 } = input;

  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    nullable: true,
  });

  let rowIndex = 0;
  const sheet = workbook.first?.worksheet;
  if (!sheet) throw new Error("No worksheet found");

  const headerRow = sheet.getRow(1).values.slice(1).map((v: unknown) => String(v || "").trim());

  const rows: Record<string, any>[] = [];
  for await (const row of sheet.eachRow({ includeEmpty: false })) {
    if (row.number === 1) continue; // skip header
    const record: Record<string, any> = {};
    headerRow.forEach((key, i) => {
      record[key] = row.values[i + 1];
    });
    rows.push(record);

    if (rows.length >= batchSize) {
      await db.insert(posts).values(rows);
      rows.length = 0;
      rowIndex += batchSize;
    }
  }

  if (rows.length > 0) {
    await db.insert(posts).values(rows);
  }

  const elapsed = Math.round(performance.now() - t0);
  return { insertedRows: rowIndex, elapsedMs: elapsed };
}
```

## Frontend — Upload + Poll

The Vue uploads the file via the multipart route (see [Multipart File Upload](./index#multipart-file-upload)), then polls the import status:

```vue
<script setup lang="ts">
const file = ref<File | null>(null)
const progress = ref(0)
const status = ref<"idle" | "running" | "done">("idle")

async function onSubmit() {
  if (!file.value) return
  const formData = new FormData()
  formData.append("file", file.value)
  const { data } = await axios.post("/api/import/excel", formData, {
    onUploadProgress: (e) => {
      progress.value = e.total ? Math.round((e.loaded / e.total) * 100) : 0
    },
  })
  const requestId = data.requestId
  status.value = "running"
  // poll every 2s
  const poll = setInterval(async () => {
    const { data: st } = await axios.get(`/api/import/status/${requestId}`)
    status.value = st.status === "ready" ? "done" : st.status === "failed" ? "failed" : "running"
    if (st.status !== "running") clearInterval(poll)
  }, 2000)
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <input type="file" accept=".xlsx" @change="file = $event.target.files?.[0] ?? null" />
    <button type="submit" :disabled="status === 'running'">Import</button>
    <div v-if="status === 'running'">Importing… {{ progress }}%</div>
    <div v-if="status === 'done'">Import complete</div>
  </form>
</template>
```

## Backend — Multipart → tmp → Queue Import

The upload route stores the file on the **tmp** disk (streaming, no buffering), then enqueues the import job:

```ts
// Hono — POST /import/excel
export const importExcelUpload: Handler = async (c: any) => {
  const body = await c.req.parseBody()
  const file = body.file
  if (!(file instanceof File)) return c.json({ message: "File is required" }, 422)

  const path = await storage.disk("tmp").putFile("imports", file) // streamed to tmp
  const requestId = await dispatchEvent("report.import", { filePath: path, disk: "tmp" })
  return c.json({ requestId, status: "queued" })
}
```

## Rule of Thumb

| Scenario | Pattern |
| --- | --- |
| Small Excel (< 10k rows) | `upload()` → buffer → `ExcelJS.Workbook` → `db.insert().values(rows)` |
| Large Excel (10k+ rows) | Multipart → `tmp` → `ExcelJS.stream.xlsx.WorkbookReader` → batches of 500 |

> **Same-disk pairing:** the upload wrote to `tmp`. The import worker reads from `tmp`. After importing, move the file to a permanent disk with `storage.disk("tmp").move(path, "exports/...")` or delete it.
