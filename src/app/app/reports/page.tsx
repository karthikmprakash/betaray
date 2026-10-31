"use client"

import Link from "next/link"
import { Download, ArrowRight } from "lucide-react"
import { useAppData } from "@/lib/appData"
import { downloadCsv } from "@/lib/utils"

export default function ReportsPage() {
  const { executions, requirements, tests } = useAppData()
  const rows = executions.map((execution) => {
    const passed = execution.runs.filter((run) => run.status === "PASS").length
    const failed = execution.runs.filter((run) => run.status === "FAIL").length
    const completed = passed + failed
    return {
      ...execution,
      passed,
      failed,
      completed,
      remaining: execution.runs.length - completed,
      passRate: completed ? Math.round((passed / completed) * 100) : null,
    }
  })
  const total = rows.reduce((sum, row) => sum + row.runs.length, 0)
  const passed = rows.reduce((sum, row) => sum + row.passed, 0)
  const completed = rows.reduce((sum, row) => sum + row.completed, 0)
  const covered = requirements.filter((requirement) =>
    tests.some((test) => test.linkedRequirements.includes(requirement.key)),
  ).length

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Reports</h1>
          <p>Execution results and requirement coverage from this workspace.</p>
        </div>
        <button
          className="secondary-action"
          onClick={() =>
            downloadCsv("betaray-execution-results.csv", [
              [
                "Execution",
                "Name",
                "Environment",
                "Total runs",
                "Passed",
                "Failed",
                "Remaining",
                "Pass rate",
              ],
              ...rows.map((row) => [
                row.key,
                row.name,
                row.env || "",
                row.runs.length,
                row.passed,
                row.failed,
                row.remaining,
                row.passRate === null ? "Not run" : `${row.passRate}%`,
              ]),
            ])
          }
        >
          <Download size={15} aria-hidden="true" />
          Export CSV
        </button>
      </div>
      <dl className="overview-summary">
        <div>
          <dt>Total test runs</dt>
          <dd>
            {total}
            <span>Across {executions.length} executions</span>
          </dd>
        </div>
        <div>
          <dt>Completed</dt>
          <dd>
            {completed}
            <span>{total - completed} runs remaining</span>
          </dd>
        </div>
        <div>
          <dt>Pass rate</dt>
          <dd>
            {completed ? `${Math.round((passed / completed) * 100)}%` : "—"}
            <span>Of completed runs</span>
          </dd>
        </div>
        <div>
          <dt>Coverage</dt>
          <dd>
            {requirements.length
              ? `${Math.round((covered / requirements.length) * 100)}%`
              : "—"}
            <span>
              {covered} of {requirements.length} requirements linked
            </span>
          </dd>
        </div>
      </dl>
      <section className="overview-section" aria-labelledby="report-results">
        <div className="section-heading">
          <div>
            <h2 id="report-results">Results by execution</h2>
            <p>
              Pass rate includes passed and failed runs. Pending runs are
              excluded.
            </p>
          </div>
        </div>
        <div
          className="tests-table-wrap"
          role="region"
          aria-label="Execution results, scroll horizontally on small screens"
          tabIndex={0}
        >
          <table className="tests-table">
            <caption className="sr-only">Results by execution</caption>
            <thead>
              <tr>
                <th scope="col" className="key-column">
                  Key
                </th>
                <th scope="col">Execution</th>
                <th scope="col">Environment</th>
                <th scope="col">Passed</th>
                <th scope="col">Failed</th>
                <th scope="col">Remaining</th>
                <th scope="col">Pass rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="key-column">
                    <span className="test-key">{row.key}</span>
                  </td>
                  <td>
                    <Link
                      className="test-title"
                      href={`/app/executions/${row.id}`}
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td>{row.env || "Unassigned"}</td>
                  <td>{row.passed}</td>
                  <td>
                    <span className={row.failed ? "result-danger" : ""}>
                      {row.failed}
                    </span>
                  </td>
                  <td>{row.remaining}</td>
                  <td>
                    {row.passRate === null ? "Not run" : `${row.passRate}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="tests-empty">
              <h2>No execution results yet</h2>
              <p>Create an execution and run tests to build this report.</p>
              <Link href="/app/executions" className="secondary-action">
                Open executions
              </Link>
            </div>
          )}
        </div>
      </section>
      <div className="report-coverage-link">
        <div>
          <h2>Requirement traceability</h2>
          <p>
            {requirements.length - covered} requirements have no linked tests.
          </p>
        </div>
        <Link href="/app/requirements" className="text-action">
          Review coverage
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
