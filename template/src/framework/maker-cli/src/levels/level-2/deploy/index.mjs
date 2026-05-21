import { createDeploy, importMysqlDumpLocal, importMysqlDumpRemote, runDeploy, runRemoteServer, runRemoteApp, runDeployWorkflow, initDeployWorkflow, runLocalWorkflow, runRemoteWorkflow, initRemoteDeployWorkflow, runPromoteWorkflow } from "./core.mjs";

export const deployCommands = new Set([
  "deploy:create",
  "deploy:create:app",
  "deploy:create:server",
  "deploy:create:server:dev",
  "deploy:server",
  "deploy:app",
  "deploy:db:import",
  "deploy:db:import:remote",
  "deploy:workflow",
  "deploy:workflow:init",
  "deploy:workflow:local",
  "deploy:remote:server",
  "deploy:remote:app",
  "deploy:workflow:remote",
  "deploy:workflow:remote:init",
  "deploy:workflow:promote"
]);

/** Register deploy:* subcommands on the CLI program. */
export function registerDeployCommands(program, rawArgs) {
  const flags = rawArgs.slice(1);
  program
    .command("deploy:create")
    .description("Generate deploy scaffolding files (app + server)")
    .option("--force", "Overwrite existing deploy folder")
    .option("--runtime <name>", "Runtime: node or bun", "node")
    .option("--pm <name>", "Package manager for node runtime: npm, pnpm, yarn", "npm")
    .allowUnknownOption(true)
    .action(async () => createDeploy(flags));
  program
    .command("deploy:create:app")
    .description("Generate app deploy files only")
    .option("--force", "Overwrite existing deploy folder")
    .option("--runtime <name>", "Runtime: node or bun", "node")
    .option("--pm <name>", "Package manager for node runtime: npm, pnpm, yarn", "npm")
    .allowUnknownOption(true)
    .action(async () => createDeploy([...flags, "--app-only"]));
  program
    .command("deploy:create:server")
    .description("Generate server infra files only")
    .option("--force", "Overwrite existing deploy folder")
    .allowUnknownOption(true)
    .action(async () => createDeploy([...flags, "--server-only"]));
  program
    .command("deploy:create:server:dev")
    .description("Generate server infra files only (dev mode with exposed Redis port)")
    .option("--force", "Overwrite existing deploy folder")
    .allowUnknownOption(true)
    .action(async () => createDeploy([...flags, "--server-only", "--dev"]));
  program
    .command("deploy:db:import")
    .description("Import SQL dump into local MySQL container")
    .option("--file <path>", "SQL dump file path", "deploy/nexgen.sql")
    .option("--database <name>", "Target database name", "nexgen")
    .option("--container <name>", "MySQL container name", "mysql-global")
    .option("--user <name>", "MySQL user", "root")
    .option("--password <password>", "MySQL root password (falls back to deploy/server/.env, then deploy/.env)")
    .allowUnknownOption(true)
    .action(async () => importMysqlDumpLocal(flags));
  program
    .command("deploy:db:import:remote")
    .description("Import SQL dump into remote MySQL container via SSH")
    .option("--config <path>", "Remote workflow config path", "deploy/workflow.remote.json")
    .option("--file <path>", "SQL dump file path", "deploy/nexgen.sql")
    .option("--database <name>", "Target database name", "nexgen")
    .option("--container <name>", "MySQL container name", "mysql-global")
    .option("--user <name>", "MySQL user", "root")
    .option("--password <password>", "MySQL root password (falls back to remote deploy/server/.env)")
    .option("--dry-run", "Print commands without executing")
    .allowUnknownOption(true)
    .action(async () => importMysqlDumpRemote(flags));
  program
    .command("deploy:server")
    .description("Start shared server infra (auto-generates files if missing)")
    .allowUnknownOption(true)
    .action(async () => runDeploy("deploy:server"));
  program
    .command("deploy:app")
    .description("Start app stack locally (build + Docker compose up)")
    .allowUnknownOption(true)
    .action(async () => runDeploy("deploy:app"));
  program
    .command("deploy:workflow")
    .description("Run local CI/CD workflow from config file or flags")
    .option("--config <path>", "Workflow config path")
    .option("--server-only", "Run server infra step only")
    .option("--app-only", "Run app deploy step only")
    .option("--refresh", "Regenerate deploy files before running")
    .option("--dry-run", "Print steps without executing")
    .allowUnknownOption(true)
    .action(async () => runDeployWorkflow(flags));
  program
    .command("deploy:workflow:init")
    .description("Create editable local workflow config file")
    .allowUnknownOption(true)
    .action(async () => initDeployWorkflow());
  program
    .command("deploy:workflow:local")
    .description("Run local Docker Desktop test pipeline")
    .option("--server-only", "Run server infra step only")
    .option("--app-only", "Run app deploy step only")
    .option("--refresh", "Regenerate deploy files before running")
    .option("--dry-run", "Print steps without executing")
    .allowUnknownOption(true)
    .action(async () => runLocalWorkflow(flags));
  program
    .command("deploy:remote:server")
    .description("Start shared server infra on remote host (via SSH)")
    .option("--config <path>", "Remote workflow config path")
    .allowUnknownOption(true)
    .action(async () => runRemoteServer(flags));
  program
    .command("deploy:remote:app")
    .description("Build and start app stack on remote host (via SSH)")
    .option("--config <path>", "Remote workflow config path")
    .allowUnknownOption(true)
    .action(async () => runRemoteApp(flags));
  program
    .command("deploy:workflow:remote")
    .description("Upload full repo and deploy on remote Docker host")
    .option("--config <path>", "Remote workflow config path")
    .option("--server-only", "Run server infra step only")
    .option("--app-only", "Run app deploy step only")
    .option("--dry-run", "Print commands without executing")
    .allowUnknownOption(true)
    .action(async () => runRemoteWorkflow(flags));
  program
    .command("deploy:workflow:remote:init")
    .description("Create editable remote workflow config file")
    .allowUnknownOption(true)
    .action(async () => initRemoteDeployWorkflow());
  program
    .command("deploy:workflow:promote")
    .description("Run local workflow then remote workflow")
    .option("--config <path>", "Workflow config path")
    .option("--server-only", "Run server infra step only")
    .option("--app-only", "Run app deploy step only")
    .option("--refresh", "Regenerate deploy files before running")
    .option("--dry-run", "Print commands without executing")
    .allowUnknownOption(true)
    .action(async () => runPromoteWorkflow(flags));
}
