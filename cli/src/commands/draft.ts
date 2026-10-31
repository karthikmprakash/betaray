import { Command } from "commander";
import chalk from "chalk";
import { ApiClient } from "../api.js";
import { resolveBaseUrl, resolveToken, resolveProject, resolveFormat } from "../config.js";
import { jsonOut, tableOut, errorOut } from "../output.js";

export function registerDraftCommands(program: Command): void {
  const draft = program.command("draft").description("Manage AI-generated test drafts");

  draft.command("list")
    .description("List drafts in a project")
    .option("--project <id>", "Project ID")
    .option("--json", "Output as JSON")
    .action(async function (opts: { project?: string; json?: boolean }) {
      const g = program.opts() as { url?: string; token?: string; project?: string; verbose?: boolean };
      const c = { ...g, ...opts };
      const baseUrl = resolveBaseUrl(c as never);
      if (!baseUrl) { errorOut("No URL configured."); process.exit(1); }
      const token = resolveToken(c as never);
      const project = resolveProject(c as never);
      if (!project) { errorOut("No project set."); process.exit(1); }
      const api = new ApiClient({ baseUrl, token, verbose: g.verbose });
      try {
        const data = await api.get(`/api/platform?projectId=${encodeURIComponent(project)}`) as { drafts?: Array<{ id: string; source: string; type: string; mode: string; createdAt: string; approvedTestId?: string }> };
        const drafts = data.drafts ?? [];
        const useJson = !!(c.json as boolean) || resolveFormat(c as never) === "json";
        if (useJson) { jsonOut(drafts); return; }
        if (drafts.length === 0) { process.stdout.write(chalk.dim("No drafts found.\n")); return; }
        tableOut(["ID", "Type", "Mode", "Approved"], drafts.map((d) => [d.id.slice(0,8)+"…", d.type, d.mode, d.approvedTestId ? chalk.green("yes") : chalk.dim("no")]));
      } catch (e) {
        errorOut(`Failed to list drafts: ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  draft.command("generate")
    .description("Generate a new draft from requirements text")
    .requiredOption("--source <text>", "Requirements text (min 20 chars)")
    .option("--type <type>", "Test type: Manual, Cucumber, Generic (default Manual)")
    .option("--mode <mode>", "Generation mode: template, openai (default template)")
    .option("--requirement <key>", "Link to requirement key")
    .option("--project <id>", "Project ID")
    .option("--json", "Output as JSON")
    .action(async function (opts: { source: string; type?: string; mode?: string; requirement?: string; project?: string; json?: boolean }) {
      const g = program.opts() as { url?: string; token?: string; project?: string; verbose?: boolean };
      const c = { ...g, ...opts };
      const baseUrl = resolveBaseUrl(c as never);
      if (!baseUrl) { errorOut("No URL configured."); process.exit(1); }
      const token = resolveToken(c as never);
      const project = resolveProject(c as never);
      if (!project) { errorOut("No project set."); process.exit(1); }
      const api = new ApiClient({ baseUrl, token, verbose: g.verbose });
      try {
        const body = { action: "draft.generate", projectId: project, input: { source: opts.source, type: opts.type ?? "Manual", mode: opts.mode ?? "template", requirementKey: opts.requirement } };
        const result = await api.post("/api/platform", body) as unknown;
        const created = (result as { result?: unknown }).result ?? result;
        const useJson = !!(c.json as boolean) || resolveFormat(c as never) === "json";
        if (useJson) jsonOut(created);
        else process.stdout.write(chalk.green(`Generated draft: ${JSON.stringify(created)}\n`));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const st = (e as {status?:number}).status;
        errorOut(`Failed to generate draft${st?` (${st})`:""}: ${msg}`);
        process.exit(1);
      }
    });

  draft.command("approve")
    .description("Approve a draft — creates a test from it")
    .requiredOption("--id <id>", "Draft ID")
    .requiredOption("--payload <json>", "Approved payload JSON: {summary, steps, gherkin}")
    .option("--project <id>", "Project ID")
    .option("--json", "Output as JSON")
    .action(async function (opts: { id: string; payload: string; project?: string; json?: boolean }) {
      const g = program.opts() as { url?: string; token?: string; project?: string; verbose?: boolean };
      const c = { ...g, ...opts };
      const baseUrl = resolveBaseUrl(c as never);
      if (!baseUrl) { errorOut("No URL configured."); process.exit(1); }
      const token = resolveToken(c as never);
      const project = resolveProject(c as never);
      if (!project) { errorOut("No project set."); process.exit(1); }
      let payload: unknown;
      try { payload = JSON.parse(opts.payload); } catch (e) { errorOut(`Invalid payload JSON: ${(e as Error).message}`); process.exit(1); }
      const api = new ApiClient({ baseUrl, token, verbose: g.verbose });
      try {
        const body = { action: "draft.approve", projectId: project, input: { id: opts.id, payload, reviewed: true } };
        const result = await api.post("/api/platform", body) as unknown;
        const created = (result as { result?: unknown }).result ?? result;
        const useJson = !!(c.json as boolean) || resolveFormat(c as never) === "json";
        if (useJson) jsonOut(created);
        else process.stdout.write(chalk.green(`Approved draft ${opts.id}: ${JSON.stringify(created)}\n`));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const st = (e as {status?:number}).status;
        errorOut(`Failed to approve draft${st?` (${st})`:""}: ${msg}`);
        process.exit(1);
      }
    });
}
