import { discoverModuleFiles, importFile } from "@/framework/modules/discover.js";
import { closeDatabase, initDatabase } from "@/framework/database/connection.js";

/**
 * Why: Runs module seeders for all modules or one targeted module.
 * When: CLI executes `db:seed` flows.
 * Where: Framework database seeding runtime.
 * How: Boots DB, discovers seeder files, executes default exports, then closes DB.
 */
await initDatabase();

try {
  const moduleArg = process.argv.find((arg) => arg.startsWith("--module="));
  const moduleName = moduleArg?.split("=")[1]?.trim();
  const pattern = moduleName
    ? `${moduleName}/database/seeders/*.{ts,js}`
    : "**/database/seeders/*.{ts,js}";

  const files = await discoverModuleFiles(pattern);

  for (const file of files) {
    const seeder = await importFile(file);
    if (typeof seeder.default === "function") {
      await seeder.default();
    }
  }

  console.log(
    `Executed ${files.length} seeder file(s)${moduleName ? ` for module ${moduleName}` : ""}`
  );
} finally {
  await closeDatabase();
}
