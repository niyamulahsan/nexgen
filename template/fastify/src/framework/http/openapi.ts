import fs from "node:fs";
import path from "node:path";
import scalarApiReference from "@scalar/fastify-api-reference";
import swagger from "@fastify/swagger";
import type { FastifyInstance } from "fastify";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import { openApiConfig } from "@/config/index.js";

/**
 * Why: Registers the OpenAPI document and interactive docs UI.
 * When: OPEN_API is enabled during app boot.
 * Where: HTTP app setup, before module routes.
 * How: `@fastify/swagger` collects route schemas through the Zod transform;
 *      Scalar renders them at the configured docs path.
 */
export function configureOpenApi(app: FastifyInstance) {
  const { specUrl, docsPath, favicon, ...scalarOptions } = openApiConfig.scalar;

  app.register(swagger, {
    openapi: {
      openapi: openApiConfig.version,
      info: {
        title: openApiConfig.title,
        version: openApiConfig.apiVersion,
        ...(openApiConfig.description ? { description: openApiConfig.description } : {})
      }
    },
    transform: jsonSchemaTransform
  });

  app.get(specUrl, { schema: { hide: true } }, async () => app.swagger());

  if (favicon) {
    app.get("/favicon.ico", { schema: { hide: true } }, async (_request, reply) => {
      const faviconPath = path.join(process.cwd(), favicon);
      if (!fs.existsSync(faviconPath)) return reply.code(404).send();
      return reply.type("image/x-icon").send(fs.readFileSync(faviconPath));
    });
  }

  app.register(scalarApiReference, {
    routePrefix: docsPath,
    configuration: {
      url: specUrl,
      ...scalarOptions
    }
  });
}
