import { Command } from "commander";
import * as fs from "node:fs";
import chalk from "chalk";
import { ApiClient } from "../api.js";
import { resolveBaseUrl, resolveToken, resolveProject, resolveFormat } from "../config.js";
import { jsonOut, tableOut, errorOut } from "../output.js";
import { readInputFile } from "../input.js";

export function registerExecutionCommands(program: Command): void {
  const exec = program.command("execution").description("Manage test executions");
  exec.alias("exec");

  exec.command("list")
    .description("List executions in a project")
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
        // executions are part of platform state
        const data = await api.get(`/api/platform?projectId=${encodeURIComponent(project)}`) as { executions?: Array<{ key: string; name: string; status: string; environment: string; createdAt: string }> };
        const executions = data.executions ?? [];
        const limit = Math.max(1, Math.min(500, parseInt(opts.limit ?? "50", 10) || 50));
        const sliced = executions.slice(0, limit);
        const useJson = !!(c.json as boolean) || resolveFormat(c as never) === "json";
        if (useJson) { jsonOut(sliced); return; }
        if (sliced.length === 0) { process.stdout.write(chalk.dim("No executions found.\n")); return; }
        tableOut(["Key", "Name", "Status", "Env"], sliced.map((e) => [e.key, (e.name ?? "").slice(0, 50), e.status ?? "", e.environment ?? ""]));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errorOut(`Failed to list executions: ${msg}`);
        process.exit(1);
      }
    });

  exec.command("create")
    .description("Create a test execution")
    .requiredOption("--name <name>", "Execution name")
    .requiredOption("--tests <keys>", "Comma-separated test keys (e.g. PROJ-1,PROJ-2)")
    .requiredOption("--env <name>", "Environment name")
    .option("--version <name>", "Release version name")
    .option("--project <id>", "Project ID")
    .option("--json", "Output as JSON")
    .action(async function (opts: { name: string; tests: string; env: string; version?: string; project?: string; json?: boolean }) {
      const g = program.opts() as { url?: string; token?: string; project?: string; verbose?: boolean };
      const c = { ...g, ...opts };
      const baseUrl = resolveBaseUrl(c as never);
      if (!baseUrl) { errorOut("No URL configured."); process.exit(1); }
      const token = resolveToken(c as never);
      const project = resolveProject(c as never);
      if (!project) { errorOut("No project set."); process.exit(1); }
      const testKeys = opts.tests.split(",").map((s) => s.trim()).filter(Boolean);
      if (testKeys.length === 0) { errorOut("No test keys provided."); process.exit(1); }

      const api = new ApiClient({ baseUrl, token, verbose: g.verbose });
      try {
        // Need to resolve test keys to IDs via GET /api/tests
        const testsData = await api.get(`/api/tests?projectId=${encodeURIComponent(project)}`) as { tests: Array<{ id: string; key: string }> };
        const keyToId = new Map(testsData.tests.map((t) => [t.key, t.id]));
        const testIds: string[] = [];
        for (const k of testKeys) {
          const id = keyToId.get(k);
          if (!id) { errorOut(`Test ${k} not found in project ${project}`); process.exit(1); }
          testIds.push(id);
        }
        const body = { action: "execution.create", projectId: project, input: { name: opts.name, testIds, env: opts.env, version: opts.version } };
        const result = await api.post("/api/platform", body) as Record<string, unknown>;
        // API returns {result: ...}
        const created = (result as { result?: unknown }).result ?? result;
        const useJson = !!(c.json as boolean) || resolveFormat(c as never) === "json";
        if (useJson) jsonOut(created);
        else process.stdout.write(chalk.green(`Created execution: ${JSON.stringify(created)}\n`));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const st = (e as {status?:number}).status;
        errorOut(`Failed to create execution${st?` (${st})`:""}: ${msg}`);
        process.exit(1);
      }
    });

  exec.command("import")
    .description("Import execution results (update test run statuses)")
    .requiredOption("--execution <key>", "Execution key (e.g. PROJ-5)")
    .requiredOption("--file <path>", "JSON file with results array [{testKey,status,comment}] or - for stdin")
    .option("--project <id>", "Project ID")
    .option("--json", "Output as JSON")
    .action(async function (opts: { execution: string; file: string; project?: string; json?: boolean }) {
      const g = program.opts() as { url?: string; token?: string; project?: string; verbose?: boolean };
      const c = { ...g, ...opts };
      const baseUrl = resolveBaseUrl(c as never);
      if (!baseUrl) { errorOut("No URL configured."); process.exit(1); }
      const token = resolveToken(c as never);
      const project = resolveProject(c as never);
      if (!project) { errorOut("No project set."); process.exit(1); }

      let raw: string;
      if (opts.file === "-") {
        raw = await readInputFile("-", false) ?? "";
      } else {
        try { raw = fs.readFileSync(opts.file, "utf8"); } catch (e) { errorOut(`Cannot read file ${opts.file}: ${(e as Error).message}`); process.exit(1); }
      }
      let tests: Array<{ testKey: string; status: string; comment?: string }>;
      try {
        const parsed = JSON.parse(raw);
        tests = Array.isArray(parsed) ? parsed : parsed.tests ?? parsed.results ?? [];
        if (!Array.isArray(tests)) throw new Error("Expected a JSON array");
      } catch (e) { errorOut(`Invalid JSON in ${opts.file}: ${(e as Error).message}`); process.exit(1); }

      const api = new ApiClient({ baseUrl, token, verbose: g.verbose });
      try {
        const body = { projectId: project, testExecutionKey: opts.execution, tests };
        const result = await api.post("/api/v2/import/execution", body) as unknown;
        const useJson = !!(c.json as boolean) || resolveFormat(c as never) === "json";
        if (useJson) jsonOut(result);
        else process.stdout.write(chalk.green(`Imported ${tests.length} result(s) into ${opts.execution}\n`));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const st = (e as {status?:number}).status;
        errorOut(`Import failed${st?` (${st})`:""}: ${msg}`);
        process.exit(1);
      }
    });
}
