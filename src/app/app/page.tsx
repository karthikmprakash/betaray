"use client"

import Link from "next/link"
import { ArrowRight, AlertCircle, CheckCircle2, Clock3 } from "lucide-react"
import { useAppData } from "@/lib/appData"

export default function Overview() {
  const { tests, executions, requirements } = useAppData()
  const runs = executions.flatMap((execution) => execution.runs)
  const passed = runs.filter((run) => run.status === "PASS").length
  const failed = runs.filter((run) => run.status === "FAIL").length
  const pending = runs.filter((run) => run.status === "TODO").length
  const completed = runs.filter(
    (run) => run.status === "PASS" || run.status === "FAIL",
  ).length
  const covered = requirements.filter((requirement) =>
    tests.some((test) => test.linkedRequirements.includes(requirement.key)),
  ).length
  const gaps = requirements.length - covered
  const coverage = requirements.length
    ? Math.round((covered / requirements.length) * 100)
    : 0
  const passRate = completed ? Math.round((passed / completed) * 100) : null
  const outcomes = [
    { label: "Passed", value: passed, color: "var(--success)" },
    { label: "Failed", value: failed, color: "var(--danger)" },
    {
      label: "Running",
      value: runs.filter((run) => run.status === "EXECUTING").length,
      color: "var(--accent)",
    },
    { label: "To do", value: pending, color: "var(--border-strong)" },
    {
      label: "Blocked",
      value: runs.filter((run) => run.status === "BLOCKED").length,
      color: "var(--warning)",
    },
  ]

  return (
    <div className="overview-page">
      <div className="page-heading">
        <div>
          <h1>Project overview</h1>
          <p>Coverage, execution results, and the work that needs attention.</p>
        </div>
        <Link href="/app/tests" className="primary-action">
          View tests
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      <dl className="overview-summary">
        <div>
          <dt>Requirement coverage</dt>
          <dd>
            {requirements.length ? `${coverage}%` : "—"}
            <span>
              {covered} of {requirements.length} requirements
            </span>
          </dd>
        </div>
        <div>
          <dt>Pass rate</dt>
          <dd>
            {passRate === null ? "—" : `${passRate}%`}
            <span>
              {passed} of {completed} completed runs
            </span>
          </dd>
        </div>
        <div>
          <dt>Test library</dt>
          <dd>
            {tests.length}
            <span>Reusable test cases</span>
          </dd>
        </div>
        <div>
          <dt>Executions</dt>
          <dd>
            {executions.length}
            <span>{runs.length} total test runs</span>
          </dd>
        </div>
      </dl>

      {(gaps > 0 || failed > 0) && (
        <section
          className="attention-strip"
          aria-label="Items needing attention"
        >
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <strong>Needs attention</strong>
            <span>
              {gaps > 0
                ? `${gaps} requirement${gaps === 1 ? " has" : "s have"} no linked tests.`
                : "All requirements have linked tests."}{" "}
              {failed > 0 &&
                `${failed} test run${failed === 1 ? " has" : "s have"} failed.`}
            </span>
          </div>
          <Link href={failed > 0 ? "/app/executions" : "/app/requirements"}>
            Review {failed > 0 ? "executions" : "coverage"}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </section>
      )}

      <div className="overview-workbench">
        <section
          className="overview-section"
          aria-labelledby="coverage-heading"
        >
          <div className="section-heading">
            <div>
              <h2 id="coverage-heading">Requirement coverage</h2>
              <p>Requirements, linked tests, and results.</p>
            </div>
            <Link href="/app/requirements" className="text-action">
              View all
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div
            className="coverage-table-wrap"
            role="region"
            aria-label="Requirement coverage, scroll horizontally on small screens"
            tabIndex={0}
          >
            <table className="coverage-table">
              <caption className="sr-only">
                Requirements, linked tests, and test results
              </caption>
              <thead>
                <tr>
                  <th scope="col">Requirement</th>
                  <th scope="col">Tests</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((requirement) => {
                  const linked = tests.filter((test) =>
                    test.linkedRequirements.includes(requirement.key),
                  )
                  const linkedRuns = runs.filter((run) =>
                    linked.some((test) => test.id === run.testId),
                  )
                  const hasFailure = linkedRuns.some(
                    (run) => run.status === "FAIL",
                  )
                  const allPassed =
                    linked.length > 0 &&
                    linked.every((test) => {
                      const testRuns = linkedRuns.filter(
                        (run) => run.testId === test.id,
                      )
                      return (
                        testRuns.length > 0 &&
                        testRuns.every((run) => run.status === "PASS")
                      )
                    })
                  const result =
                    linked.length === 0
                      ? "No coverage"
                      : hasFailure
                        ? "Failing"
                        : allPassed
                          ? "Passed"
                          : "Not complete"
                  return (
                    <tr key={requirement.key}>
                      <td>
                        <span className="issue-key">{requirement.key}</span>
                        <Link
                          href="/app/requirements"
                          className="requirement-name"
                        >
                          {requirement.summary}
                        </Link>
                      </td>
                      <td>
                        {linked.length ? (
                          <Link
                            className="linked-test-count"
                            href={`/app/tests/${linked[0].id}`}
                            aria-label={`${linked.length} tests linked to ${requirement.key}; open ${linked[0].key}`}
                          >
                            {linked.length} linked
                          </Link>
                        ) : (
                          <span className="muted-text">None</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`result-label ${hasFailure ? "result-danger" : !linked.length ? "result-warning" : allPassed ? "result-success" : ""}`}
                        >
                          {hasFailure || !linked.length ? (
                            <AlertCircle size={13} aria-hidden="true" />
                          ) : allPassed ? (
                            <CheckCircle2 size={13} aria-hidden="true" />
                          ) : (
                            <Clock3 size={13} aria-hidden="true" />
                          )}
                          {result}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {requirements.length === 0 && (
            <p className="section-empty">
              No requirements yet. Add requirements to start tracking coverage.
            </p>
          )}
        </section>

        <div className="overview-secondary">
          <section
            className="overview-section recent-executions"
            aria-labelledby="executions-heading"
          >
            <div className="section-heading">
              <div>
                <h2 id="executions-heading">Recent executions</h2>
                <p>Continue a run or review its results.</p>
              </div>
              <Link href="/app/executions" className="text-action">
                View all
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <div className="dashboard-executions">
              {executions.slice(0, 4).map((execution) => {
                const finished = execution.runs.filter(
                  (run) => run.status === "PASS" || run.status === "FAIL",
                ).length
                const failures = execution.runs.filter(
                  (run) => run.status === "FAIL",
                ).length
                const progress = execution.runs.length
                  ? Math.round((finished / execution.runs.length) * 100)
                  : 0
                return (
                  <Link
                    href={`/app/executions/${execution.id}`}
                    key={execution.id}
                    className="dashboard-execution"
                  >
                    <div className="execution-context">
                      <span>{execution.key}</span>
                      <span>
                        {execution.env} · {execution.runs.length} tests
                      </span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </div>
                    <strong>{execution.name}</strong>
                    <div className="execution-completion">
                      <span
                        className={failures ? "result-danger" : "muted-text"}
                      >
                        {failures
                          ? `${failures} failed`
                          : finished
                            ? `${finished} completed`
                            : "Not started"}
                      </span>
                      <span>{progress}% complete</span>
                    </div>
                    <progress
                      value={progress}
                      max={100}
                      aria-label={`${execution.name} completion`}
                    />
                  </Link>
                )
              })}
              {executions.length === 0 && (
                <p className="section-empty">
                  No executions yet. Create one to run your tests.
                </p>
              )}
            </div>
          </section>
          <section
            className="overview-section"
            aria-labelledby="results-heading"
          >
            <div className="section-heading">
              <div>
                <h2 id="results-heading">Run results</h2>
                <p>
                  {runs.length} runs across {executions.length} executions.
                </p>
              </div>
            </div>
            <div className="run-results-body">
              {runs.length > 0 ? (
                <>
                  <div
                    className="result-distribution"
                    role="img"
                    aria-label={outcomes
                      .map(
                        (outcome) =>
                          `${outcome.value} ${outcome.label.toLowerCase()}`,
                      )
                      .join(", ")}
                  >
                    {outcomes
                      .filter((outcome) => outcome.value > 0)
                      .map((outcome) => (
                        <span
                          key={outcome.label}
                          style={{
                            width: `${(outcome.value / runs.length) * 100}%`,
                            background: outcome.color,
                          }}
                        />
                      ))}
                  </div>
                  <dl className="outcome-list">
                    {outcomes.map((outcome) => (
                      <div key={outcome.label}>
                        <dt>
                          <span
                            style={{ background: outcome.color }}
                            aria-hidden="true"
                          />
                          {outcome.label}
                        </dt>
                        <dd>{outcome.value}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <p className="section-empty">
                  Create an execution to see test results here.
                </p>
              )}
              <Link href="/app/executions" className="text-action">
                Open executions
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
