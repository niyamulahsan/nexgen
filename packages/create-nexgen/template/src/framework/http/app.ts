import { serveEmojiFavicon } from "stoker/middlewares";
import { createRoute, z } from "@hono/zod-openapi";
import { env } from "@/env.js";
import { configureOpenApi } from "@/framework/http/openapi.js";
import { corsMiddleware } from "@/framework/http/cors.js";
import { rateLimiterMiddleware } from "@/framework/http/ratelimiter.js";
import { hasFrontendBuild, storageStaticMiddleware } from "@/framework/http/static.js";
import { sessionMiddleware } from "@/framework/session/session.js";
import { loggerMiddleware, notFound, onError } from "@/framework/http/logger.js";
import { createRouter } from "@/framework/http/router.js";

/**
 * Why: Builds the main HTTP app with middleware, health, and error handlers.
 * When: Kernel creates application server instance.
 * Where: Framework bootstrap path.
 * How: Composes router, optional OpenAPI, middleware stack, and fallbacks.
 */
export function createHttpApp() {
  const app = createRouter();

  const healthRoute = createRoute({
    path: "/health",
    method: "get",
    tags: ["System"],
    responses: {
      200: {
        description: "Application health status",
        content: {
          "application/json": {
            schema: z.object({ message: z.string() })
          }
        }
      }
    }
  });

  if (env.OPEN_API) {
    configureOpenApi(app);
    app.api(healthRoute, (c: any) => c.json({ message: "Application is healthy" }));
  }

  app.use("*", sessionMiddleware);
  app.use("*", corsMiddleware);
  app.use("*", loggerMiddleware);
  app.use("*", rateLimiterMiddleware);
  app.use("/storage/*", storageStaticMiddleware);
  app.use(serveEmojiFavicon("🚀"));

  if (!hasFrontendBuild()) {
    app.get("/", (c: any) => c.json({ name: env.APP_NAME, ok: true }));
  }

  if (!env.OPEN_API) {
    app.get("/health", (c: any) => c.json({ message: "Application is healthy" }));
  }

  app.notFound(notFound);
  app.onError(onError);

  return app;
}
