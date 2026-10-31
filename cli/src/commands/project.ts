import { Command } from "commander";
import chalk from "chalk";
import { ApiClient, requireBaseUrl } from "../api.js";
import { resolveBaseUrl, resolveToken, resolveFormat } from "../config.js";
import { jsonOut, tableOut, errorOut } from "../output.js";

export function registerProjectCommands(program: Command): void {
  const proj = program.command("project").description("Manage projects");

  proj.command("list")
    .description("List accessible projects")
    .option("--json", "Output as JSON")
    .action(async function (this: Command, opts: { json?: boolean }) {
      const globalOpts = (this as unknown as { parent: Command }).parent?.parent?.opts() ?? program.opts();
      // commander nesting: project -> list, so global is 2 levels up. Fallback to program.opts()
      const g = program.opts() as { url?: string; token?: string; verbose?: boolean };
      const merged = { ...g, ...opts };
      const baseUrl = resolveBaseUrl(merged);
      if (!baseUrl) { errorOut("No URL configured. Set via --url or betaray config set url <url>"); process.exit(1); }
      const token = resolveToken(merged as never);
      const api = new ApiClient({ baseUrl, token, verbose: g.verbose });

      try {
        const data = await api.get("/api/platform") as {
          organizations?: Array<{ name: string; workspaces: Array<{ name: string; projects: Array<{ id: string; key: string; name: string; description?: string }> }> }>;
          projects?: unknown[];
        };
        // platform returns {organizations, ...} with projects nested
        const projects: Array<{ id: string; key: string; name: string; workspace?: string; org?: string; description?: string }> = [];
        if (data.organizations) {
          for (const org of data.organizations) {
            for (const ws of org.workspaces ?? []) {
              for (const p of ws.projects ?? []) {
                projects.push({ id: p.id, key: p.key, name: p.name, workspace: ws.name, org: org.name, description: (p as {description?:string}).description });
              }
            }
          }
        } else if (Array.isArray((data as Record<string,unknown>).projects)) {
          // fallback shape
          for (const p of (data as {projects:Array<{id:string;key:string;name:string}>}).projects) projects.push(p);
        } else if (Array.isArray(data)) {
          for (const p of data as Array<{id:string;key:string;name:string}>) projects.push(p);
        }

        const useJson = merged.json || resolveFormat(merged as never) === "json";
        if (useJson) { jsonOut(projects); return; }
        if (projects.length === 0) { process.stdout.write(chalk.dim("No projects found.\n")); return; }
        tableOut(
          ["Key", "ID", "Name", "Workspace"],
          projects.map((p) => [p.key, p.id.slice(0, 8) + "…", p.name, p.workspace ?? ""])
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const status = (e as {status?:number}).status;
        errorOut(`Failed to list projects${status ? ` (${status})` : ""}: ${msg}`);
        process.exit(1);
      }
    });
}
