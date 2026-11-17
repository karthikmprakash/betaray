import { Command, Option } from "commander";
import * as fs from "node:fs";
import { ApiClient, ApiError } from "../api.js";
import { resolveBaseUrl, resolveProject, resolveToken } from "../config.js";
import { readStdin } from "../input.js";
import type { JsonSchema, OperationDescriptor } from "../manifest.js";
import { tableOut } from "../output.js";

export interface GlobalOptions {
  url?: string;
  token?: string;
  project?: string;
  organization?: string;
  json?: boolean;
  verbose?: boolean;
}

// Flags the program itself owns; an operation field with the same name is prefixed.
const RESERVED = new Set(["url", "token", "project", "organization", "json", "verbose", "input", "help"]);
const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
const camel = (flag: string) => flag.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
const flagFor = (field: string) => (RESERVED.has(field) ? `field-${kebab(field)}` : kebab(field));

type Kind = "boolean" | "string" | "number" | "list" | "json";
function kindOf(schema: JsonSchema): Kind {
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "string" || (schema.enum && schema.enum.every((value) => typeof value === "string"))) return "string";
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (schema.type === "array" && ["string", "number", "integer"].includes(String(schema.items?.type))) return "list";
  return "json";
}

/** `@path` reads a file, so long text and JSON never need shell escaping. */
const fromFile = (value: string) => (value.startsWith("@") ? fs.readFileSync(value.slice(1), "utf8") : value);

function parseValue(kind: Kind, field: string, raw: unknown, items?: JsonSchema): unknown {
  if (kind === "boolean") return raw;
  const text = fromFile(String(raw));
  if (kind === "string") return text;
  if (kind === "number") {
    const value = Number(text);
    if (Number.isNaN(value)) throw new Error(`--${flagFor(field)} expects a number.`);
    return value;
  }
  if (kind === "list" && !text.trim().startsWith("[")) {
    const values = text.split(",").map((value) => value.trim()).filter(Boolean);
    return items?.type === "string" ? values : values.map(Number);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`--${flagFor(field)} expects JSON: ${(error as Error).message}`);
  }
}

function describe(schema: JsonSchema, required: boolean) {
  const parts = [schema.description, schema.enum ? `One of: ${schema.enum.join(", ")}.` : "", required ? "(required)" : ""];
  if (schema.default !== undefined && typeof schema.default !== "object") parts.push(`(default: ${schema.default})`);
  return parts.filter(Boolean).join(" ");
}

export function client(globals: GlobalOptions) {
  const baseUrl = resolveBaseUrl(globals);
  if (!baseUrl) throw new Error("No URL configured. Run: betaray login --url <url> --token <token>");
  return new ApiClient({ baseUrl, token: resolveToken(globals), verbose: globals.verbose });
}

/** Invoke one operation. Every generated command and `betaray call` end up here. */
export async function invoke(globals: GlobalOptions, operation: string, input: unknown) {
  const { result } = await client(globals).post<{ result: unknown }>("/api/operations", {
    operation,
    // A token already names its project; send one only when it was chosen explicitly.
    projectId: resolveProject(globals),
    organizationId: globals.organization,
    input,
  });
  return result;
}

function print(globals: GlobalOptions, result: unknown) {
  const rows = Array.isArray(result) ? result : (result as { items?: unknown[] } | null)?.items;
  if (globals.json || !process.stdout.isTTY || !Array.isArray(rows) || !rows.length) {
    process.stdout.write(JSON.stringify(result, null, globals.json ? 0 : 2) + "\n");
    return;
  }
  // Interactive terminals get a table of the scalar columns; pipes and agents get JSON.
  const columns = Object.keys(rows[0] as object)
    .filter((column) => rows.some((row) => ["string", "number", "boolean"].includes(typeof (row as Record<string, unknown>)[column])))
    .filter((column) => column !== "id")
    .slice(0, 7);
  tableOut(columns, rows.map((row) => columns.map((column) => String((row as Record<string, unknown>)[column] ?? "").slice(0, 60))));
  const total = (result as { total?: number }).total;
  if (typeof total === "number" && total > rows.length) process.stdout.write(`\n${rows.length} of ${total}. Use --limit and --offset for more, or --json for everything returned.\n`);
}

