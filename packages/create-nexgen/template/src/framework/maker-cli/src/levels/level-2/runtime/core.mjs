import { spawn } from "node:child_process";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";
import { getOption, hasFlag } from "../../level-1/flags.mjs";
import { localBin, packageScript, runCommand, runNodeScript } from "../../level-1/process.mjs";

/** Parse --with or --view flags to determine which dev tools to launch. */
function parseWithOptions(flags = []) {
  const supported = new Set(["redis", "maildev", "studio", "bullmq"]);
  const selected = new Set();

  for (const raw of [getOption(flags, "--with"), getOption(flags, "--view")]) {
    if (!raw) continue;
    for (const item of raw.split(",")) {
      const key = item.trim().toLowerCase();
      if (!key) continue;

      const normalized = key === "queue" ? "bullmq" : key;
      if (!supported.has(normalized)) {
        console.warn(
          `[dev] Unknown --with option '${key}' (supported: redis, maildev, studio, bullmq)`
        );
        continue;
      }

      selected.add(normalized);
    }
  }

  return selected;
}

/** Build a list of dev UI tools to launch based on flags and with-options. */
function devViewList(flags = [], withOptions = new Set()) {
  const selected = new Set(withOptions);
  if (hasFlag(flags, "--with-redis-view")) selected.add("redis");
  if (hasFlag(flags, "--with-maildev")) selected.add("maildev");
  if (hasFlag(flags, "--with-db-studio")) selected.add("studio");
  return Array.from(selected);
}

/** Build redis-commander CLI arguments from REDIS_URL env. */
function redisConnectionArgs() {
  const redisUrl = new URL(process.env.REDIS_URL || "redis://127.0.0.1:6379");
  const result = [
    "--port",
    process.env.REDIS_COMMANDER_PORT || "1369",
    "--redis-host",
    redisUrl.hostname || "127.0.0.1",
    "--redis-port",
    redisUrl.port || "6379"
  ];

  if (redisUrl.password) result.push("--redis-password", decodeURIComponent(redisUrl.password));
  return result;
}

/** Poll the API health endpoint until it responds or retries exhausted. */
async function waitForHealth(url, maxRetries = 60, intervalMs = 500) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`API health-check failed after ${maxRetries} attempts (${url})`);
}

