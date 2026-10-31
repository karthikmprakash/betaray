import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export type ConfigFormat = "json" | "table";
export interface BetarayConfig {
  url?: string;
  token?: string;
  project?: string;
  format?: ConfigFormat;
}

const VALID_KEYS = new Set(["url", "token", "project", "format"]);

export function isValidKey(key: string): boolean {
  return VALID_KEYS.has(key);
}
export function validKeys(): string[] {
  return [...VALID_KEYS];
}

export function configFilePath(): string {
  if (process.env.BETARAY_CONFIG) return process.env.BETARAY_CONFIG;
  if (process.env.XDG_CONFIG_HOME) return path.join(process.env.XDG_CONFIG_HOME, "betaray", "config.json");
  return path.join(os.homedir(), ".betaray", "config.json");
}

export function loadConfig(): BetarayConfig {
  const p = configFilePath();
  try {
    if (!fs.existsSync(p)) return {};
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw) as BetarayConfig;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function saveConfig(cfg: BetarayConfig): void {
  const p = configFilePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
  // ensure restrictive perms even if file existed
  try { fs.chmodSync(p, 0o600); } catch {}
}

export function getEffective(key: keyof BetarayConfig, opts: { url?: string; token?: string; project?: string; json?: boolean }): string | undefined {
  // CLI flag > env var > config file
  if (key === "url") {
    if (opts.url) return opts.url;
    if (process.env.BETARAY_URL) return process.env.BETARAY_URL;
  }
  if (key === "token") {
    if (opts.token) return opts.token;
    if (process.env.BETARAY_TOKEN) return process.env.BETARAY_TOKEN;
  }
  if (key === "project") {
    if (opts.project) return opts.project;
    if (process.env.BETARAY_PROJECT) return process.env.BETARAY_PROJECT;
  }
  if (key === "format" && opts.json) return "json";
  const cfg = loadConfig();
  if (key === "format" && process.env.BETARAY_FORMAT) {
    const v = process.env.BETARAY_FORMAT;
    if (v === "json" || v === "table") return v;
  }
  return cfg[key] as string | undefined;
}

export function resolveBaseUrl(opts: { url?: string }): string | undefined {
  return getEffective("url", opts);
}
export function resolveToken(opts: { token?: string }): string | undefined {
  return getEffective("token", opts as never);
}
export function resolveProject(opts: { project?: string }): string | undefined {
  return getEffective("project", opts as never);
}
export function resolveFormat(opts: { json?: boolean }): ConfigFormat {
  const f = getEffective("format", opts as never);
  return f === "json" ? "json" : "table";
}
