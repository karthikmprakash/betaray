"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { Plus, Search, ArrowRight, X } from "lucide-react"
import { useAppData } from "@/lib/appData"
import { SelectMenu } from "@/components/app/SelectMenu"
import { useToast } from "@/components/ui/toast"

export default function ExecutionsPage() {
  const { executions, tests, envs, createExecution, canWrite, busy } =
    useAppData()
  const { toast, ToastEl } = useToast()
  const [query, setQuery] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState("")
  const [env, setEnv] = useState(envs[0] || "")
  const [version, setVersion] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState("")
  const nameInput = useRef<HTMLInputElement>(null)
  const createButton = useRef<HTMLButtonElement>(null)
  const filtered = executions.filter((execution) =>
    `${execution.key} ${execution.name}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Executions</h1>
          <p>Group tests into a run, record results, and track completion.</p>
        </div>
        <button
          ref={createButton}
          disabled={!canWrite || busy}
          className="primary-action"
          aria-expanded={showNew}
          aria-controls="create-execution-form"
          onClick={() => setShowNew(!showNew)}
        >
          {showNew ? (
            <X size={15} aria-hidden="true" />
          ) : (
            <Plus size={15} aria-hidden="true" />
          )}
          {showNew ? "Close form" : "Create execution"}
        </button>
      </div>
      {showNew && (
        <form
          id="create-execution-form"
          className="test-create-form"
          noValidate
          onSubmit={async (event) => {
            event.preventDefault()
            if (!name.trim()) {
              setError("Enter a name for this execution.")
              nameInput.current?.focus()
              return
            }
            if (selected.length === 0) {
              setError("Select at least one test to include in this execution.")
              return
            }
            const saved = await createExecution(name.trim(), selected, {
              env: envs.includes(env) ? env : envs[0] || "",
              version: version.trim().replace(/^v/, ""),
            })
            if (!saved) return
            setName("")
            setSelected([])
            setVersion("")
            setError("")
            setShowNew(false)
            setQuery("")
            createButton.current?.focus()
            toast("Execution created. Open it to start recording results.")
          }}
        >
          <h2>Create an execution</h2>
          <div className="form-grid">
            <label className="full-width" htmlFor="exec-name">
              <span className="field-label">
                Execution name <span className="form-hint">Required</span>
              </span>
              <input
                id="exec-name"
                ref={nameInput}
                autoFocus
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setError("")
                }}
                placeholder="e.g. Checkout regression"
                aria-describedby={error ? "execution-error" : undefined}
                required
              />
            </label>
            <label htmlFor="exec-env">
              Environment
              <SelectMenu
                id="exec-env"
                value={env}
                options={envs.map((environment) => ({
                  value: environment,
                  label: environment,
                }))}
                onChange={setEnv}
              />
            </label>
            <label htmlFor="exec-version">
              Version <span className="form-hint">Optional</span>
              <input
                id="exec-version"
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                placeholder="e.g. 1.4.0"
              />
            </label>
          </div>
          {envs.length === 0 && (
            <p className="permission-notice">
              An administrator must{" "}
              <Link href="/app/environments" className="text-action">
                create an environment
              </Link>{" "}
              before an execution can be created.
            </p>
          )}
          <fieldset className="execution-test-selector">
            <legend>
              Include tests{" "}
              <span className="form-hint">{selected.length} selected</span>
            </legend>
            <button
              type="button"
              className="text-action"
              onClick={() =>
                setSelected(
                  selected.length === tests.length
                    ? []
                    : tests.map((test) => test.id),
                )
              }
            >
              {selected.length === tests.length && tests.length
                ? "Deselect all"
                : "Select all"}
            </button>
            <div className="execution-test-options">
              {tests.map((test) => (
                <label key={test.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(test.id)}
                    onChange={(event) => {
                      setSelected(
                        event.target.checked
                          ? [...selected, test.id]
                          : selected.filter((id) => id !== test.id),
                      )
                      setError("")
                    }}
                  />
                  <span className="test-key">{test.key}</span>
                  <span>{test.summary}</span>
                </label>
              ))}
              {tests.length === 0 && (
                <p className="section-empty">
                  Create a test before starting an execution.
                </p>
              )}
            </div>
          </fieldset>
          {error && (
            <p className="form-error" id="execution-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button
              type="submit"
              className="primary-action"
              disabled={tests.length === 0 || busy || envs.length === 0}
            >
              Create execution
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                setShowNew(false)
                setError("")
                createButton.current?.focus()
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="test-toolbar">
        <div className="test-search">
          <Search size={15} aria-hidden="true" />
          <input
            aria-label="Search executions"
            placeholder="Search by name or issue key…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <span className="test-count" aria-live="polite">
          {filtered.length} of {executions.length} executions
        </span>
      </div>
      <div
        className="tests-table-wrap"
        role="region"
        aria-label="Executions, scroll horizontally on small screens"
        tabIndex={0}
      >
        <table className="tests-table">
          <caption className="sr-only">Test executions and completion</caption>
          <thead>
            <tr>
              <th scope="col" className="key-column">
                Key
              </th>
              <th scope="col">Execution</th>
              <th scope="col">Environment</th>
              <th scope="col">Results</th>
              <th scope="col">Completion</th>
              <th scope="col">
                <span className="sr-only">Open execution</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((execution) => {
              const passed = execution.runs.filter(
                (run) => run.status === "PASS",
              ).length
              const failed = execution.runs.filter(
                (run) => run.status === "FAIL",
              ).length
              const progress = execution.runs.length
                ? Math.round(((passed + failed) / execution.runs.length) * 100)
                : 0
              return (
                <tr key={execution.id}>
                  <td className="key-column">
                    <span className="test-key">{execution.key}</span>
                  </td>
                  <td>
                    <Link
                      href={`/app/executions/${execution.id}`}
                      className="test-title"
                    >
                      {execution.name}
                    </Link>
                    <span className="test-key mt-1">
                      {execution.runs.length} tests
                      {execution.version ? ` · v${execution.version}` : ""}
                    </span>
                  </td>
                  <td>{execution.env || "Unassigned"}</td>
                  <td>
                    <span>{passed} passed</span>
                    <span
                      className={`block mt-1 ${failed ? "result-danger" : ""}`}
                    >
                      {failed} failed
                    </span>
                  </td>
                  <td>
                    <div className="execution-progress">
                      <span>{progress}% complete</span>
                      <progress
                        value={progress}
                        max={100}
                        aria-label={`${execution.name} completion`}
                      />
                    </div>
                  </td>
                  <td>
                    <Link
                      href={`/app/executions/${execution.id}`}
                      className="text-action"
                      aria-label={`Open ${execution.name}`}
                    >
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="tests-empty">
            <h2>
              {executions.length
                ? "No executions match your search"
                : "Create your first execution"}
            </h2>
            <p>
              {executions.length
                ? "Try a different name or issue key."
                : "Choose tests and an environment to start recording results."}
            </p>
            <button
              className="secondary-action"
              onClick={() =>
                executions.length ? setQuery("") : setShowNew(true)
              }
            >
              {executions.length ? "Clear search" : "Create execution"}
            </button>
          </div>
        )}
      </div>
      <ToastEl />
    </div>
  )
}
