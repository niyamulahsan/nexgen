// ./src/framework/support/upload.ts

import path from "node:path";
import type { MultipartFile } from "@fastify/multipart";
import type { FastifyRequest } from "fastify";

export type UploadedFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export type UploadOptions = {
  /**
   * Form field name that carries the file(s). Matches the client's FormData key.
   */
  field: string;
  /**
   * When set, accepts an array of up to `multiple` files on that field.
   * Omit for a single-file upload (exposed as `request.upload`).
   */
  multiple?: number;
  /**
   * Maximum allowed file size in bytes. Defaults to unlimited.
   */
  maxSize?: number;
  /**
   * Allowed file extensions (lowercase, with dot), e.g. [".xlsx", ".xlsb"].
   * Rejects others with a 422 message.
   */
  allowedExtensions?: string[];
  /**
   * Allowed MIME types, e.g. ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].
   * When provided alongside extensions, a file must satisfy both.
   */
  allowedMimeTypes?: string[];
};

export type UploadFieldsSpec = Array<{ name: string; maxCount?: number }>;

type UploadRules = Omit<UploadOptions, "field" | "multiple">;

function humanSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${Math.round(size * 100) / 100} ${units[i]}`;
}

function validationError(message: string) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = 422;
  return error;
}

function checkRules(file: MultipartFile, rules: UploadRules) {
  const ext = path.extname(file.filename).toLowerCase();
  if (rules.allowedExtensions?.length && !rules.allowedExtensions.includes(ext)) {
    throw validationError(`File must be ${rules.allowedExtensions.join(" or ")}`);
  }
  if (rules.allowedMimeTypes?.length && !rules.allowedMimeTypes.includes(file.mimetype)) {
    throw validationError(`File type ${file.mimetype} is not allowed`);
  }
}

async function toUpload(file: MultipartFile, rules: UploadRules): Promise<UploadedFile> {
  checkRules(file, rules);

  let buffer: Buffer;
  try {
    buffer = await file.toBuffer();
  } catch {
    throw validationError(`File size must be less than ${humanSize(rules.maxSize ?? 0)}`);
  }

  if (typeof rules.maxSize === "number" && buffer.length > rules.maxSize) {
    throw validationError(`File size must be less than ${humanSize(rules.maxSize)}`);
  }

  return {
    fieldname: file.fieldname,
    originalname: file.filename,
    encoding: file.encoding,
    mimetype: file.mimetype,
    size: buffer.length,
    buffer
  };
}

function rethrowMultipart(error: unknown, maxCount: number, rules: UploadRules): never {
  const code = (error as { code?: string })?.code;
  if (code === "FST_REQ_FILE_TOO_LARGE") {
    throw validationError(`File size must be less than ${humanSize(rules.maxSize ?? 0)}`);
  }
  if (code === "FST_FILES_LIMIT" || code === "FST_PARTS_LIMIT") {
    throw validationError(`Too many files, max ${maxCount} allowed`);
  }
  throw error;
}

/**
 * Why: Parses multipart uploads into memory as a reusable Fastify preHandler.
 * When: Any route needs to accept file uploads (single, multiple, or labeled fields).
 * Where: Route files via `preHandler: upload({...})`.
 * How: Wraps `@fastify/multipart` so handlers receive `request.upload` /
 *      `request.uploads` buffers and size/extension/MIME rules are enforced;
 *      failures are normalized into readable 422 errors before the handler runs.
 */
export function upload(options: UploadOptions) {
  const { field, multiple, ...rules } = options;
  const maxCount = multiple ?? 1;

  return async function uploadPreHandler(request: FastifyRequest) {
    try {
      if (multiple) {
        const files: UploadedFile[] = [];
        for await (const file of request.files({ limits: { files: maxCount, fileSize: rules.maxSize } })) {
          if (file.fieldname !== field) continue;
          if (files.length >= maxCount) break;
          files.push(await toUpload(file, rules));
        }
        if (files.length === 0) throw validationError("File required");
        request.uploads = files;
        return;
      }

      const file = await request.file({ limits: { fileSize: rules.maxSize } });
      if (!file || file.fieldname !== field) throw validationError("File required");
      request.upload = await toUpload(file, rules);
    } catch (error) {
      if ((error as { statusCode?: number })?.statusCode === 422) throw error;
      rethrowMultipart(error, maxCount, rules);
    }
  };
}

/**
 * Why: Parses multipart forms carrying multiple labeled file fields at once.
 * When: A form uploads several different inputs (e.g. avatar + document) in one request.
 * Where: Route files via `preHandler: fields([{ name: "avatar" }, { name: "docs", maxCount: 5 }])`.
 * How: Iterates every uploaded file and groups it by field, enforcing per-field
 *      max counts and the shared size/MIME/extension rules.
 */
export function fields(spec: UploadFieldsSpec, options: UploadRules = {}) {
  const limits = new Map(spec.map((entry) => [entry.name, entry.maxCount ?? 1]));
  const total = spec.reduce((sum, entry) => sum + (entry.maxCount ?? 1), 0);

  return async function fieldsPreHandler(request: FastifyRequest) {
    const grouped: Record<string, UploadedFile[]> = {};
    let totalReceived = 0;

    try {
      for await (const file of request.files({ limits: { files: total, fileSize: options.maxSize } })) {
        const maxCount = limits.get(file.fieldname);
        if (maxCount === undefined) continue;

        const bucket = (grouped[file.fieldname] ??= []);
        if (bucket.length >= maxCount) {
          throw validationError(`Too many files for ${file.fieldname}, max ${maxCount} allowed`);
        }
        if (totalReceived >= total) {
          throw validationError(`Too many files, max ${total} allowed`);
        }

        bucket.push(await toUpload(file, options));
        totalReceived += 1;
      }
    } catch (error) {
      if ((error as { statusCode?: number })?.statusCode === 422) throw error;
      rethrowMultipart(error, total, options);
    }

    if (totalReceived === 0) throw validationError("File required");
    request.uploads = grouped;
  };
}
