import { Command } from "commander";
import * as fs from "node:fs";
import chalk from "chalk";
import { ApiClient } from "../api.js";
import { resolveBaseUrl, resolveToken, resolveProject, resolveFormat } from "../config.js";
import { jsonOut, errorOut } from "../output.js";
import { readInputFile } from "../input.js";

export function registerImportCommand(program: Command): void {
  program.command("import")
    .description("Bulk import tests from an export file (test.import action)")
    .requiredOption("--file <path>", "JSON file with {tests:[...]} or - for stdin")
    .option("--project <id>", "Project ID")
    .option("--json", "Output as JSON")
    .action(async function (opts: { file: string; project?: string; json?: boolean }) {
      const g = program.opts() as { url?: string; token?: string; project?: string; verbose?: boolean };
      const c = { ...g, ...opts };
      const baseUrl = resolveBaseUrl(c as never);
      if (!baseUrl) { errorOut("No URL configured."); process.exit(1); }
      const token = resolveToken(c as never);
      const project = resolveProject(c as never);
      if (!project) { errorOut("No project set."); process.exit(1); }

      let raw: string;
      if (opts.file === "-") {
        raw = (await readInputFile("-", false)) ?? "";
      } else {
        try { raw = fs.readFileSync(opts.file, "utf8"); } catch (e) { errorOut(`Cannot read file: ${(e as Error).message}`); process.exit(1); }
      }
      let data: unknown;
      try { data = JSON.parse(raw); } catch (e) { errorOut(`Invalid JSON: ${(e as Error).message}`); process.exit(1); }

      // normalize: allow {tests:[...]} or bare array
      let tests: unknown[];
      if (Array.isArray(data)) tests = data;
      else if (data && typeof data === "object" && Array.isArray((data as {tests?:unknown[]}).tests)) tests = (data as {tests:unknown[]}).tests;
      else { errorOut("Import file must contain {tests:[...]} or a JSON array of tests"); process.exit(1); }

      const api = new ApiClient({ baseUrl, token, verbose: g.verbose });
      try {
        const body = { action: "test.import", projectId: project, input: { tests } };
        const result = await api.post("/api/platform", body) as unknown;
        const created = (result as { result?: unknown }).result ?? result;
        const useJson = !!(c.json as boolean) || resolveFormat(c as never) === "json";
        if (useJson) jsonOut(created);
        else {
          const ids = (created as { ids?: string[] }).ids;
          process.stdout.write(chalk.green(`Imported ${ids?.length ?? tests.length} test(s)\n`));
          if (created) jsonOut(created);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const st = (e as {status?:number}).status;
        errorOut(`Import failed${st?` (${st})`:""}: ${msg}`);
        process.exit(1);
      }
    });
}
