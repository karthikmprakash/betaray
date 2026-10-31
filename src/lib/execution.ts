export function executionStatus(runs: { status: string }[]) {
  if (!runs.length || runs.every((run) => run.status === "TODO")) return "To Do"
  if (runs.every((run) => run.status === "PASS" || run.status === "FAIL"))
    return "Done"
  if (runs.every((run) => run.status === "ABORTED")) return "Aborted"
  return "In Progress"
}
