import { Command } from "commander";
import * as readline from "node:readline";
import { normalizeBaseUrl } from "../api.js";
import { resolveBaseUrl, resolveToken } from "../config.js";
import type { GlobalOptions } from "./operations.js";

/**
 * `betaray mcp`: a stdio MCP server for clients that launch a local process.
 * It holds no tool definitions; it relays each JSON-RPC message to the
 * server's `/api/mcp` endpoint, so new operations appear without a CLI update.
 */
export function registerMcpCommand(program: Command) {
  program
    .command("mcp")
    .description("Run a stdio MCP server that exposes every Betaray operation as a tool")
    .action(async () => {
      const globals = program.opts<GlobalOptions>();
      const baseUrl = resolveBaseUrl(globals);
      const token = resolveToken(globals);
      if (!baseUrl || !token) {
        process.stderr.write("betaray mcp needs a URL and API token: set BETARAY_URL and BETARAY_TOKEN, or run betaray login.\n");
        process.exit(1);
      }
      const endpoint = normalizeBaseUrl(baseUrl) + "/api/mcp";
      const send = (message: unknown) => process.stdout.write(JSON.stringify(message) + "\n");
      // stdout carries protocol messages only; process them in order.
      let queue = Promise.resolve();
      const lines = readline.createInterface({ input: process.stdin });
      lines.on("line", (line) => {
        if (!line.trim()) return;
        queue = queue.then(async () => {
          let id: unknown = null;
          try {
            id = (JSON.parse(line) as { id?: unknown }).id ?? null;
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
              body: line,
            });
            if (response.status === 202) return;
            const body = (await response.json()) as { error?: unknown };
            if (response.ok) send(body);
            else if (id !== null) send({ jsonrpc: "2.0", id, error: { code: -32000, message: typeof body.error === "string" ? body.error : `HTTP ${response.status}` } });
          } catch (error) {
            if (id !== null) send({ jsonrpc: "2.0", id, error: { code: -32000, message: `Betaray is unreachable: ${(error as Error).message}` } });
          }
        });
      });
      await new Promise<void>((resolve) => lines.on("close", resolve));
      await queue;
    });
}
