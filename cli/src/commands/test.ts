import { Command } from "commander";
import * as fs from "node:fs";
import chalk from "chalk";
import { ApiClient, requireBaseUrl, requireProject } from "../api.js";
import { resolveBaseUrl, resolveToken, resolveProject, resolveFormat, loadConfig } from "../config.js";
import { jsonOut, tableOut, errorOut } from "../output.js";
import { readInputFile } from "../input.js";

function ctx(program: Command, localOpts: Record<string, unknown>) {
  const g = program.opts() as { url?: string; token?: string; project?: string; verbose?: boolean; json?: boolean };
  return { ...g, ...localOpts };
}

export function registerTestCommands(program: Command): void {
  const test = program.command("test").description("Manage tests");
  // workarounds for commander nesting: use program.opts() for globals

  test.command("list")
    .description("List tests in a project")
    .option("--project <id>", "Project ID (or uses saved default)")
    .option("--limit <n>", "Max tests to show (default 50)", "50")
    .option("--json", "Output as JSON")
    .action(async function (opts: { project?: string; limit?: string; json?: boolean }) {
      const g = program.opts() as { url?: string; token?: string; project?: string; verbose?: boolean; json?: boolean };
      const c = { ...g, ...opts };
      const baseUrl = resolveBaseUrl(c);
      if (!baseUrl) { errorOut("No URL configured. Use --url or betaray config set url <url>"); process.exit(1); }
      const token = resolveToken(c as never);
      const project = resolveProject(c as never);
      if (!project) { errorOut("No project set. Use --project <id> or betaray config set project <id>"); process.exit(1); }
      const limit = Math.max(1, Math.min(500, parseInt(opts.limit ?? "50", 10) || 50));
      const api = new ApiClient({ baseUrl, token, verbose: g.verbose });
      try {
        const data = await api.get(`/api/tests?projectId=${encodeURIComponent(project)}`) as { count: number; tests: Array<{ key: string; summary: string; type: string; priority: string; status: string; folder?: string; folderId?: string; id: string }> };
        const tests = data.tests ?? [];
        const sliced = tests.slice(0, limit);
        const useJson = c.json || resolveFormat(c as never) === "json";
        if (useJson) { jsonOut({ count: data.count, tests: sliced }); return; }
        if (sliced.length === 0) { process.stdout.write(chalk.dim("No tests found.\n")); return; }
        tableOut(
          ["Key", "Summary", "Type", "Priority", "Status"],
          sliced.map((t) => [t.key, (t.summary ?? "").slice(0, 60), t.type ?? "", t.priority ?? "", t.status ?? ""])
        );
        if (tests.length > limit) process.stdout.write(chalk.dim(`\nShowing ${limit} of ${tests.length} tests. Use --limit to see more.\n`));
        else process.stdout.write(chalk.dim(`\n${tests.length} test(s)\n`));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const st = (e as {status?:number}).status;
        errorOut(`Failed to list tests${st?` (${st})`:""}: ${msg}`);
        process.exit(1);
      }
    });

  test.command("get")
    .description("Get a single test by key")
    .argument("<testKey>", "Test key (e.g. PROJ-123)")
    .option("--project <id>", "Project ID")
    .option("--json", "Output as JSON (default)")
    .action(async function (testKey: string, opts: { project?: string; json?: boolean }) {
      const g = program.opts() as { url?: string; token?: string; project?: string; verbose?: boolean; json?: boolean };
      const c = { ...g, ...opts };
      const baseUrl = resolveBaseUrl(c);
      if (!baseUrl) { errorOut("No URL configured."); process.exit(1); }
      const token = resolveToken(c as never);
      const project = resolveProject(c as never);
      if (!project) { errorOut("No project set. Use --project <id>"); process.exit(1); }
      const api = new ApiClient({ baseUrl, token, verbose: g.verbose });
      try {
        const data = await api.get(`/api/tests?projectId=${encodeURIComponent(project)}`) as { tests: Array<Record<string, unknown> & { key: string }> };
        const found = (data.tests ?? []).find((t) => t.key === testKey);
        if (!found) { errorOut(`Test ${testKey} not found in project ${project}`); process.exit(1); }
        jsonOut(found);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if ((e as {status?:number}).status === 404) { errorOut(`Test ${testKey} not found.`); process.exit(1); }
        errorOut(`Failed to get test: ${msg}`);
        process.exit(1);
      }
    });

  test.command("create")
    .description("Create a new test")
    .requiredOption("--summary <text>", "Test summary / title")
    .option("--description <text>", "Detailed description")
    .option("--type <type>", "Test type: Manual, Cucumber, Generic (default Manual)")
    .option("--priority <p>", "Priority: Highest, High, Medium, Low (default Medium)")
    .option("--status <s>", "Status: TODO, READY, REVIEW (default TODO)")
    .option("--folder <name>", "Folder name (default General)")
    .option("--labels <list>", "Comma-separated labels")
    .option("--gherkin <text>", "Gherkin content (for Cucumber type)")
    .option("--precondition <text>", "Precondition")
    .option("--project <id>", "Project ID")
    .option("--file <path>", "JSON file with test payload (or - for stdin)")
    .option("--stdin", "Read JSON payload from stdin")
    .option("--json", "Output result as JSON")
    .action(async function (opts: Record<string, string | boolean | undefined>) {
      const g = program.opts() as { url?: string; token?: string; project?: string; verbose?: boolean; json?: boolean };
      const c = { ...g, ...opts };
      const baseUrl = resolveBaseUrl(c as never);
      if (!baseUrl) { errorOut("No URL configured."); process.exit(1); }
      const token = resolveToken(c as never);
      const project = resolveProject(c as never);
      if (!project) { errorOut("No project set. Use --project <id>"); process.exit(1); }

      let payload: Record<string, unknown> = {};
      // file/stdin overrides flags
      const fileInput = await readInputFile(opts.file as string | undefined, !!opts.stdin);
      if (fileInput) {
        try { payload = JSON.parse(fileInput); } catch (e) { errorOut(`Invalid JSON input: ${(e as Error).message}`); process.exit(1); }
        // ensure projectId and summary present
        if (!payload.summary && opts.summary) payload.summary = opts.summary;
      } else {
        payload.summary = opts.summary;
        if (opts.description) payload.description = opts.description;
        if (opts.type) payload.type = opts.type;
        if (opts.priority) payload.priority = opts.priority;
        if (opts.status) payload.status = opts.status;
        if (opts.folder) payload.folder = opts.folder;
        if (opts.labels) payload.labels = String(opts.labels).split(",").map((s) => s.trim()).filter(Boolean);
        if (opts.gherkin) payload.gherkin = opts.gherkin;
        if (opts.precondition) payload.precondition = opts.precondition;
        // allow steps via JSON file only; otherwise empty
        if ((payload as {steps?:unknown[]}).steps === undefined) payload.steps = [];
      }
      payload.projectId = project;

      const api = new ApiClient({ baseUrl, token, verbose: g.verbose });
      try {
        const result = await api.post("/api/tests", payload) as Record<string, unknown>;
        const useJson = !!(c.json as boolean) || resolveFormat(c as never) === "json";
        if (useJson) jsonOut(result);
        else {
          const id = (result as { id?: string }).id ?? (result as { key?: string }).key ?? JSON.stringify(result);
          process.stdout.write(chalk.green(`Created test: ${id}\n`));
          if (Object.keys(result).length > 1) jsonOut(result);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const st = (e as {status?:number}).status;
        errorOut(`Failed to create test${st?` (${st})`:""}: ${msg}`);
        process.exit(1);
      }
    });
}
