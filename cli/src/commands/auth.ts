import { Command } from "commander";
import chalk from "chalk";
import { loadConfig, saveConfig, configFilePath } from "../config.js";
import { normalizeBaseUrl } from "../api.js";
import { maskToken } from "../output.js";
import { invoke, type GlobalOptions } from "./operations.js";

interface ProjectInfo {
  id: string;
  key: string;
  name: string;
  access: string;
  counts: Record<string, number>;
}
/** A token names its own project, so `project.get` verifies URL, token and scope in one call. */
const verify = (options: GlobalOptions) => invoke(options, "project.get", {}) as Promise<ProjectInfo>;

export function registerAuthCommands(program: Command): void {
  program.command("login")
    .description("Save the server URL and API token, then verify them")
    .action(async () => {
      const { url, token, project } = program.opts<GlobalOptions>();
      if (!url || !token) {
        process.stderr.write("Usage: betaray login --url <url> --token <token> [--project <id>]\n");
        process.exit(1);
      }
      const cfg = loadConfig();
      cfg.url = normalizeBaseUrl(url);
      cfg.token = token;
      if (project) cfg.project = project;
      else delete cfg.project;
      saveConfig(cfg);
      process.stdout.write(chalk.green(`Saved config to ${configFilePath()}\n`));
      try {
        const info = await verify({ url: cfg.url, token, project });
        process.stdout.write(chalk.green(`Verified: ${info.key} ${info.name} (${info.access})\n`));
      } catch (error) {
        process.stderr.write(chalk.yellow(`Saved, but verification failed: ${(error as Error).message}\n`));
        process.exit(1);
      }
    });

  program.command("logout")
    .description("Clear the saved API token")
    .action(() => {
      const cfg = loadConfig();
      delete cfg.token;
      saveConfig(cfg);
      process.stdout.write(chalk.green("Cleared token.\n"));
    });

  for (const name of ["status", "whoami"])
    program.command(name)
      .description(name === "status" ? "Show current config and validate the token" : "Alias for status")
      .action(async () => {
        const globals = program.opts<GlobalOptions>();
        const cfg = loadConfig();
        const url = globals.url || process.env.BETARAY_URL || cfg.url;
        const token = globals.token || process.env.BETARAY_TOKEN || cfg.token;
        const out: Record<string, unknown> = {
          configFile: configFilePath(),
          url: url ?? null,
          token: token ? maskToken(token) : null,
          verified: false,
        };
        try {
          if (!url || !token) throw new Error(!url ? "No URL configured" : "No token configured");
          out.project = await verify(globals);
          out.verified = true;
        } catch (error) {
          out.error = (error as Error).message;
        }
        process.stdout.write(JSON.stringify(out, null, globals.json ? 0 : 2) + "\n");
        if (!out.verified) process.exit(1);
      });
}
