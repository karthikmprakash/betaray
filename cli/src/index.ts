#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { registerConfigCommands } from "./commands/config.js";
import { registerAuthCommands } from "./commands/auth.js";
import { registerProjectCommands } from "./commands/project.js";
import { registerTestCommands } from "./commands/test.js";
import { registerExecutionCommands } from "./commands/execution.js";
import { registerRequirementCommands } from "./commands/requirement.js";
import { registerDraftCommands } from "./commands/draft.js";
import { registerImportCommand } from "./commands/import.js";

const program = new Command();

program
  .name("betaray")
  .description("Betaray CLI — automate test management from your terminal and AI agents")
  .version("0.1.0", "-v, --version", "Show version")
  .option("--url <url>", "Betaray base URL (overrides config and BETARAY_URL)")
  .option("--token <token>", "API bearer token (overrides config and BETARAY_TOKEN)")
  .option("--project <id>", "Project ID (overrides config and BETARAY_PROJECT)")
  .option("--json", "Output as JSON (for AI agents and piping)")
  .option("--verbose", "Verbose HTTP logging")
  .addHelpText("after", `
Environment variables:
  BETARAY_URL      Base URL of your Betaray instance
  BETARAY_TOKEN    API token (bearer)
  BETARAY_PROJECT  Default project ID
  BETARAY_CONFIG   Custom config file path
  XDG_CONFIG_HOME  Base for config directory

Examples:
  betaray login --url https://betaray.example.com --token btr_xxx --project proj_123
  betaray test list --limit 20 --json
  betaray test create --summary "Login flow" --type Manual --priority High
  echo '{"summary":"API test"}' | betaray test create --stdin --project proj_123
  betaray execution create --name "Sprint 1" --tests PROJ-1,PROJ-2 --env Staging
  betaray execution import --execution PROJ-5 --file results.json
  betaray import --file export.json --project proj_123
`);

registerConfigCommands(program);
registerAuthCommands(program);
registerProjectCommands(program);
registerTestCommands(program);
registerExecutionCommands(program);
registerRequirementCommands(program);
registerDraftCommands(program);
registerImportCommand(program);

// global error handler for unhandled rejections
process.on("unhandledRejection", (err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(chalk.red(`Error: ${msg}\n`));
  process.exit(1);
});

program.parseAsync(process.argv).catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  // commander already prints help/errors; only handle unexpected
  if (msg && !msg.includes("commander")) {
    process.stderr.write(chalk.red(`Error: ${msg}\n`));
  }
  process.exit(1);
});
