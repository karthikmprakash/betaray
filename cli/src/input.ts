import * as fs from "node:fs";

export async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
    if (process.stdin.isTTY) resolve("");
  });
}

export async function readInputFile(file: string | undefined, stdinFlag: boolean): Promise<string | null> {
  if (stdinFlag || file === "-") {
    return readStdin();
  }
  if (file) {
    return fs.readFileSync(file, "utf8");
  }
  // check if stdin is piped
  if (!process.stdin.isTTY) {
    const data = await readStdin();
    if (data.trim()) return data;
  }
  return null;
}

export function parseJsonInput(raw: string, label = "input"): unknown {
  try { return JSON.parse(raw); } catch (e) {
    throw new Error(`Invalid JSON in ${label}: ${(e as Error).message}`);
  }
}
