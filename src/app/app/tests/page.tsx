"use client"

import Link from "next/link"
import { useMemo, useRef, useState } from "react"
import {
  Plus,
  Search,
  X,
  Download,
  Upload,
  Archive,
  RotateCcw,
} from "lucide-react"
import { useAppData } from "@/lib/appData"
import { SelectMenu } from "@/components/app/SelectMenu"
import { downloadText } from "@/lib/utils"
import { useToast } from "@/components/ui/toast"

const emptyForm = {
  summary: "",
  type: "Manual",
  priority: "Medium",
  folder: "",
  steps: "",
}

export default function TestsPage() {
  const { tests, allTests, folders, createTest, mutate, canWrite, busy } =
    useAppData()
  const { toast, ToastEl } = useToast()
  const [selected, setSelected] = useState<string[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [importError, setImportError] = useState("")
  const importInput = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("All")
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")
  const summaryInput = useRef<HTMLInputElement>(null)
  const createButton = useRef<HTMLButtonElement>(null)
  const filtered = useMemo(
    () =>
      allTests.filter(
        (test) =>
          (showArchived ? !!test.archivedAt : !test.archivedAt) &&
          (filter === "All" || test.type === filter) &&
          [test.summary, test.key, ...(test.labels || [])]
            .join(" ")
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [allTests, filter, query, showArchived],
  )

  function closeForm() {
    setShowNew(false)
    setError("")
    createButton.current?.focus()
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Tests</h1>
          <p>Manage reusable test cases and their linked requirements.</p>
        </div>
        <button
          ref={createButton}
          disabled={!canWrite || busy}
          className="primary-action"
          onClick={() => {
            if (showNew) closeForm()
            else setShowNew(true)
          }}
          aria-expanded={showNew}
          aria-controls="create-test-form"
        >
          {showNew ? (
            <X size={15} aria-hidden="true" />
          ) : (
            <Plus size={15} aria-hidden="true" />
          )}
          {showNew ? "Close form" : "Create test"}
        </button>
      </div>
      {showNew && (
        <form
          id="create-test-form"
          className="test-create-form"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!form.summary.trim()) {
              setError("Enter a summary so your team can identify this test.")
              summaryInput.current?.focus()
              return
            }
            const steps = form.steps
              .split("\n")
              .map((action) => ({ action: action.trim() }))
              .filter((step) => step.action)
            const saved = await createTest({
              summary: form.summary.trim(),
              type: form.type,
              priority: form.priority,
              folder: form.folder.trim() || "General",
              ...(form.type === "Cucumber"
                ? { gherkin: form.steps, steps: [] }
                : { steps }),
            })
            if (!saved) return
            setForm(emptyForm)
            closeForm()
            setQuery("")
            setFilter("All")
            toast(
              "Test created. Open it to add expected results and requirement links.",
            )
          }}
          noValidate
        >
          <h2>Create a test</h2>
          <div className="form-grid">
            <label className="full-width" htmlFor="test-summary">
              <span className="field-label">
                Summary <span className="form-hint">Required</span>
              </span>
              <input
                ref={summaryInput}
                autoFocus
                id="test-summary"
                required
                aria-invalid={!!error}
                aria-describedby={error ? "test-error" : undefined}
                value={form.summary}
                onChange={(event) => {
                  setForm({ ...form, summary: event.target.value })
                  if (error) setError("")
                }}
                placeholder="e.g. Checkout accepts a valid delivery address"
              />
            </label>
            <label htmlFor="test-type">
              Test type
              <SelectMenu
                id="test-type"
                value={form.type}
                onChange={(type) => setForm({ ...form, type })}
                options={["Manual", "Cucumber", "Generic"].map((type) => ({
                  value: type,
                  label: type,
                }))}
              />
            </label>
            <label htmlFor="test-priority">
              Priority
              <SelectMenu
                id="test-priority"
                value={form.priority}
                onChange={(priority) => setForm({ ...form, priority })}
                options={["Highest", "High", "Medium", "Low"].map((priority) => ({
                  value: priority,
                  label: priority,
                }))}
              />
            </label>
            <label className="full-width" htmlFor="test-folder">
              Folder{" "}
              <span className="form-hint">
                Optional · Saved to General if left blank
              </span>
              <input
                id="test-folder"
                value={form.folder}
                onChange={(event) =>
                  setForm({ ...form, folder: event.target.value })
                }
                placeholder="e.g. Checkout"
              />
            </label>
            <label className="full-width" htmlFor="test-steps">
              {form.type === "Cucumber" ? "Gherkin scenario" : "Test steps"}
              <span className="form-hint">
                {form.type === "Cucumber"
                  ? "Optional · Use Given, When, Then to describe the scenario."
                  : "Optional · Enter one action per line. Add expected results in the test details."}
              </span>
              <textarea
                id="test-steps"
                value={form.steps}
                onChange={(event) =>
                  setForm({ ...form, steps: event.target.value })
                }
                placeholder={
                  form.type === "Cucumber"
                    ? "Given a customer has an item in their cart…"
                    : "Open the checkout page\nEnter a valid delivery address\nSubmit the order"
                }
              />
            </label>
          </div>
          {error && (
            <p id="test-error" className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button type="submit" disabled={busy} className="primary-action">
              Create test
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={closeForm}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="library-actions">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => {
              setShowArchived(event.target.checked)
              setSelected([])
            }}
          />
          Archived tests
        </label>
        <button
          className="secondary-action"
          onClick={() =>
            downloadText(
              "betaray-tests.json",
              JSON.stringify(
                {
                  tests: filtered.filter((test) =>
                    selected.length ? selected.includes(test.id) : true,
                  ),
                },
                null,
                2,
              ),
              "application/json",
            )
          }
        >
          <Download size={15} />
          Export JSON
        </button>
        {canWrite && (
          <button
            className="secondary-action"
            disabled={busy}
            onClick={() => importInput.current?.click()}
          >
            <Upload size={15} />
            Import JSON
          </button>
        )}
        <input
          type="file"
          ref={importInput}
          accept=".json,application/json"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            setImportError("")
            try {
              if (file.size > 500000)
                throw new Error("Choose a JSON file smaller than 500 KB.")
              const parsed = JSON.parse(await file.text())
              const records = Array.isArray(parsed) ? parsed : parsed.tests
              if (!Array.isArray(records))
                throw new Error("The JSON file must contain a tests array.")
              const result = await mutate("test.import", { tests: records })
              if (result) toast("Tests imported with new project keys")
            } catch (error) {
              setImportError(
                error instanceof Error ? error.message : "Import failed.",
              )
            }
            event.target.value = ""
          }}
        />
      </div>
      {importError && (
        <p className="form-error" role="alert">
          {importError}
        </p>
      )}
      {selected.length > 0 && (
        <div className="bulk-toolbar">
          <strong>{selected.length} selected</strong>
          <button className="text-action" onClick={() => setSelected([])}>
            Clear selection
          </button>
          {canWrite && (
            <>
              <SelectMenu
                ariaLabel="Move selected tests to folder"
                placeholder="Move to folder…"
                value=""
                variant="toolbar"
                disabled={busy}
                options={folders.map((folder) => ({
                  value: folder.name,
                  label: folder.name,
                }))}
                onChange={async (folder) => {
                  if (
                    folder &&
                    (await mutate("test.bulk", { ids: selected, folder }))
                  ) {
                    setSelected([])
                    toast("Tests moved")
                  }
                }}
              />
              <SelectMenu
                ariaLabel="Set priority for selected tests"
                placeholder="Set priority…"
                value=""
                variant="toolbar"
                disabled={busy}
                options={["Highest", "High", "Medium", "Low"].map((priority) => ({
                  value: priority,
                  label: priority,
                }))}
                onChange={async (priority) => {
                  if (
                    priority &&
                    (await mutate("test.bulk", { ids: selected, priority }))
                  ) {
                    setSelected([])
                    toast("Priority updated")
                  }
                }}
              />
              <button
                className="secondary-action"
                disabled={busy}
                onClick={async () => {
                  if (
                    await mutate("test.bulk", {
                      ids: selected,
                      archived: !showArchived,
                    })
                  ) {
                    setSelected([])
                    toast(showArchived ? "Tests restored" : "Tests archived")
                  }
                }}
              >
                {showArchived ? <RotateCcw size={15} /> : <Archive size={15} />}
                {showArchived ? "Restore" : "Archive"}
              </button>
            </>
          )}
        </div>
      )}
      <div className="test-toolbar">
        <div className="test-search">
          <Search size={15} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, key, or label…"
            aria-label="Search tests"
          />
        </div>
        <div
          className="type-filters"
          role="group"
          aria-label="Filter tests by type"
        >
          {["All", "Manual", "Cucumber", "Generic"].map((type) => (
            <button
              key={type}
              aria-pressed={filter === type}
              onClick={() => setFilter(type)}
            >
              {type}
            </button>
          ))}
        </div>
        <span className="test-count" aria-live="polite">
          {filtered.length} of {tests.length} tests
        </span>
      </div>
      <div
        className="tests-table-wrap"
        role="region"
        aria-label="Test library, scroll horizontally on small screens"
        tabIndex={0}
      >
        <table className="tests-table">
          <caption className="sr-only">Test library</caption>
          <thead>
            <tr>
              <th scope="col" className="selection-column">
                <input
                  type="checkbox"
                  aria-label="Select all visible tests"
                  checked={
                    filtered.length > 0 &&
                    filtered.every((test) => selected.includes(test.id))
                  }
                  onChange={(event) =>
                    setSelected(
                      event.target.checked
                        ? filtered.map((test) => test.id)
                        : [],
                    )
                  }
                />
              </th>
              <th scope="col" className="key-column">
                Key
              </th>
              <th scope="col">Test case</th>
              <th scope="col">Type</th>
              <th scope="col">Priority</th>
              <th scope="col">Folder</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((test) => (
              <tr key={test.id}>
                <td className="selection-column">
                  <input
                    type="checkbox"
                    aria-label={`Select ${test.key}`}
                    checked={selected.includes(test.id)}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? [...selected, test.id]
                          : selected.filter((id) => id !== test.id),
                      )
                    }
                  />
                </td>
                <td className="key-column">
                  <span className="test-key">{test.key}</span>
                </td>
                <td>
                  <Link className="test-title" href={`/app/tests/${test.id}`}>
                    {test.summary}
                  </Link>
                </td>
                <td>
                  <span className="type-label">{test.type}</span>
                </td>
                <td>{test.priority}</td>
                <td>{test.folder || "General"}</td>
                <td className="whitespace-nowrap">
                  {new Intl.DateTimeFormat("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(test.createdAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="tests-empty">
            <h2>
              {tests.length
                ? "No tests match your search"
                : "Create your first test"}
            </h2>
            <p>
              {tests.length
                ? "Try another name or issue key, or clear the type filter."
                : "Add a test case, then include it in an execution to track results."}
            </p>
            <button
              className="secondary-action"
              onClick={() => {
                if (tests.length) {
                  setQuery("")
                  setFilter("All")
                } else setShowNew(true)
              }}
            >
              {tests.length ? "Clear filters" : "Create test"}
            </button>
          </div>
        )}
      </div>
      <ToastEl />
    </div>
  )
}
