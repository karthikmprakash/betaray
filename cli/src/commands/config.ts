import { Command } from "commander";
import chalk from "chalk";
import { loadConfig, saveConfig, configFilePath, validKeys, isValidKey, resolveBaseUrl } from "../config.js";
import { jsonOut, tableOut, errorOut, maskToken } from "../output.js";

export function registerConfigCommands(program: Command): void {
  const cfg = program.command("config").description("Manage local CLI configuration");

  cfg.command("set")
    .description("Set a config value")
    .argument("<key>", `Config key: ${validKeys().join(", ")}`)
    .argument("<value>", "Value to set")
    .action((key: string, value: string) => {
      if (!isValidKey(key)) {
        errorOut(`Unknown key "${key}". Valid keys: ${validKeys().join(", ")}`);
        process.exit(1);
      }
      if (key === "format" && value !== "json" && value !== "table") {
        errorOut(`format must be "json" or "table"`);
        process.exit(1);
      }
      const cur = loadConfig();
      (cur as Record<string, string>)[key] = value;
      saveConfig(cur);
      process.stdout.write(chalk.green(`Set ${key}=${key === "token" ? maskToken(value) : value}\n`));
      process.stdout.write(chalk.dim(`Config: ${configFilePath()}\n`));
    });

  cfg.command("get")
    .description("Get config value(s)")
    .argument("[key]", `Config key to show (${validKeys().join(", ")}), or omit for all`)
    .option("--json", "Output as JSON")
    .option("--show-token", "Show full token instead of masked")
    .action((key: string | undefined, opts: { json?: boolean; showToken?: boolean }) => {
      const cur = loadConfig();
      if (key) {
        if (!isValidKey(key)) {
          errorOut(`Unknown key "${key}". Valid keys: ${validKeys().join(", ")}`);
          process.exit(1);
        }
        const val = (cur as Record<string, string | undefined>)[key];
        if (opts.json) jsonOut({ [key]: val ?? null });
        else {
          if (val === undefined) { process.stdout.write(chalk.dim(`(not set)\n`)); return; }
          const display = key === "token" && !opts.showToken ? maskToken(val) : val;
          process.stdout.write(`${display}\n`);
        }
        return;
      }
      if (opts.json) {
        const masked = { ...cur } as Record<string, string | undefined>;
        if (masked.token && !opts.showToken) masked.token = maskToken(masked.token);
        jsonOut(masked);
      } else {
        const rows = validKeys().map((k) => {
          const v = (cur as Record<string, string | undefined>)[k];
          if (v === undefined) return [k, chalk.dim("(not set)")];
          if (k === "token" && !opts.showToken) return [k, maskToken(v)];
          return [k, v];
        });
        tableOut(["Key", "Value"], rows);
        process.stdout.write(chalk.dim(`\nConfig file: ${configFilePath()}\n`));
      }
    });

  cfg.command("path")
    .description("Print the config file path")
    .action(() => {
      process.stdout.write(configFilePath() + "\n");
    });

  cfg.command("reset")
    .description("Clear all config (remove config file)")
    .option("--force", "Skip confirmation")
    .action((opts: { force?: boolean }) => {
      const p = configFilePath();
      const cur = loadConfig();
      if (Object.keys(cur).length === 0) {
        process.stdout.write(chalk.dim("Config already empty.\n"));
        return;
      }
      // non-interactive: just reset
      saveConfig({});
      process.stdout.write(chalk.yellow(`Cleared config at ${p}\n`));
    });
}
