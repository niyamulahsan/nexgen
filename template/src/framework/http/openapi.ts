import { Scalar } from "@scalar/hono-api-reference";
import { openApiConfig } from "@/config/index.js";
import type { NexgenRouter } from "@/framework/http/router.js";

/**
 * Why: Registers OpenAPI document and interactive docs UI.
 * When: OPEN_API is enabled during app boot.
 * Where: HTTP app setup.
 * How: Exposes `/doc` spec and `/api-docs` Scalar viewer.
 */
export function configureOpenApi(app: NexgenRouter) {
  app.doc("/doc", {
    openapi: openApiConfig.version,
    info: {
      title: openApiConfig.title,
      version: openApiConfig.apiVersion,
      ...(openApiConfig.description ? { description: openApiConfig.description } : {}),
    },
  });

  app.get(
    openApiConfig.scalar.docsPath,
    Scalar({
      url: openApiConfig.scalar.specUrl,
      layout: openApiConfig.scalar.layout,
      theme: openApiConfig.scalar.theme,
      pageTitle: openApiConfig.scalar.pageTitle,
      defaultHttpClient: openApiConfig.scalar.defaultHttpClient,
      defaultOpenAllTags: openApiConfig.scalar.defaultOpenAllTags,
    })
  );
}
