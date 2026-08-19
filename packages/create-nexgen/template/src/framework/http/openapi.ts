import { Scalar } from "@scalar/hono-api-reference";
import { appConfig } from "@/config/index.js";
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
      title: `${appConfig.name} API`,
      version: "0.1.0"
    }
  });

  app.get(
    "/api-docs",
    Scalar({
      url: "/doc",
      layout: "classic",
      theme: "moon",
      pageTitle: `${appConfig.name} API`,
      defaultHttpClient: {
        targetKey: "js",
        clientKey: "fetch"
      },
      defaultOpenAllTags: true
    })
  );
}
