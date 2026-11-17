#!/usr/bin/env node
import { Command } from "commander";
import { registerConfigCommands } from "./commands/config.js";
import { registerAuthCommands } from "./commands/auth.js";
import { registerMcpCommand } from "./commands/mcp.js";
import { registerOperationCommands, registerOperationTools } from "./commands/operations.js";
import { resolveBaseUrl } from "./config.js";
import { loadManifest } from "./manifest.js";

const program = new Command();
program
  .name("betaray")
  .description("Betaray CLI — test management for terminals, CI and AI agents")
  .version("0.2.0", "-V, --cli-version", "Show CLI version")
  .option("--url <url>", "Betaray base URL (overrides config and BETARAY_URL)")
  .option("--token <token>", "API token (overrides config and BETARAY_TOKEN)")
  .option("--project <id>", "Project ID; optional with a token, which already names its project")
  .option("--organization <id>", "Organization ID, for organization-level operations")
  .option("--json", "Compact JSON output, including errors")
  .option("--verbose", "Log HTTP requests to stderr")
  .addHelpText("after", `
Commands below "mcp" are generated from the server you are connected to
(GET <url>/api/operations), so they always match its capabilities.
Run "betaray ops" to list them, or "betaray <group> <verb> --help" for the fields.

Environment: BETARAY_URL, BETARAY_TOKEN, BETARAY_PROJECT, BETARAY_CONFIG

Examples:
  betaray login --url https://betaray.example.com --token btr_xxx
  betaray test list --priority High --limit 20
  betaray test create --summary "Login flow" --steps @steps.json
  betaray execution create --name "Nightly" --test-keys MAIN-401,MAIN-402 --env Staging
  betaray execution import --key MAIN-410 --results @results.json
  betaray call requirement.coverage
  betaray mcp        # stdio MCP server for AI agents
`);

registerConfigCommands(program);
registerAuthCommands(program);
registerMcpCommand(program);

// Commands that work without the server's operation list.
const LOCAL = new Set(["config", "login", "logout", "mcp", "status", "whoami"]);
const VALUE_FLAGS = new Set(["--url", "--token", "--project", "--organization"]);
function firstCommand(argv: string[]) {
  for (let index = 0; index < argv.length; index++) {
    if (VALUE_FLAGS.has(argv[index])) index++;
    else if (!argv[index].startsWith("-")) return argv[index];
  }
  return undefined;
}
function flagValue(argv: string[], flag: string) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : argv.find((arg) => arg.startsWith(flag + "="))?.slice(flag.length + 1);
}

async function main() {
  const argv = process.argv.slice(2);
  const command = firstCommand(argv);
  const url = resolveBaseUrl({ url: flagValue(argv, "--url") });
  if (url && !(command && LOCAL.has(command))) {
    try {
      const operations = await loadManifest(url, command === "ops");
      registerOperationCommands(program, operations);
      registerOperationTools(program, operations);
    } catch (error) {
      // Still show help and local commands; anything else cannot run without the list.
      if (command && command !== "help") {
        process.stderr.write(`Error: ${(error as Error).message}\n`);
        process.exit(1);
      }
    }
  } else if (!url && command && !LOCAL.has(command) && command !== "help") {
    process.stderr.write("No server configured. Run: betaray login --url <url> --token <token>\n");
    process.exit(1);
  }
  await program.parseAsync(process.argv);
}

main().catch((error) => {
  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
