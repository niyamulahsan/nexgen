#!/usr/bin/env node

import { readFileSync, existsSync, cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(__dirname, "..", "template");
const PKG_PATH = join(__dirname, "..", "package.json");

const pkg = JSON.parse(readFileSync(PKG_PATH, "utf-8"));
const version = pkg.version;

function ask(query) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(query, (a) => { rl.close(); resolve(a.trim()); }));
}

function detectPackageManager() {
  const ua = process.env.npm_config_user_agent || "";
  if (ua.includes("bun")) return "bun";
  if (ua.includes("pnpm")) return "pnpm";
  if (ua.includes("yarn")) return "yarn";
  return "npm";
}

function isValidProjectName(name) {
  return /^[a-z0-9@][a-z0-9._-]*$/i.test(name);
}

function resolveTargetDir(name) {
  const cwd = process.cwd();
  const dir = join(cwd, name);
  if (existsSync(dir)) {
    console.error(`Error: Directory "${name}" already exists.`);
    process.exit(1);
  }
  return dir;
}

async function main() {
  const args = process.argv.slice(2);
  let projectName = args.find((a) => !a.startsWith("--"));

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`create-nexgen v${version}`);
    console.log();
    console.log("Usage:");
    console.log("  npm create nexgen <project-name>");
    console.log("  pnpm create nexgen <project-name>");
    console.log("  bun create nexgen <project-name>");
    console.log("  npx nexgen@latest <project-name>");
    process.exit(0);
  }

  if (!projectName) {
    projectName = await ask("Project name: ");
  }

  if (!projectName || !isValidProjectName(projectName)) {
    console.error("Error: Invalid project name. Use alphanumeric, dashes, or underscores.");
    process.exit(1);
  }

  const targetDir = resolveTargetDir(projectName);

  console.log(`\nCreating project "${projectName}"...\n`);

  if (!existsSync(TEMPLATE_DIR)) {
    console.error("Error: Template not found. Reinstall create-nexgen.");
    process.exit(1);
  }

  mkdirSync(targetDir, { recursive: true });
  cpSync(TEMPLATE_DIR, targetDir, { recursive: true, filter: (s) => !s.includes("node_modules") });

  const targetPkgPath = join(targetDir, "package.json");
  if (existsSync(targetPkgPath)) {
    const targetPkg = JSON.parse(readFileSync(targetPkgPath, "utf-8"));
    targetPkg.name = projectName;
    writeFileSync(targetPkgPath, JSON.stringify(targetPkg, null, 2) + "\n");
  }

  const pm = detectPackageManager();

  console.log(`Done! Created "${projectName}" at ${targetDir}`);
  console.log();
  console.log("  cd " + projectName);
  console.log("  " + pm + " install");
  console.log("  cp .env.example .env");
  console.log();
  console.log("Enjoy building with Nexgen!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
