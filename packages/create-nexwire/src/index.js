#!/usr/bin/env node

import { readFileSync, existsSync, cpSync, mkdirSync, writeFileSync, renameSync, readdirSync, rmSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface, emitKeypressEvents } from "node:readline";
import { gunzipSync } from "node:zlib";
import https from "node:https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_PATH = join(__dirname, "..", "package.json");

const pkg = JSON.parse(readFileSync(PKG_PATH, "utf-8"));
const version = pkg.version;

function ask(query) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(query, (a) => { rl.close(); resolve(a.trim()); }));
}

// Keep this in sync with the packages/ directories shipped in the tarball and
// with ENGINE_PREFIXES below. A future frontend adds its own list here and its
// own prefix inside extractTarGz.
const BACKENDS = [
  { value: "hono", label: "Hono", hint: "Hono-based HTTP layer and OpenAPI" },
  { value: "express", label: "Express", hint: "Express-based HTTP layer and OpenAPI" },
  { value: "fastify", label: "Fastify", hint: "Fastify-based HTTP layer and OpenAPI" }
];

const BACKEND_NAMES = BACKENDS.map((b) => b.value);

function backendIndex(value) {
  return BACKENDS.findIndex((b) => b.value === String(value).toLowerCase());
}

const useColor = Boolean(process.stdout.isTTY && !process.env.NO_COLOR);
const paint = (code, text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);

/**
 * Render an arrow-key list picker. Falls back to the default choice when
 * stdin is not a TTY (CI, piped input) so `npm create nexwire@latest .`
 * keeps working in scripts without hanging on a prompt.
 */
async function selectOption(title, options, defaultIndex = 0) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    return options[defaultIndex].value;
  }

  const stdin = process.stdin;
  const out = process.stdout;
  let index = defaultIndex;
  const lines = options.length + 2; // title + options + trailing help line

  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  out.write("\x1b[?25l"); // hide the cursor while the list is live

  const render = (first) => {
    if (!first) out.write(`\x1b[${lines}A`);
    out.write(`${paint(1, title)}\n`);
    options.forEach((option, i) => {
      const active = i === index;
      const marker = active ? paint(32, "\u276F") : " ";
      const label = paint(active ? 1 : 0, option.label);
      const hint = option.hint ? `  ${paint(2, option.hint)}` : "";
      out.write(`${marker} ${label}${hint}\x1b[K\n`);
    });
    out.write(`${paint(2, "Arrow keys choose, 1-2 jump, Enter confirm")}\n`);
  };

  render(true);

  return new Promise((resolve) => {
    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.removeListener("keypress", onKeypress);
      stdin.pause();
      out.write("\x1b[?25h"); // restore the cursor
    };

    const onKeypress = (str, key = {}) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        out.write("\n");
        process.exit(130);
      }
      if (key.name === "escape") {
        cleanup();
        out.write("\n");
        process.exit(130);
      }
      if (key.name === "up" || key.name === "k") {
        index = (index - 1 + options.length) % options.length;
        render(false);
        return;
      }
      if (key.name === "down" || key.name === "j") {
        index = (index + 1) % options.length;
        render(false);
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        cleanup();
        out.write("\n");
        resolve(options[index].value);
        return;
      }
      const digit = Number(str);
      if (Number.isInteger(digit) && digit >= 1 && digit <= options.length) {
        index = digit - 1;
        render(false);
      }
    };

    stdin.on("keypress", onKeypress);
  });
}

function detectPackageManager() {
  if (typeof process !== "undefined" && process.isBun) return "bun";
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
  if (name === ".") {
    const entries = readdirSync(cwd);
    if (entries.length > 0) {
      console.error(`Error: Current directory "${basename(cwd)}" is not empty.`);
      console.error("  Scaffolding into '.' requires an empty directory so existing files are not overwritten.");
      process.exit(1);
    }
    return cwd;
  }
  const dir = join(cwd, name);
  if (existsSync(dir)) {
    console.error(`Error: Directory "${name}" already exists.`);
    process.exit(1);
  }
  return dir;
}

function octalToInt(str) {
  return parseInt(str.replace(/\0.*$/, "").trim(), 8) || 0;
}

const ENGINE_PREFIXES = {
  hono: "package/hono/",
  express: "package/express/",
  fastify: "package/fastify/"
};

function extractTarGz(tgzBuffer, destDir, engine) {
  const buf = gunzipSync(tgzBuffer);
  const prefix = ENGINE_PREFIXES[engine] || ENGINE_PREFIXES.hono;
  let offset = 0;

  while (offset < buf.length - 512) {
    const header = buf.slice(offset, offset + 512);
    if (header.every((b) => b === 0)) break;

    const name = header.slice(0, 100).toString("utf-8").replace(/\0.*$/, "");
    const size = octalToInt(header.slice(124, 136).toString("utf-8"));
    const type = header[156];

    offset += 512;

    if (name && name.startsWith(prefix)) {
      const relativePath = name.slice(prefix.length);
      if (relativePath) {
        const fullPath = join(destDir, relativePath);
        if (type === 48 || type === 0) {
          const dir = dirname(fullPath);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          writeFileSync(fullPath, buf.slice(offset, offset + size));
        } else if (type === 53) {
          if (!existsSync(fullPath)) mkdirSync(fullPath, { recursive: true });
        }
      }
    }

    offset += Math.ceil(size / 512) * 512;
  }
}

