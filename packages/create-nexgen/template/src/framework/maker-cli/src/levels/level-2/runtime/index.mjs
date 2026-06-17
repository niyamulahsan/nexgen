import { clearViteCache, runRuntime, runUi, runVite } from "./core.mjs";

/** Register runtime commands (dev, serve, queue, schedule, UI tools) on the CLI program. */
export function registerRuntimeCommands(program, rawArgs) {
  program
    .command("dev")
    .description("Start API + Vue 3 frontend plus optional workers/tools")
    .option("--view <tools>", "Comma-separated UI tools to launch (redis,maildev,studio,bullmq)")
    .option("--with <tools>", "Alias for --view")
    .option("--with-redis-view", "Launch Redis Commander")
    .option("--with-maildev", "Launch MailDev")
    .option("--with-db-studio", "Launch Drizzle Studio")
    .allowUnknownOption(true)
    .action(async () => runRuntime("dev", rawArgs));
  program
    .command("serve")
    .description("Start HTTP server (dist first if built, else src)")
    .option("--prod", "Run production build")
    .option("--runtime <name>", "Runtime: node or bun", "node")
    .option("--watch", "Watch for file changes (src mode)")
    .option("--src", "Force source mode even if dist exists")
    .allowUnknownOption(true)
    .action(async () => runRuntime("serve", rawArgs));
  program
    .command("queue:work")
    .description("Start queue worker (dist first if built, else src)")
    .option("--queue <name>", "Queue name", "default")
    .option("--prod", "Run production build")
    .option("--runtime <name>", "Runtime: node or bun", "node")
    .option("--src", "Force source mode even if dist exists")
    .allowUnknownOption(true)
    .action(async () => runRuntime("queue:work", rawArgs));
  program
    .command("queue:clear")
    .description("Clear all queue keys")
    .allowUnknownOption(true)
    .action(async () => runRuntime("queue:clear", rawArgs));
  program
    .command("schedule:work")
    .description("Start scheduler worker (dist first if built, else src)")
    .option("--prod", "Run production build")
    .option("--runtime <name>", "Runtime: node or bun", "node")
    .option("--src", "Force source mode even if dist exists")
    .allowUnknownOption(true)
    .action(async () => runRuntime("schedule:work", rawArgs));
  program
    .command("maildev:view")
    .description("Start MailDev SMTP and web UI")
    .allowUnknownOption(true)
    .action(async () => runUi("maildev:view"));
  program
    .command("redis:view")
    .description("Start Redis Commander UI")
    .allowUnknownOption(true)
    .action(async () => runUi("redis:view"));
  program
    .command("frontend:dev")
    .description("Start Vue 3 frontend from src/resources")
    .allowUnknownOption(true)
    .action(async () => runVite("src/resources/vite.config.ts"));
  program
    .command("admin:dev")
    .description("Start admin UI dev server")
    .allowUnknownOption(true)
    .action(async () => runVite("src/resources/vite.config.ts"));
  program
    .command("vite:cache:clear")
    .description("Clear Vite cache folders (cross-platform)")
    .allowUnknownOption(true)
    .action(async () => clearViteCache());
}
