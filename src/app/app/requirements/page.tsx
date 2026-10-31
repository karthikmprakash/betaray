"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react"
import { useAppData } from "@/lib/appData"
import { SelectMenu } from "@/components/app/SelectMenu"
import { downloadCsv } from "@/lib/utils"

export default function RequirementsPage() {
  const { requirements, tests, mutate, canWrite, busy } = useAppData()
  const [showNew, setShowNew] = useState(false)
  const [summary, setSummary] = useState("")
  const [issueType, setIssueType] = useState("Story")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("All")
  const rows = requirements.map((requirement) => ({
    ...requirement,
    linked: tests.filter((test) =>
      test.linkedRequirements.includes(requirement.key),
    ),
  }))
  const covered = rows.filter((row) => row.linked.length > 0).length
  const filtered = rows.filter(
    (row) =>
      `${row.key} ${row.summary}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (filter === "All" ||
        (filter === "Covered"
          ? row.linked.length > 0
          : row.linked.length === 0)),
  )

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Requirements</h1>
          <p>
            See which requirements have tests and close the gaps in coverage.
          </p>
        </div>
        <div className="detail-actions">
          {canWrite && (
            <button
              className="primary-action"
              onClick={() => setShowNew(!showNew)}
            >
              New requirement
            </button>
          )}
          <button
            className="secondary-action"
            onClick={() =>
              downloadCsv("betaray-requirements.csv", [
                [
                  "Requirement",
                  "Summary",
                  "Type",
                  "Status",
                  "Linked tests",
                  "Coverage",
                ],
                ...filtered.map((row) => [
                  row.key,
                  row.summary,
                  row.type,
                  row.status,
                  row.linked.map((test) => test.key).join("; "),
                  row.linked.length ? "Covered" : "No coverage",
                ]),
              ])
            }
          >
            <Download size={15} aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>
      {showNew && (
        <form
          className="test-create-form"
          onSubmit={async (event) => {
            event.preventDefault()
            if (
              await mutate("requirement.create", { summary, type: issueType })
            ) {
              setSummary("")
              setShowNew(false)
            }
          }}
        >
          <div className="form-grid">
            <label>
              Summary
              <input
                required
                maxLength={200}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
              />
            </label>
            <label>
              Issue type
              <SelectMenu
                value={issueType}
                options={["Story", "Bug", "Task"].map((value) => ({
                  value,
                  label: value,
                }))}
                onChange={setIssueType}
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary-action" disabled={busy}>
              Create requirement
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={() => setShowNew(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <dl className="overview-summary requirements-summary">
        <div>
          <dt>Requirement coverage</dt>
          <dd>
            {rows.length
              ? `${Math.round((covered / rows.length) * 100)}%`
              : "—"}
            <span>
              {covered} of {rows.length} requirements have linked tests
            </span>
          </dd>
        </div>
        <div>
          <dt>Uncovered requirements</dt>
          <dd>
            {rows.length - covered}
            <span>Need at least one linked test</span>
          </dd>
        </div>
      </dl>
      <div className="test-toolbar">
        <div className="test-search">
          <Search size={15} aria-hidden="true" />
          <input
            aria-label="Search requirements"
            placeholder="Search by requirement or issue key…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div
          className="type-filters"
          role="group"
          aria-label="Filter by coverage"
        >
          {["All", "Covered", "Uncovered"].map((value) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <span className="test-count" aria-live="polite">
          {filtered.length} of {rows.length} requirements
        </span>
      </div>
      <div
        className="tests-table-wrap"
        role="region"
        aria-label="Requirements, scroll horizontally on small screens"
        tabIndex={0}
      >
        <table className="tests-table requirement-library">
          <caption className="sr-only">
            Requirement traceability and linked tests
          </caption>
          <thead>
            <tr>
              <th scope="col" className="key-column">
                Key
              </th>
              <th scope="col">Requirement</th>
              <th scope="col">Type / status</th>
              <th scope="col">Linked tests</th>
              <th scope="col">Coverage</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.key}>
                <td className="key-column">
                  <span className="test-key">{row.key}</span>
                </td>
                <td>
                  <span className="test-title">{row.summary}</span>
                </td>
                <td>
                  <span className="block">{row.type}</span>
                  <span className="block text-[13px] mt-1">{row.status}</span>
                </td>
                <td>
                  <div className="requirement-links">
                    {row.linked.map((test) => (
                      <Link
                        key={test.id}
                        href={`/app/tests/${test.id}`}
                        className="linked-test-count"
                      >
                        {test.key}
                      </Link>
                    ))}
                    {row.linked.length === 0 && (
                      <Link className="text-action" href="/app/ai-studio">
                        <Sparkles size={13} aria-hidden="true" />
                        Generate tests
                      </Link>
                    )}
                  </div>
                </td>
                <td>
                  <span
                    className={`result-label ${row.linked.length ? "result-success" : "result-warning"}`}
                  >
                    {row.linked.length ? (
                      <CheckCircle2 size={13} aria-hidden="true" />
                    ) : (
                      <AlertCircle size={13} aria-hidden="true" />
                    )}
                    {row.linked.length ? "Covered" : "No coverage"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="tests-empty">
            <h2>No requirements match</h2>
            <p>Try a different issue key or clear the coverage filter.</p>
            <button
              className="secondary-action"
              onClick={() => {
                setQuery("")
                setFilter("All")
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
      <p className="page-footnote">
        Coverage means a requirement has at least one linked test. It does not
        indicate that its tests have passed.
      </p>
    </div>
  )
}
