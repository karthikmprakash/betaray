import { Command } from "commander";
import chalk from "chalk";
import { ApiClient } from "../api.js";
import { resolveBaseUrl, resolveToken, resolveProject, resolveFormat } from "../config.js";
import { jsonOut, tableOut, errorOut } from "../output.js";

export function registerRequirementCommands(program: Command): void {
  const req = program.command("requirement").description("Manage requirements (issues)").alias("req");

  req.command("list")
    .description("List requirements in a project")
    .option("--project <id>", "Project ID")
    .option("--json", "Output as JSON")
    .option("--limit <n>", "Max to show", "50")
    .action(async function (opts: { project?: string; json?: boolean; limit?: string }) {
      const g = program.opts() as { url?: string; token?: string; project?: string; verbose?: boolean };
      const c = { ...g, ...opts };
      const baseUrl = resolveBaseUrl(c as never);
      if (!baseUrl) { errorOut("No URL configured."); process.exit(1); }
      const token = resolveToken(c as never);
      const project = resolveProject(c as never);
      if (!project) { errorOut("No project set."); process.exit(1); }
      const api = new ApiClient({ baseUrl, token, verbose: g.verbose });
      try {
        const data = await api.get(`/api/platform?projectId=${encodeURIComponent(project)}`) as { requirements?: Array<{ key: string; summary: string; type: string; priority?: string }> };
        const items = data.requirements ?? [];
        const limit = Math.max(1, Math.min(500, parseInt(opts.limit ?? "50", 10) || 50));
        const sliced = items.slice(0, limit);
        const useJson = !!(c.json as boolean) || resolveFormat(c as never) === "json";
        if (useJson) { jsonOut(sliced); return; }
        if (sliced.length === 0) { process.stdout.write(chalk.dim("No requirements found.\n")); return; }
        tableOut(["Key", "Summary", "Type"], sliced.map((r) => [r.key, (r.summary ?? "").slice(0, 60), r.type ?? ""]));
      } catch (e) {
        errorOut(`Failed to list requirements: ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  req.command("create")
    .description("Create a requirement")
    .requiredOption("--summary <text>", "Requirement summary")
    .option("--type <type>", "Type: Story, Bug, Task (default Story)")
    .option("--priority <p>", "Priority: Highest, High, Medium, Low (default Medium)")
    .option("--project <id>", "Project ID")
    .option("--json", "Output as JSON")
    .action(async function (opts: { summary: string; type?: string; priority?: string; project?: string; json?: boolean }) {
      const g = program.opts() as { url?: string; token?: string; project?: string; verbose?: boolean };
      const c = { ...g, ...opts };
      const baseUrl = resolveBaseUrl(c as never);
      if (!baseUrl) { errorOut("No URL configured."); process.exit(1); }
      const token = resolveToken(c as never);
      const project = resolveProject(c as never);
      if (!project) { errorOut("No project set."); process.exit(1); }
      const api = new ApiClient({ baseUrl, token, verbose: g.verbose });
      try {
        const body = { action: "requirement.create", projectId: project, input: { summary: opts.summary, type: opts.type ?? "Story", priority: opts.priority ?? "Medium" } };
        const result = await api.post("/api/platform", body) as Record<string, unknown>;
        const created = (result as { result?: unknown }).result ?? result;
        const useJson = !!(c.json as boolean) || resolveFormat(c as never) === "json";
        if (useJson) jsonOut(created);
        else process.stdout.write(chalk.green(`Created requirement: ${JSON.stringify(created)}\n`));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const st = (e as {status?:number}).status;
        errorOut(`Failed to create requirement${st?` (${st})`:""}: ${msg}`);
        process.exit(1);
      }
    });
}
