#!/usr/bin/env node

import { cpSync, readFileSync, writeFileSync, rmSync, renameSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PKG = join(ROOT, "packages", "create-nexwire");

const ENGINES = {
  hono: { src: join(ROOT, "template", "hono"), dest: join(PKG, "hono") },
  express: { src: join(ROOT, "template", "express"), dest: join(PKG, "express") },
};

/**
 * Env values pinned on every synced env file.
 *
 * The template's `.env` is gitignored — a developer-local file that is never
 * reviewed — while the synced copy under packages/create-nexwire is tracked and
 * is what npm publishes. Anything left unpinned can therefore ship silently:
 * REDIS=true reached npm in 4.1.0 that way and had to be patched in 4.1.1.
 * Keep this list short and deliberate; it is the guarantee, not a config file.
 */
const FORCED_ENV_DEFAULTS = {
  REDIS: "false",
  // A fresh project must not start with realtime on. The template `.env` is
  // developer-local, so a local SOCKET=true would otherwise ship to npm and
  // make the UI open `/socket.io` even though the documented default is off.
  SOCKET: "false",
};

/** Parse the uncommented KEY=VALUE pairs of an env file. */
function parseEnv(text) {
  const values = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (match) values.set(match[1], match[2]);
  }
  return values;
}

/**
 * Pin FORCED_ENV_DEFAULTS in an env file, keeping its existing line endings.
 * The trailing (\r?) capture is preserved so CRLF files do not turn mixed.
 */
function pinEnvDefaults(text, label) {
  const pinned = [];
  let out = text;
  for (const [key, value] of Object.entries(FORCED_ENV_DEFAULTS)) {
    const pattern = new RegExp(`^${key}\\s*=.*?(\\r?)$`, "m");
    const match = pattern.exec(out);
    if (!match) {
      pinned.push(`${key} (added as ${value})`);
      out = `${key}=${value}\n${out}`;
      continue;
    }
    if (match[0].trim() !== `${key}=${value}`) pinned.push(`${key}=${value}`);
    out = out.replace(pattern, `${key}=${value}$1`);
  }
  if (pinned.length) console.log(`  [${label}] pinned ${pinned.join(", ")}`);
  return out;
}

/**
 * Report keys where the synced .env disagrees with the tracked .env.example.
 * The difference is legitimate (a developer's local settings), but it ships, so
 * it has to be visible at sync time rather than discovered after publishing.
 */
function reportEnvDrift(examplePath, envPath, name) {
  if (!existsSync(examplePath) || !existsSync(envPath)) return;
  const example = parseEnv(readFileSync(examplePath, "utf8"));
  const actual = parseEnv(readFileSync(envPath, "utf8"));
  const drifted = [...example.keys()].filter((key) => actual.has(key) && actual.get(key) !== example.get(key));
  const onlyLocal = [...actual.keys()].filter((key) => !example.has(key));
  if (!drifted.length && !onlyLocal.length) return;
  const parts = [
    ...drifted.map((key) => `${key}: ${example.get(key)} -> ${actual.get(key)}`),
    ...onlyLocal.map((key) => `${key} (not in .env.example)`),
  ];
  console.log(`  [${name}] .env differs from .env.example — this ships: ${parts.join("; ")}`);
}

/**
 * Normalize the synced scaffold to a fresh-checkout state. The template
 * working tree is doubles as a local build area, and build output is NOT
 * gitignored at every depth (only `public/*` is), so it can silently land in
 * the published package. Never publish:
 *
 * - `src/storage/logs/*`     request logs from local runs/tests
 * - `public/*`               `vite build` output (outDir is "../../public")
 * - `deploy/`                `maker deploy:init`
 * - `dist/`                  `tsc` output
 *
 * The published package keeps `.gitkeep` markers so the folder layout is
 * identical everywhere.
 */
