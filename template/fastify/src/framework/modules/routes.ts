import type { FastifyInstance } from "fastify";
import { discoverModuleFiles, importFile, moduleNameFromPath } from "@/framework/modules/discover.js";

/**
 * Why: Discovers and mounts every module route plugin.
 * When: Kernel boot, after the HTTP app exists.
 * Where: Framework startup.
 * How: Each `modules/<name>/routes/*.ts` default export is a Fastify plugin,
 *      registered under `/api/<module-name>`.
 */
export async function registerModuleRoutes(app: FastifyInstance) {
  const files = await discoverModuleFiles("**/routes/*.{ts,js}");

  for (const file of files) {
    const route = await importFile(file);

    if (!route.default) {
      throw new Error(`Route file ${file} has no default export`);
    }

    // Optional Guard: Ensure it's a Fastify plugin function
    if (typeof route.default !== "function") {
      throw new Error(`Route file ${file} must export a Fastify plugin as default`);
    }

    const prefix = `/api/${moduleNameFromPath(file)}`;
    await app.register(route.default, { prefix });
  }

  return files.length;
}
