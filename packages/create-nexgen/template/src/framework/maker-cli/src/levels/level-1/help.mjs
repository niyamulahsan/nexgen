/**
 * Why: Detects the package manager used to run the CLI, for help usage text.
 * When: Building the program name shown in the "Usage:" line.
 * Where: Maker CLI entry flow.
 * How: Reads npm config user-agent and maps to the corresponding prefix string.
 */
export function makerCommandPrefix() {
  const ua = String(process.env.npm_config_user_agent || "").toLowerCase();
  if (ua.startsWith("pnpm/")) return "pnpm";
  if (ua.startsWith("yarn/")) return "yarn";
  if (ua.startsWith("bun/")) return "bun";
  if (ua.startsWith("npm/")) return "npm run";
  return "";
}

/**
 * Why: Shows commander-generated help for the maker CLI program.
 * When: CLI runs without a valid command.
 * Where: Maker CLI entry flow and error handlers.
 * How: Delegates to commander's outputHelp for consistent automatically-synced output.
 */
export function showHelp(program) {
  program.outputHelp();
}
