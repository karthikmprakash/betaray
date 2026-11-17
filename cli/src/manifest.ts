import * as fs from "node:fs";
import * as path from "node:path";
import { configFilePath } from "./config.js";
import { normalizeBaseUrl } from "./api.js";

export interface JsonSchema {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  default?: unknown;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  [key: string]: unknown;
}
export interface OperationDescriptor {
  name: string;
  summary: string;
  scope: "user" | "organization" | "project";
  access: "read" | "write" | "admin";
  interactiveOnly: boolean;
  inputSchema: JsonSchema;
}
interface Manifest {
  url: string;
  fetchedAt: number;
  version: string;
  operations: OperationDescriptor[];
}

const TTL_MS = 5 * 60_000;
const cachePath = () => path.join(path.dirname(configFilePath()), "manifest.json");

function readCache(url: string): Manifest | null {
  try {
    const cached = JSON.parse(fs.readFileSync(cachePath(), "utf8")) as Manifest;
    return cached.url === url && Array.isArray(cached.operations) ? cached : null;
  } catch {
    return null;
  }
}

/**
 * The server describes every operation it supports; the CLI turns that into
 * commands. A short-lived cache keeps `--help` fast, and a stale copy is used
 * when the server cannot be reached.
 */
export async function loadManifest(rawUrl: string, refresh = false): Promise<OperationDescriptor[]> {
  const url = normalizeBaseUrl(rawUrl);
  const cached = readCache(url);
  if (cached && !refresh && Date.now() - cached.fetchedAt < TTL_MS) return cached.operations;
  try {
    const response = await fetch(url + "/api/operations", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = (await response.json()) as { version: string; operations: OperationDescriptor[] };
    const manifest: Manifest = { url, fetchedAt: Date.now(), version: body.version, operations: body.operations };
    try {
      fs.mkdirSync(path.dirname(cachePath()), { recursive: true });
      fs.writeFileSync(cachePath(), JSON.stringify(manifest));
    } catch {
      // A read-only config directory only costs us the cache.
    }
    return manifest.operations;
  } catch (error) {
    if (cached) {
      process.stderr.write(`Warning: using cached command list; ${url} did not answer (${(error as Error).message}).\n`);
      return cached.operations;
    }
    throw new Error(`Could not load the command list from ${url}/api/operations: ${(error as Error).message}`);
  }
}
