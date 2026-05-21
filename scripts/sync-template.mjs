#!/usr/bin/env node

import { cpSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "template");
const DEST = join(ROOT, "packages", "create-nexgen", "template");

if (!existsSync(SRC)) {
  console.error("Error: template/ directory not found at", SRC);
  process.exit(1);
}

if (existsSync(DEST)) {
  rmSync(DEST, { recursive: true });
}

cpSync(SRC, DEST, {
  recursive: true,
  filter: (s) => {
    const parts = s.split(/[\\/]/);
    const basename = parts.pop();
    const skipDirs = new Set(["node_modules", "dist", "deploy"]);
    const skipFiles = new Set(["bun.lock", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);
    return !parts.some((p) => skipDirs.has(p)) && !skipDirs.has(basename) && !skipFiles.has(basename);
  },
});

console.log("Template synced to packages/create-nexgen/template/");