function sanitizeScaffold(dest, name) {
  const resetToGitkeep = (dir, label) => {
    if (existsSync(dir)) {
      for (const entry of readdirSync(dir)) {
        if (entry === ".gitkeep") continue;
        rmSync(join(dir, entry), { recursive: true, force: true });
      }
    } else {
      mkdirSync(dir, { recursive: true });
    }
    const marker = join(dir, ".gitkeep");
    if (!existsSync(marker)) writeFileSync(marker, "");
    if (readdirSync(dir).some((entry) => entry !== ".gitkeep")) {
      console.error(`  [${name}] ${label} still contains build output - refusing to publish it`);
      process.exit(1);
    }
  };

  resetToGitkeep(join(dest, "public"), "public/");
  resetToGitkeep(join(dest, "src", "storage", "logs"), "src/storage/logs/");

  // Build output folders never ship - the engine root is the only place
  // `maker deploy:init` writes, so a deep `dist/` is already excluded by the
  // copy filter above; this catches the root case and anything else that slips.
  for (const dir of ["deploy", "dist"]) {
    const target = join(dest, dir);
    rmSync(target, { recursive: true, force: true });
    if (existsSync(target)) {
      console.error(`  [${name}] ${dir}/ could not be removed from the scaffold - refusing to publish it`);
      process.exit(1);
    }
  }
}

function syncEngine(name, { src, dest }) {
  if (!existsSync(src)) {
    console.error(`Error: ${name} template not found at`, src);
    process.exit(1);
  }

  if (existsSync(dest)) {
    rmSync(dest, { recursive: true });
  }

  const rootName = basename(src);
  const skipDirs = new Set(["node_modules", "dist", "coverage"]);
  const skipRootDirs = new Set(["deploy"]);
  const skipFiles = new Set(["bun.lock", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);

  /**
   * Directories that are kept in the repository but never published, counted
   * only when they sit inside `src/framework`.
   *
   * The maker-cli's own tests belong to this repo, which is what keeps the
   * generators honest. A scaffolded project should not receive them: the maker
   * CLI is invisible to someone building an application, so a stray
   * `src/framework/maker-cli/__tests__/` sitting next to the tests they write
   * inside their own modules reads as something they are meant to look after.
   * Module tests, the ones under `src/modules/`, do ship: those belong to the
   * module the developer is actually using and show the pattern for it.
   */
  const skipInsideFramework = new Set(["__tests__"]);

  cpSync(src, dest, {
    recursive: true,
    filter: (s) => {
      const parts = s.split(/[\\/]/);
      const basename_ = parts.pop();
      const rootIdx = parts.indexOf(rootName);
      const depth = rootIdx >= 0 ? parts.length - rootIdx : 0;
      // Path relative to the engine root, e.g. src/framework/maker-cli/__tests__
      const relative = rootIdx >= 0 ? parts.slice(rootIdx + 1) : parts;
      const insideFramework = relative[0] === "src" && relative[1] === "framework";
      return !parts.some((p) => skipDirs.has(p))
        && !skipDirs.has(basename_)
        && !(depth === 1 && skipRootDirs.has(basename_))
        && !skipFiles.has(basename_)
        && !(insideFramework && skipInsideFramework.has(basename_))
        && !basename_.endsWith(".log");
    },
  });

  // Rename .gitignore to gitignore-stub so npm doesn't use its patterns for exclusion
  const gitignorePath = join(dest, ".gitignore");
  if (existsSync(gitignorePath)) {
    renameSync(gitignorePath, join(dest, "gitignore-stub"));
    console.log(`  [${name}] renamed .gitignore → gitignore-stub (avoids npm .gitignore fallback)`);
  }

  // Pin the forced defaults before anything gets tracked or published.
  for (const file of [".env", ".env.example"]) {
    const envPath = join(dest, file);
    if (!existsSync(envPath)) continue;
    const original = readFileSync(envPath, "utf8");
    const pinned = pinEnvDefaults(original, `${name} ${file}`);
    if (pinned !== original) writeFileSync(envPath, pinned);
  }
  reportEnvDrift(join(dest, ".env.example"), join(dest, ".env"), name);

  // Strip the working-tree artifacts that carry request data or build output.
  sanitizeScaffold(dest, name);
}

const requested = process.argv[2]?.toLowerCase();
if (requested && !ENGINES[requested]) {
  console.error(`Error: Unknown engine "${requested}". Supported engines: hono, express.`);
  process.exit(1);
}

for (const [name, cfg] of Object.entries(ENGINES)) {
  if (requested && name !== requested) continue;
  syncEngine(name, cfg);
}

console.log(requested ? `${requested} template synced to packages/create-nexwire/` : "Templates synced to packages/create-nexwire/");