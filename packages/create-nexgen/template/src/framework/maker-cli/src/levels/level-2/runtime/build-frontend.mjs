import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const isFalse = (v) => v === "false";

const envFile = resolve(process.cwd(), ".env");
const fileDisabled = existsSync(envFile) && /^FRONTEND=false\s*$/m.test(readFileSync(envFile, "utf-8"));

if (isFalse(process.env.FRONTEND) || fileDisabled) {
  console.log("Frontend build skipped (FRONTEND=false)");
  mkdirSync("public", { recursive: true });
  process.exit(0);
}

execSync("vite build --config src/resources/vite.config.ts", { stdio: "inherit" });
