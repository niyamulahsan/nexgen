// ./src/framework/http/openapi.ts

import fs from "node:fs";
import path from "node:path";
import { Scalar } from "@scalar/hono-api-reference";
import { openApiConfig } from "@/config/index.js";
import type { NexwireRouter } from "@/framework/http/router.js";

/**
 * Why: Registers OpenAPI document and interactive docs UI.
 * When: OPEN_API is enabled during app boot.
 * Where: HTTP app setup.
 * How: Exposes `/doc` spec and `/api-docs` Scalar viewer.
 */
export function configureOpenApi(app: NexwireRouter) {
  const { specUrl, docsPath, favicon, ...scalarOptions } = openApiConfig.scalar;

  app.doc("/doc", {
    openapi: openApiConfig.version,
    info: {
      title: openApiConfig.title,
      version: openApiConfig.apiVersion,
      ...(openApiConfig.description ? { description: openApiConfig.description } : {})
    }
  });

  if (favicon) {
    app.get("/favicon.ico", (c) => {
      const faviconPath = path.join(process.cwd(), favicon);
      if (!fs.existsSync(faviconPath)) return c.notFound();
      return c.body(fs.readFileSync(faviconPath), 200, { "content-type": "image/x-icon" });
    });
  }

  app.get(
    docsPath, // Use the destructured path
    Scalar({
      url: specUrl, // Use the destructured URL
      ...scalarOptions // Pass EVERYTHING else automatically!
    })
  );
}