function fetchTarball(pkgName, pkgVersion) {
  return new Promise((resolve, reject) => {
    const url = `https://registry.npmjs.org/${pkgName}/-/${pkgName}-${pkgVersion}.tgz`;
    https.get(url, { headers: { Accept: "application/octet-stream" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (res2) => {
          const chunks = [];
          res2.on("data", (c) => chunks.push(c));
          res2.on("end", () => resolve(Buffer.concat(chunks)));
          res2.on("error", reject);
        }).on("error", reject);
        return;
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const yes = args.includes("--yes") || args.includes("-y");
  const engineArg = args.find((a) => a.startsWith("--engine="));
  let projectName = args.find((a) => !a.startsWith("--"));

  // --help works even with --engine set, and before any prompt or network call.
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`create-nexwire v${version}`);
    console.log();
    console.log("Usage:");
    console.log("  npm create nexwire@latest <project-name|.> [--engine=<hono|express|fastify>] [--yes]");
    console.log("  pnpm create nexwire@latest <project-name|.> [--engine=<hono|express|fastify>] [--yes]");
    console.log("  bun create nexwire@latest <project-name|.> [--engine=<hono|express|fastify>] [--yes]");
    console.log("  npx create-nexwire@latest <project-name|.> [--engine=<hono|express|fastify>] [--yes]");
    console.log();
    console.log("Options:");
    console.log("  --engine=<hono|express|fastify>  Backend to scaffold. Asked interactively when omitted.");
    console.log("  -y, --yes                Skip prompts and accept the defaults (requires a project name).");
    console.log("  -h, --help               Show this help.");
    console.log();
    console.log("Backends:");
    console.log("  hono     (default) Hono-based HTTP layer and OpenAPI");
    console.log("  express  Express-based HTTP layer and OpenAPI");
    console.log("  fastify  Fastify-based HTTP layer and OpenAPI");
    console.log();
    console.log("Tip:");
    console.log("  Use '.' to scaffold into the current directory (must be empty).");
    process.exit(0);
  }

  if (engineArg === undefined && args.includes("--engine")) {
    console.error('Error: Missing value for --engine. Use --engine=hono, --engine=express, or --engine=fastify.');
    process.exit(1);
  }

  if (engineArg) {
    const engine = engineArg.split("=")[1].toLowerCase();
    if (backendIndex(engine) === -1) {
      console.error(`Error: Unknown engine "${engine}". Supported backends: ${BACKEND_NAMES.join(", ")}.`);
      process.exit(1);
    }
  }

  if (!projectName) {
    if (!process.stdin.isTTY || yes) {
      console.error("Error: Please provide a project name or '.' to scaffold into the current directory.");
      console.error("  A project name is required when the CLI runs without an interactive terminal.");
      process.exit(1);
    }
    projectName = await ask("Project name or '.' for the current directory: ");
  }

  if (!projectName) {
    console.error("Error: Please provide a project name or '.' to scaffold into the current directory.");
    process.exit(1);
  }

  if (projectName !== "." && !isValidProjectName(projectName)) {
    console.error("Error: Invalid project name. Use alphanumeric, dashes, or underscores, or '.' for the current directory.");
    process.exit(1);
  }

  let engine = engineArg ? engineArg.split("=")[1].toLowerCase() : null;
  if (!engine) {
    if (yes) {
      engine = "hono";
    } else {
      engine = await selectOption("Choose a backend:", BACKENDS, 0);
    }
  }

  const targetDir = resolveTargetDir(projectName);
  const isCurrentDir = targetDir === process.cwd();

  console.log(`\nCreating project "${projectName}" (engine: ${engine})...\n`);

  mkdirSync(targetDir, { recursive: true });

  try {
    console.log("  Downloading template from npm...");
    const tgz = await fetchTarball("create-nexwire", version);
    extractTarGz(tgz, targetDir, engine);
  } catch (err) {
    console.error("Error: Failed to download template from npm registry.");
    console.error("  " + err.message);
    if (isCurrentDir) {
      console.error("  Leaving the current directory in place; nothing was removed.");
    } else {
      rmSync(targetDir, { recursive: true, force: true });
    }
    process.exit(1);
  }

  const gitignoreStub = join(targetDir, "gitignore-stub");
  if (existsSync(gitignoreStub)) {
    renameSync(gitignoreStub, join(targetDir, ".gitignore"));
  }

  const targetPkgPath = join(targetDir, "package.json");
  if (existsSync(targetPkgPath)) {
    const targetPkg = JSON.parse(readFileSync(targetPkgPath, "utf-8"));
    targetPkg.name = projectName === "." ? basename(targetDir) : projectName;
    writeFileSync(targetPkgPath, JSON.stringify(targetPkg, null, 2) + "\n");
  }

  const pm = detectPackageManager();

  const cdName = projectName === "." ? basename(targetDir) : projectName;
  console.log(`Done! Created "${cdName}" (engine: ${engine}) at ${targetDir}`);
  console.log();
  if (projectName !== ".") {
    console.log("  cd " + cdName);
  }
  console.log("  " + pm + " install");
  console.log("  " + (existsSync(join(targetDir, ".env")) ? ".env ready - no copy needed" : process.platform === "win32" ? "copy .env.example .env" : "cp .env.example .env"));
  console.log();
  console.log("Enjoy building with nexwire!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