export function fail(globals: GlobalOptions, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  const status = error instanceof ApiError ? error.status : undefined;
  process.stderr.write(globals.json ? JSON.stringify({ error: message, status }) + "\n" : `Error${status ? ` (${status})` : ""}: ${message}\n`);
  process.exit(1);
}

async function baseInput(raw: string | undefined): Promise<Record<string, unknown>> {
  if (!raw) return {};
  const text = raw === "-" ? await readStdin() : fromFile(raw);
  const parsed = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("--input must be a JSON object.");
  return parsed;
}

/** Turn the server's operation manifest into `betaray <group> <verb> [--field value]` commands. */
export function registerOperationCommands(program: Command, operations: OperationDescriptor[]) {
  const groups = new Map<string, Command>();
  for (const operation of operations) {
    // Interactive-only operations need a browser session, not an API token.
    if (operation.interactiveOnly) continue;
    const [groupName, verb] = operation.name.split(".");
    let group = groups.get(groupName);
    if (!group) {
      group = program.command(groupName).description(`${groupName} operations`);
      groups.set(groupName, group);
    }
    const properties = operation.inputSchema.properties ?? {};
    const required = new Set(operation.inputSchema.required ?? []);
    const command = group
      .command(kebab(verb))
      .description(operation.summary + (operation.interactiveOnly ? " (needs a signed-in session; API tokens are refused)" : ""))
      .option("--input <json>", "Whole input as JSON, @file, or - for stdin. Flags override its fields.");
    const fields = new Map<string, { field: string; kind: Kind; items?: JsonSchema }>();
    for (const [field, schema] of Object.entries(properties)) {
      const kind = kindOf(schema);
      const flag = flagFor(field);
      fields.set(camel(flag), { field, kind, items: schema.items });
      const help = describe(schema, required.has(field));
      if (kind === "boolean") {
        command.addOption(new Option(`--${flag}`, help));
        command.addOption(new Option(`--no-${flag}`).hideHelp());
      } else {
        const placeholder = kind === "list" ? "a,b,c" : kind === "json" ? "json" : kind === "number" ? "n" : "value";
        command.addOption(new Option(`--${flag} <${placeholder}>`, help));
      }
    }
    command.action(async (options: Record<string, unknown>) => {
      const globals = program.opts<GlobalOptions>();
      try {
        const input = await baseInput(options.input as string | undefined);
        for (const [option, value] of Object.entries(options)) {
          const target = fields.get(option);
          if (target && value !== undefined) input[target.field] = parseValue(target.kind, target.field, value, target.items);
        }
        print(globals, await invoke(globals, operation.name, input));
      } catch (error) {
        fail(globals, error);
      }
    });
  }
}

export function registerOperationTools(program: Command, operations: OperationDescriptor[]) {
  program
    .command("ops")
    .description("List every operation the server supports (use --json for full input schemas)")
    .action(() => {
      const globals = program.opts<GlobalOptions>();
      if (globals.json) process.stdout.write(JSON.stringify(operations) + "\n");
      else
        tableOut(
          ["Command", "Access", "Summary"],
          operations.map((operation) => [
            `betaray ${operation.name.replace(".", " ")}`,
            operation.interactiveOnly ? "session" : operation.access,
            operation.summary.slice(0, 90),
          ]),
        );
    });
  program
    .command("call")
    .description("Invoke an operation by name with a raw JSON input, e.g. betaray call test.get '{\"key\":\"MAIN-401\"}'")
    .argument("<operation>", "Operation name, e.g. test.create")
    .argument("[input]", "JSON input, @file, or - for stdin", "{}")
    .action(async (operation: string, input: string) => {
      const globals = program.opts<GlobalOptions>();
      try {
        print(globals, await invoke(globals, operation, await baseInput(input)));
      } catch (error) {
        fail(globals, error);
      }
    });
}
