import { Scalar } from "@scalar/hono-api-reference";
import { env } from "@/env.js";
import type { NexgenRouter } from "@/framework/http/router.js";

/**
 * Why: Registers OpenAPI document and interactive docs UI.
 * When: OPEN_API is enabled during app boot.
 * Where: HTTP app setup.
 * How: Exposes `/doc` spec and `/api-docs` Scalar viewer.
 */
export function configureOpenApi(app: NexgenRouter) {
  app.doc("/doc", {
    openapi: "3.0.0",
    info: {
      title: `${env.APP_NAME} API`,
      version: "0.1.0"
    }
  });

  app.get(
    "/api-docs",
    Scalar({
      url: "/doc",
      layout: "classic",
      theme: "moon",
      pageTitle: `${env.APP_NAME} API`,
      defaultHttpClient: {
        targetKey: "js",
        clientKey: "fetch"
      },
      defaultOpenAllTags: true
    })
  );
}
