import { Command } from "commander";
import chalk from "chalk";
import { loadConfig, saveConfig, configFilePath } from "../config.js";
import { ApiClient, normalizeBaseUrl } from "../api.js";
import { maskToken } from "../output.js";

export function registerAuthCommands(program: Command): void {
  program.command("login")
    .description("Save URL/token and verify the connection")
    .requiredOption("--url <url>", "Betaray base URL (e.g. https://betaray.example.com)")
    .requiredOption("--token <token>", "API token (bearer)")
    .option("--project <id>", "Default project ID")
    .option("--verbose", "Verbose output")
    .action(async (opts: { url: string; token: string; project?: string; verbose?: boolean }) => {
      const baseUrl = normalizeBaseUrl(opts.url);
      const cfg = loadConfig();
      cfg.url = baseUrl;
      cfg.token = opts.token;
      if (opts.project) cfg.project = opts.project;
      saveConfig(cfg);
      process.stdout.write(chalk.green(`Saved config to ${configFilePath()}\n`));
      if (opts.project) process.stdout.write(chalk.dim(`Project: ${opts.project}\n`));

      // verify: try GET /api/tests?projectId=
      const projectId = opts.project || cfg.project;
      if (projectId) {
        try {
          const api = new ApiClient({ baseUrl, token: opts.token, verbose: opts.verbose });
          await api.get(`/api/tests?projectId=${encodeURIComponent(projectId)}`);
          process.stdout.write(chalk.green(`Verified token for project ${projectId}\n`));
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          process.stderr.write(chalk.yellow(`Warning: verification failed: ${msg}\n`));
          process.stderr.write(chalk.dim(`Token saved but could not verify. Check project ID and token scope.\n`));
        }
      } else {
        // try platform endpoint without projectId if no project given
        try {
          const api = new ApiClient({ baseUrl, token: opts.token, verbose: opts.verbose });
          await api.get(`/api/platform`);
          process.stdout.write(chalk.green(`Verified token (platform reachable)\n`));
        } catch (e) {
          process.stderr.write(chalk.dim(`Saved. Run 'betaray status' to verify after setting a project.\n`));
        }
      }
    });

  program.command("logout")
    .description("Clear the saved API token")
    .action(() => {
      const cfg = loadConfig();
      if (!cfg.token) {
        process.stdout.write(chalk.dim("No token saved.\n"));
        return;
      }
      delete cfg.token;
      saveConfig(cfg);
      process.stdout.write(chalk.green("Cleared token.\n"));
    });

  program.command("status")
    .description("Show current config and validate the token")
    .option("--verbose", "Verbose output")
    .option("--json", "Output as JSON")
    .action(async (opts: { verbose?: boolean; json?: boolean }, cmd: Command) => {
      const globalOpts = cmd.parent?.opts() as { url?: string; token?: string; project?: string; verbose?: boolean } | undefined;
      await statusAction({ ...globalOpts, ...opts });
    });

  program.command("whoami")
    .description("Alias for status — show who you are")
    .option("--verbose", "Verbose output")
    .option("--json", "Output as JSON")
    .action(async (opts: { verbose?: boolean; json?: boolean }, cmd: Command) => {
      const globalOpts = cmd.parent?.opts() as { url?: string; token?: string; project?: string; verbose?: boolean } | undefined;
      await statusAction({ ...globalOpts, ...opts });
    });
}

async function statusAction(opts: { url?: string; token?: string; project?: string; verbose?: boolean; json?: boolean }): Promise<void> {
  const { loadConfig: lc, configFilePath: cfp, getEffective } = await import("../config.js");
  const cfg = lc();
  const url = opts.url || process.env.BETARAY_URL || cfg.url;
  const token = opts.token || process.env.BETARAY_TOKEN || cfg.token;
  const project = opts.project || process.env.BETARAY_PROJECT || cfg.project;
  const tokenMasked = token ? maskToken(token) : "(not set)";

  if (opts.json) {
    const out: Record<string, unknown> = {
      configFile: cfp(),
      url: url ?? null,
      project: project ?? null,
      token: token ? tokenMasked : null,
      format: cfg.format ?? null,
    };
    if (url && token) {
      try {
        const api = new ApiClient({ baseUrl: url, token, verbose: opts.verbose });
        if (project) {
          const data = await api.get(`/api/tests?projectId=${encodeURIComponent(project)}`) as { count?: number };
          out.verified = true;
          out.testCount = data.count ?? null;
        } else {
          const data = await api.get(`/api/platform`) as unknown;
          out.verified = true;
          out.platform = data ? "reachable" : null;
        }
      } catch (e) {
        out.verified = false;
        out.error = e instanceof Error ? e.message : String(e);
        const status = (e as { status?: number }).status;
        if (status) out.status = status;
      }
    } else {
      out.verified = false;
      out.error = !url ? "No URL configured" : "No token configured";
    }
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    if (out.verified === false) process.exit(1);
    return;
  }

  process.stdout.write(chalk.bold("Betaray CLI status\n"));
  process.stdout.write(`  Config:  ${cfp()}\n`);
  process.stdout.write(`  URL:     ${url ? chalk.cyan(url) : chalk.dim("(not set)")} ${!url ? chalk.dim("-- set via config set url <url>") : ""}\n`);
  process.stdout.write(`  Token:   ${token ? chalk.dim(tokenMasked) : chalk.dim("(not set)")}\n`);
  process.stdout.write(`  Project: ${project ? chalk.cyan(project) : chalk.dim("(not set)")}\n`);
  process.stdout.write(`  Format:  ${cfg.format ?? chalk.dim("(table)")}\n`);

  if (!url || !token) {
    process.stdout.write(chalk.yellow("\nNot fully configured. Run: betaray login --url <url> --token <token>\n"));
    process.exit(1);
  }

  try {
    const api = new ApiClient({ baseUrl: url, token, verbose: opts.verbose });
    if (project) {
      const data = await api.get(`/api/tests?projectId=${encodeURIComponent(project)}`) as { count?: number };
      process.stdout.write(chalk.green(`\nVerified — token valid for project ${project} (${data.count ?? "?"} tests)\n`));
    } else {
      await api.get(`/api/platform`);
      process.stdout.write(chalk.green(`\nVerified — platform reachable\n`));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = (e as { status?: number }).status;
    process.stderr.write(chalk.red(`\nVerification failed${status ? ` (${status})` : ""}: ${msg}\n`));
    process.exit(1);
  }
}
