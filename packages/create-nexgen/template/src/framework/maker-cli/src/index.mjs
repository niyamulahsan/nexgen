#!/usr/bin/env node

import { Command } from "commander";
import { config } from "dotenv";
import { registerModuleCommands } from "./levels/level-2/module/index.mjs";
import { registerDbCommands } from "./levels/level-2/db/index.mjs";
import { registerRuntimeCommands } from "./levels/level-2/runtime/index.mjs";
import { makerCommandPrefix, showHelp } from "./levels/level-1/help.mjs";

const args = process.argv.slice(2);
const [command] = args;

let deployCommands = new Set();
let registerDeployCommands = () => {};

try {
  const deploy = await import("./levels/level-2/deploy/index.mjs");
  deployCommands = deploy.deployCommands;
  registerDeployCommands = deploy.registerDeployCommands;
} catch {
  /* deploy module not available until user runs deploy:create */
}

if (!deployCommands.has(command || "")) {
  config({ path: ".env", quiet: true });
}

try {
  const program = new Command();
  const namePrefix = makerCommandPrefix();
  program
    .name(namePrefix ? `${namePrefix} maker` : "maker")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .helpOption("-h, --help")
    .addHelpText("beforeAll", "nexgen maker\n");

  registerModuleCommands(program, args);
  registerDeployCommands(program, args);
  registerDbCommands(program, args);
  registerRuntimeCommands(program, args);

  if (!command) {
    showHelp(program);
  } else {
    await program.parseAsync(args, { from: "user" });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
