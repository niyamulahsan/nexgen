// ./src/framework/http/fastify.d.ts

import "fastify";
import type { UploadedFile } from "@/framework/support/upload.js";

declare module "fastify" {
  interface FastifyRequest {
    auth: any;
    sessionId: string | null;
    /** Single-file upload, populated by `upload({ field })`. */
    upload?: UploadedFile;
    /** Multiple uploads or labeled fields, populated by `upload`/`fields`. */
    uploads?: UploadedFile[] | Record<string, UploadedFile[]>;
  }
}
