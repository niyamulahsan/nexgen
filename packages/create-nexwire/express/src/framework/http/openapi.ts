import fs from "node:fs";
import path from "node:path";
import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { apiReference } from "@scalar/express-api-reference";
import type { Express } from "express";
import { z } from "zod";
import { openApiConfig } from "@/config/index.js";
import type { RouteConfig } from "@/framework/http/types.js";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

export function registerOpenApiRoute(route: RouteConfig) {
  registry.registerPath(route as any);
}

export function createOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: openApiConfig.version,
    info: {
      title: openApiConfig.title,
      version: openApiConfig.apiVersion,
      ...(openApiConfig.description ? { description: openApiConfig.description } : {})
    }
  });
}

export function configureOpenApi(app: Express) {
  const { specUrl, docsPath, favicon, ...scalarOptions } = openApiConfig.scalar;

  app.get(specUrl, (_req, res) => {
    res.json(createOpenApiDocument());
  });

  if (favicon) {
    app.get("/favicon.ico", (_req, res) => {
      const faviconPath = path.join(process.cwd(), favicon);
      if (!fs.existsSync(faviconPath)) return res.status(404).end();
      res.type("image/x-icon").sendFile(faviconPath);
    });
  }

  app.get(
    docsPath,
    apiReference({
      url: specUrl,       // Map specUrl to url
      ...scalarOptions,   // Pass EVERYTHING else automatically!
    } as any)             // The `as any` might still be needed if Express types are slightly behind
  );
}