/** Run the full dev stack: API, frontend, queue worker, and optional UI tools. */
async function runDevStack(flags = []) {
  const commands = [
    { label: "api", args: ["serve", "--src"], required: true, hint: "http://localhost:3000" }
  ];

  if (process.env.FRONTEND !== "false") {
    commands.push({
      label: "frontend",
      args: ["frontend:dev"],
      required: true,
      hint: "http://localhost:5173"
    });
  }

  if (process.env.REDIS !== "false") {
    commands.push({
      label: "queue-worker",
      args: ["queue:work", "--queue=default,mail", "--quiet", "--src"],
      required: false
    });
  }

  const withOptions = parseWithOptions(flags);
  const views = devViewList(flags, withOptions);
  const enableRedisView =
    process.env.REDIS !== "false" &&
    (hasFlag(flags, "--with-redis-view") || withOptions.has("redis"));
  const enableMaildev = hasFlag(flags, "--with-maildev") || withOptions.has("maildev");
  const enableDbStudio = hasFlag(flags, "--with-db-studio") || withOptions.has("studio");

  if (enableRedisView) {
    commands.push({
      label: "redis-view",
      args: ["redis:view", "--quiet"],
      required: false,
      hint: "http://localhost:1369"
    });
  }
  if (enableMaildev) {
    commands.push({
      label: "maildev-view",
      args: ["maildev:view", "--quiet"],
      required: false,
      hint: "http://localhost:1080"
    });
  }
  if (enableDbStudio) {
    commands.push({
      label: "db-studio",
      args: ["db:studio", "--quiet"],
      required: false,
      hint: "https://local.drizzle.studio"
    });
  }

  const children = [];
  let shuttingDown = false;
  let settled = false;

  const killAll = () => {
    for (const child of children) {
      if (child.killed) continue;
      try {
        child.kill("SIGTERM");
      } catch {}
    }
  };

  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    killAll();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  const apiCmd = commands.find((c) => c.label === "api");
  const rest = commands.filter((c) => c.label !== "api");

  await new Promise(async (resolve, reject) => {
    const apiChild = spawn(process.execPath, [process.argv[1], ...apiCmd.args], {
      stdio: "inherit",
      env: {
        ...process.env,
        NEXGEN_DEV_VIEWS: views.join(","),
        NEXGEN_FRONTEND_URL: "http://localhost:5173"
      }
    });
    children.push(apiChild);

    apiChild.on("exit", (code, signal) => {
      if (settled) return;
      if (!shuttingDown && (code !== null || signal !== null)) {
        settled = true;
        shutdown();
        reject(new Error(`api exited (${signal || code})`));
      }
    });
    apiChild.on("error", (error) => {
      if (settled) return;
      settled = true;
      shutdown();
      reject(error);
    });

    try {
      await waitForHealth("http://localhost:3000/health");
    } catch (err) {
      settled = true;
      shutdown();
      reject(err);
      return;
    }

    for (const command of rest) {
      const child = spawn(process.execPath, [process.argv[1], ...command.args], {
        stdio: command.label === "queue-worker" ? "inherit" : ["ignore", "pipe", "inherit"],
        env: { ...process.env }
      });
      children.push(child);

      child.on("exit", (code, signal) => {
        if (settled) return;
        if (!shuttingDown && (code !== null || signal !== null)) {
          if (command.required) {
            settled = true;
            shutdown();
            reject(new Error(`${command.label} exited (${signal || code})`));
            return;
          }
          if (code !== 0 || signal) {
            console.warn(
              `[dev] Optional process '${command.label}' exited (${signal || code}); continuing`
            );
          }
        }

        const allExited = children.every(
          (item) => item.exitCode !== null || item.signalCode !== null
        );
        if (allExited) {
          settled = true;
          resolve();
        }
      });

      child.on("error", (error) => {
        if (settled) return;
        settled = true;
        shutdown();
        reject(error);
      });
    }
  }).finally(() => {
    process.off("SIGINT", shutdown);
    process.off("SIGTERM", shutdown);
    killAll();
  });
}

