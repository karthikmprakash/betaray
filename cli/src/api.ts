export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  token?: string;
  verbose?: boolean;
}

export class ApiClient {
  baseUrl: string;
  token?: string;
  verbose: boolean;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = normalizeBaseUrl(opts.baseUrl);
    this.token = opts.token;
    this.verbose = !!opts.verbose;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }

  private url(path: string): string {
    if (path.startsWith("http")) return path;
    return this.baseUrl.replace(/\/$/, "") + (path.startsWith("/") ? path : "/" + path);
  }

  async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const url = this.url(path);
    if (this.verbose) process.stderr.write(`[api] ${method} ${url}\n`);
    const res = await fetch(url, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: unknown;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!res.ok) {
      const msg = extractErrorMessage(data, text, res.status);
      throw new ApiError(res.status, msg, data);
    }
    return data as T;
  }

  get<T = unknown>(path: string): Promise<T> { return this.request<T>("GET", path); }
  post<T = unknown>(path: string, body?: unknown): Promise<T> { return this.request<T>("POST", path, body); }
}

export function normalizeBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  // allow bare host like "http://localhost:3000" or "https://example.com"
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  return url;
}

function extractErrorMessage(data: unknown, raw: string, status: number): string {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.detail === "string") return obj.detail;
  }
  if (typeof data === "string" && data.trim()) return data.trim().slice(0, 500);
  if (raw.trim()) return raw.trim().slice(0, 500);
  return `Request failed with status ${status}`;
}

export function requireBaseUrl(url: string | undefined): string {
  if (!url) throw new Error("No URL configured. Set via --url, BETARAY_URL env, or: betaray config set url <url>");
  return url;
}
export function requireProject(project: string | undefined): string {
  if (!project) throw new Error("No project set. Pass --project <id>, set BETARAY_PROJECT, or: betaray config set project <id>");
  return project;
}
