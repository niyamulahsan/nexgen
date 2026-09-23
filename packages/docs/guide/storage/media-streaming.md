# Streaming Media (MP4 / Audio) to the Browser

> **The short version:** for a large video/audio file that the browser should **play inline with seek support**, use `storage.disk(...).readStream(file)` and serve it as a raw `Readable` with a `Range`-aware response. `storage.consumeGenerated` / `generateForDownloadStream` is for **one-time downloads** of generated files — using it for media is wrong because the browser sends `Range` requests for seeking that a delete-on-read helper can't answer.

## The Unit

`Vue` ← HTTP range request → `Hono/Express route` ← `storage.disk("public").readStream(...)`
  ← `Range` request (browser seeking / scrubbing)
  ← `206 Partial Content`

## Backend — Stream with Range Support

Browser sends a `Range: bytes=0-` request first (to learn duration + size), then issues `Range: bytes=N-` while seeking. Return **206 Partial Content** with `Content-Range`, `Accept-Ranges: bytes`, and the correct `Content-Type` so the browser can scrub.

::: code-group

```ts [Hono]
import { Readable } from "node:stream";
import type { Handler } from "hono";
import { storage } from "@/framework/facade.js";

export const streamMedia: Handler = async (c: any) => {
  const path = "videos/" + c.req.param("file"); // e.g. videos/tutorial.mp4
  const disk = storage.disk("public");

  if (!(await disk.exists(path))) return c.status(404);
  const mime = await disk.mime(path);
  const total = await disk.size(path);

  const range = c.req.header("range");
  if (!range) {
    // First request: learn duration
    return c.json({ size: total, type: mime });
  }

  const [_, spec] = range.replace(/bytes=/, "").split("-");
  const start = Number(spec.split(",")[0]);
  const end = Number(spec.split(",")[1]) || total - 1;
  const chunkSize = end - start + 1;

  const stream = await disk.readStream(path, { start, end });

  return new Response(stream as any, {
    headers: {
      "content-type": mime,
      "content-range": `bytes ${start}-${end}/${total}`,
      "accept-ranges": "bytes",
      "content-length": String(chunkSize),
    },
  });
};
```

```ts [Express]
import type { Request, Response } from "express";
import { storage } from "@/framework/facade.js";

export const streamMedia = async (req: Request, res: Response) => {
  const path = "videos/" + req.params.file;
  const disk = storage.disk("public");

  if (!(await disk.exists(path))) return res.status(404).end();
  const mime = await disk.mime(path);
  const total = await disk.size(path);

  const range = req.headers.range;
  if (!range) {
    return res.json({ size: total, type: mime });
  }

  const [_, spec] = range.replace(/bytes=/, "").split("-");
  const start = Number(spec.split(",")[0]);
  const end = Number(spec.split(",")[1]) || total - 1;
  const chunkSize = end - start + 1;

  const stream = await disk.readStream(path, { start, end });

  res.set("content-type", mime);
  res.set("content-range", `bytes ${start}-${end}/${total}`);
  res.set("accept-ranges", "bytes");
  res.set("content-length", String(chunkSize));
  stream.pipe(res);
};
```

:::

## Frontend — Vue `<video>` / `<audio>`

```vue
<script setup lang="ts">
const src = `/api/media/tutorial.mp4`
</script>

<template>
  <video :src="src" controls class="w-full rounded-lg" />
</template>
```

> The browser auto-issues `Range` requests on seek. The route above returns `206 Partial Content` with the correct `Content-Range`, so scrubbing works without buffering the whole file.

## When NOT to Use Streaming

- **One-time downloads** (PDF report, Excel export) → `generateForDownload` + `consumeGenerated` with a token URL ([Generate PDF](./generate-and-download#generate-pdf-with-playwright-html--pdf)).
- **Small files** (an image, a favicon) → plain `storage.consumeGenerated` is overkill; just `generateForDownload` and go.
- **Live/transcoding pipelines** → the storage layer doesn't transcode; push to a media pipeline instead.

## Rule of Thumb

| Scenario | Helper | Response |
| --- | --- | --- |
| Streaming media (MP4/Audio) | `disk.readStream` with `Range` | `206 Partial Content` |
| One-time generated download | `generateForDownload*` + `consumeGenerated` | `200 OK` + `Content-Disposition: attachment` |
| Small file | `disk.read` | `200 OK` |