/** Run a runtime command: dev, serve, queue:work, queue:clear, schedule:work. */
export async function runRuntime(commandName, rawArgs = []) {
  const prod = rawArgs.includes("--prod");
  const forceSrc = rawArgs.includes("--src");
  const watch = rawArgs.includes("--watch");
  const runtimeArg = rawArgs.find((arg) => arg.startsWith("--runtime="));
  const runtime = runtimeArg ? runtimeArg.split("=")[1].trim().toLowerCase() : "node";

  if (!["node", "bun"].includes(runtime)) {
    throw new Error(`Invalid runtime '${runtime}'. Supported values: node, bun`);
  }

  const runtimeArgs = rawArgs.filter(
    (arg, i) => i > 0 && !arg.startsWith("--runtime=") && arg !== "--prod" && arg !== "--src"
  );
  const hasDistServer = fsSync.existsSync(
    path.resolve(process.cwd(), "dist/src/framework/server.js")
  );
  const hasDistWorker = fsSync.existsSync(
    path.resolve(process.cwd(), "dist/src/framework/queue/worker.js")
  );
  const hasDistScheduler = fsSync.existsSync(
    path.resolve(process.cwd(), "dist/src/framework/scheduler/run.js")
  );

  if (commandName === "dev") {
    await runDevStack(rawArgs.slice(1));
    return;
  }

  if (commandName === "serve") {
    if (!forceSrc && (prod || hasDistServer)) {
      const entry = path.resolve(process.cwd(), "dist/src/framework/server.js");
      const command = runtime === "bun" ? "bun" : process.execPath;
      await runCommand(command, [entry, ...runtimeArgs]);
      return;
    }

    const useWatch = watch || (!prod && forceSrc);
    const tsxWatchIgnore = [
      "--include",
      "src/**/*.ts",
      "--include",
      "src/framework/maker-cli/src/**/*.mjs",
      "--exclude",
      "src/storage/**",
      "--exclude",
      "src/storage/logs/**",
      "--exclude",
      "src/storage/tmp/**",
      "--exclude",
      "src/database/migrations/**",
      "--exclude",
      "src/database/schema.ts",
      "--exclude",
      "public/**",
      "--exclude",
      "dist/**",
      "--exclude",
      ".git/**",
      "--exclude",
      "node_modules/**",
      "--exclude",
      "**/.DS_Store",
      "--exclude",
      "**/Thumbs.db",
      "--exclude",
      "**/*.log"
    ];
    const tsxArgs = useWatch
      ? ["watch", ...tsxWatchIgnore, "src/framework/server.ts", ...runtimeArgs]
      : ["src/framework/server.ts", ...runtimeArgs];
    await runCommand(localBin("tsx"), tsxArgs);
    return;
  }

  if (commandName === "queue:work") {
    if (!forceSrc && (prod || hasDistWorker)) {
      const entry = path.resolve(process.cwd(), "dist/src/framework/queue/worker.js");
      const command = runtime === "bun" ? "bun" : process.execPath;
      await runCommand(command, [entry, ...runtimeArgs]);
      return;
    }

    await runNodeScript(packageScript("tsx", "dist/cli.mjs"), [
      "src/framework/queue/worker.ts",
      ...rawArgs.slice(1)
    ]);
    return;
  }

  if (commandName === "queue:clear") {
    await runNodeScript(packageScript("tsx", "dist/cli.mjs"), ["src/framework/queue/clear.ts"]);
    return;
  }

  if (commandName === "schedule:work") {
    if (!forceSrc && (prod || hasDistScheduler)) {
      const entry = path.resolve(process.cwd(), "dist/src/framework/scheduler/run.js");
      const command = runtime === "bun" ? "bun" : process.execPath;
      await runCommand(command, [entry, ...runtimeArgs]);
      return;
    }

    await runNodeScript(packageScript("tsx", "dist/cli.mjs"), [
      "src/framework/scheduler/run.ts",
      ...rawArgs.slice(1)
    ]);
  }
}

/** Launch a UI tool: maildev or redis-commander. */
export async function runUi(commandName) {
  if (commandName === "maildev:view") {
    await runCommand(localBin("maildev"), [
      "--smtp",
      process.env.MAIL_PORT || process.env.MAILDEV_SMTP_PORT || "1025",
      "--web",
      process.env.MAILDEV_WEB_PORT || "1080"
    ]);
    return;
  }

  if (commandName === "redis:view") {
    await runCommand(localBin("redis-commander"), redisConnectionArgs());
  }
}

/** Start Vite dev server for a specific config file. */
export async function runVite(configPath) {
  await runCommand(localBin("vite"), ["--config", configPath]);
}

/** Clear Vite cache directories. */
export async function clearViteCache() {
  const dirs = [
    path.resolve(process.cwd(), "node_modules/.vite"),
    path.resolve(process.cwd(), "src/resources/node_modules/.vite")
  ];

  for (const dir of dirs) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }

  const strayCaches = await glob("**/.vite", {
    cwd: process.cwd(),
    nodir: false,
    ignore: ["**/node_modules/**/.vite/**", "**/.git/**"],
    windowsPathsNoEscape: true
  });

  for (const rel of strayCaches) {
    const fullPath = path.resolve(process.cwd(), rel);
    await fs.rm(fullPath, { recursive: true, force: true }).catch(() => {});
  }

  console.log("Vite cache cleared.");
}
