import chalk from "chalk";

export function jsonOut(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

export function errorOut(msg: string): void {
  process.stderr.write(chalk.red(msg) + "\n");
}
export function warnOut(msg: string): void {
  process.stderr.write(chalk.yellow(msg) + "\n");
}
export function infoOut(msg: string): void {
  process.stderr.write(chalk.dim(msg) + "\n");
}

export function tableOut(headers: string[], rows: string[][]): void {
  if (rows.length === 0) {
    process.stdout.write(chalk.dim("(no results)\n"));
    return;
  }
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));
  const sep = widths.map((w) => "-".repeat(w)).join("  ");
  const fmt = (cells: string[]) => cells.map((c, i) => (c ?? "").padEnd(widths[i])).join("  ");
  process.stdout.write(chalk.bold(fmt(headers)) + "\n");
  process.stdout.write(chalk.dim(sep) + "\n");
  for (const row of rows) process.stdout.write(fmt(row) + "\n");
}

export function maskToken(token: string): string {
  if (token.length <= 8) return "***";
  return token.slice(0, 4) + "*".repeat(Math.min(12, token.length - 8)) + token.slice(-4);
}
