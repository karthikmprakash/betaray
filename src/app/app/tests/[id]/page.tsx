"use client"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import {
  ArrowLeft,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Archive,
  RotateCcw,
  Download,
} from "lucide-react"
import { useAppData } from "@/lib/appData"
import { SelectMenu } from "@/components/app/SelectMenu"
import type { Test } from "@/lib/types"
import { downloadText } from "@/lib/utils"
import { useToast } from "@/components/ui/toast"

export default function TestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const {
    allTests,
    executions,
    mutate,
    createTest,
    canWrite,
    busy,
    projectId,
  } = useAppData()
  const test = allTests.find((test) => test.id === id)
  const { toast, ToastEl } = useToast()
  const [tab, setTab] = useState("details")
  const [snapshot, setSnapshot] = useState<Test | null>(null)
  const [historyError, setHistoryError] = useState("")
  const [comment, setComment] = useState("")
  if (!test)
    return (
      <div className="tests-empty">
        <h1>Test not found in this project</h1>
        <Link className="text-action" href="/app/tests">
          Back to tests
        </Link>
      </div>
    )
  const runs = executions.flatMap((execution) =>
    execution.runs
      .filter((run) => run.testId === test.id)
      .map((run) => ({ ...run, execution })),
  )
  return (
    <div>
      <Link href="/app/tests" className="text-action">
        <ArrowLeft size={14} />
        Back to tests
      </Link>
      <div className="page-heading detail-page-heading">
        <div>
          <span className="test-key">
            {test.key} · Revision {test.revision}
            {test.archivedAt ? " · Archived" : ""}
          </span>
          <h1>{test.summary}</h1>
          <p>
            {test.type} · {test.priority} priority · {test.folder || "General"}
          </p>
        </div>
        <div className="detail-actions">
          <button
            className="secondary-action"
            onClick={() =>
              downloadText(
                test.type === "Cucumber"
                  ? `${test.key}.feature`
                  : `${test.key}.json`,
                test.type === "Cucumber"
                  ? test.gherkin || ""
                  : JSON.stringify(test, null, 2),
                test.type === "Cucumber" ? "text/plain" : "application/json",
              )
            }
          >
            <Download size={15} />
            Export
          </button>
          {canWrite && (
            <>
              <button
                className="secondary-action"
                disabled={busy}
                onClick={async () => {
                  if (
                    await createTest({
                      ...test,
                      summary: `${test.summary.slice(0, 190)} (copy)`,
                    })
                  )
                    toast("Test cloned with a new key")
                }}
              >
                <Copy size={15} />
                Clone
              </button>
              <button
                className="secondary-action"
                disabled={busy}
                onClick={async () => {
                  if (
                    await mutate("test.bulk", {
                      ids: [test.id],
                      archived: !test.archivedAt,
                    })
                  )
                    toast(test.archivedAt ? "Test restored" : "Test archived")
                }}
              >
                {test.archivedAt ? (
                  <RotateCcw size={15} />
                ) : (
                  <Archive size={15} />
                )}
                {test.archivedAt ? "Restore" : "Archive"}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="admin-tabs" role="group" aria-label="Test details view">
        {[
          { id: "details", label: "Details & steps" },
          { id: "history", label: `History (${test.revisions.length})` },
          { id: "comments", label: `Comments (${test.comments.length})` },
          { id: "runs", label: `Execution history (${runs.length})` },
        ].map((item) => (
          <button
            key={item.id}
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "details" && (
        <TestEditor key={`${test.id}-${test.revision}`} test={test} />
      )}
      {tab === "history" && (
        <section className="platform-section">
          <h2 className="section-title">Revision history</h2>
          <p className="page-footnote">
            Changes preserve the prior version of this test. Stale edits are
            rejected to prevent overwriting another person’s changes.
          </p>
          <div className="audit-list">
            <div>
              <strong>Current revision {test.revision}</strong>
              <span>{test.summary}</span>
            </div>
            {test.revisions.map((revision) => (
              <div key={revision.revision}>
                <strong>Revision {revision.revision} preserved</strong>
                <span>
                  Changed by {revision.actor} ·{" "}
                  {new Date(revision.createdAt).toLocaleString()}
                </span>
                <button
                  className="text-action"
                  onClick={async () => {
                    setHistoryError("")
                    try {
                      const response = await fetch(
                        `/api/tests/${test.id}/revisions/${revision.revision}?projectId=${projectId}`,
                      )
                      const body = await response.json()
                      if (!response.ok) throw new Error(body.error)
                      setSnapshot(body.snapshot)
                    } catch (error) {
                      setHistoryError(
                        error instanceof Error
                          ? error.message
                          : "Revision could not be loaded",
                      )
                    }
                  }}
                >
                  View revision
                </button>
              </div>
            ))}
            {test.revisions.length === 0 && (
              <p className="page-footnote">No edits have been recorded yet.</p>
            )}
          </div>
          {historyError && (
            <p className="form-error" role="alert">
              {historyError}
            </p>
          )}
          {snapshot && (
            <div className="revision-preview">
              <h3 className="section-title">
                Revision {snapshot.revision}: {snapshot.summary}
              </h3>
              <pre className="api-example">
                {JSON.stringify(
                  {
                    summary: snapshot.summary,
                    description: snapshot.description,
                    steps: snapshot.steps,
                    gherkin: snapshot.gherkin,
                    linkedRequirements: snapshot.linkedRequirements,
                  },
                  null,
                  2,
                )}
              </pre>
              {canWrite && !test.archivedAt && (
                <button
                  className="secondary-action"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Restore this revision as a new version of the test? The current version will remain in history.",
                      )
                    ) {
                      if (
                        await mutate("test.restore", {
                          id: test.id,
                          sourceRevision: snapshot.revision,
                          revision: test.revision,
                        })
                      ) {
                        setSnapshot(null)
                        toast("Revision restored as a new version")
                      }
                    }
                  }}
                >
                  Restore as new version
                </button>
              )}
            </div>
          )}
        </section>
      )}
      {tab === "comments" && (
        <section className="platform-section">
          {canWrite && (
            <form
              className="test-create-form"
              onSubmit={async (event) => {
                event.preventDefault()
                if (
                  await mutate("test.comment", { id: test.id, body: comment })
                ) {
                  setComment("")
                  toast("Comment added")
                }
              }}
            >
              <div className="form-grid">
                <label className="full-width">
                  Add a comment
                  <textarea
                    required
                    value={comment}
                    maxLength={8000}
                    onChange={(event) => setComment(event.target.value)}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button
                  className="primary-action"
                  disabled={busy || !comment.trim()}
                >
                  Post comment
                </button>
              </div>
            </form>
          )}
          <div className="comment-list">
            {test.comments.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.actor}</strong>
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString()}
                  </time>
                </div>
                <p>{item.body}</p>
              </article>
            ))}
            {test.comments.length === 0 && (
              <p className="page-footnote">No comments yet.</p>
            )}
          </div>
        </section>
      )}
      {tab === "runs" && (
        <div className="tests-table-wrap">
          <table className="tests-table">
            <thead>
              <tr>
                <th scope="col">Execution</th>
                <th scope="col">Environment</th>
                <th scope="col">Result</th>
                <th scope="col">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.execution.id}>
                  <td>
                    <Link
                      className="test-title"
                      href={`/app/executions/${run.execution.id}`}
                    >
                      {run.execution.key} · {run.execution.name}
                    </Link>
                  </td>
                  <td>{run.execution.env}</td>
                  <td>{run.status}</td>
                  <td>
                    {run.executedAt
                      ? new Date(run.executedAt).toLocaleString()
                      : "Not run"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {runs.length === 0 && (
            <p className="section-empty">
              This test has not been added to an execution.
            </p>
          )}
        </div>
      )}
      <ToastEl />
    </div>
  )
}
function TestEditor({ test }: { test: Test }) {
  const { requirements, folders, updateTest, canWrite, busy } = useAppData()
  const [form, setForm] = useState(test)
  const [labels, setLabels] = useState(test.labels.join(", "))
  const { toast, ToastEl } = useToast()
  function move(index: number, direction: number) {
    const steps = [...form.steps]
    ;[steps[index], steps[index + direction]] = [
      steps[index + direction],
      steps[index],
    ]
    setForm({ ...form, steps })
  }
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        if (
          await updateTest(test.id, {
            ...form,
            labels: labels
              .split(",")
              .map((label) => label.trim())
              .filter(Boolean),
            revision: test.revision,
          })
        )
          toast("Test saved")
      }}
      className="test-editor"
    >
      <fieldset
        disabled={!canWrite || !!test.archivedAt || busy}
        className="form-grid"
      >
        <label className="full-width">
          Summary
          <input
            required
            maxLength={200}
            value={form.summary}
            onChange={(event) =>
              setForm({ ...form, summary: event.target.value })
            }
          />
        </label>
        <label className="full-width">
          Description
          <textarea
            value={form.description || ""}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
        </label>
        <label>
          Type
          <SelectMenu
            value={form.type}
            options={["Manual", "Cucumber", "Generic"].map((value) => ({
              value,
              label: value,
            }))}
            onChange={(type) => setForm({ ...form, type })}
          />
        </label>
        <label>
          Priority
          <SelectMenu
            value={form.priority}
            options={["Highest", "High", "Medium", "Low"].map((value) => ({
              value,
              label: value,
            }))}
            onChange={(priority) => setForm({ ...form, priority })}
          />
        </label>
        <label>
          Folder
          <input
            list="test-folder-options"
            required
            value={form.folder || "General"}
            onChange={(event) =>
              setForm({ ...form, folder: event.target.value })
            }
          />
          <datalist id="test-folder-options">
            {folders.map((folder) => (
              <option key={folder.id}>{folder.name}</option>
            ))}
          </datalist>
        </label>
        <label>
          Status
          <SelectMenu
            value={
              ["TODO", "READY", "REVIEW"].includes(form.status)
                ? form.status
                : "TODO"
            }
            options={["TODO", "REVIEW", "READY"].map((value) => ({
              value,
              label: value,
            }))}
            onChange={(status) => setForm({ ...form, status })}
          />
        </label>
        <label className="full-width">
          Labels <span className="form-hint">Separate labels with commas.</span>
          <input
            value={labels}
            onChange={(event) => setLabels(event.target.value)}
          />
        </label>
        <label className="full-width">
          Preconditions
          <textarea
            value={form.precondition || ""}
            onChange={(event) =>
              setForm({ ...form, precondition: event.target.value })
            }
          />
        </label>
        {form.type === "Cucumber" ? (
          <label className="full-width">
            Gherkin feature
            <textarea
              className="studio-gherkin"
              rows={12}
              value={form.gherkin || ""}
              onChange={(event) =>
                setForm({ ...form, gherkin: event.target.value })
              }
            />
          </label>
        ) : (
          <div className="full-width">
            <h2 className="section-title">Test steps</h2>
            <div className="editor-steps">
              {form.steps.map((step, index) => (
                <div className="studio-step" key={index}>
                  <div className="studio-step-toolbar">
                    <strong>Step {index + 1}</strong>
                    <button
                      type="button"
                      className="icon-button"
                      disabled={index === 0}
                      aria-label={`Move step ${index + 1} up`}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      disabled={index === form.steps.length - 1}
                      aria-label={`Move step ${index + 1} down`}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Delete step ${index + 1}`}
                      onClick={() =>
                        setForm({
                          ...form,
                          steps: form.steps.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="step-fields">
                    <label>
                      Action
                      <textarea
                        required
                        value={step.action}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            steps: form.steps.map((item, i) =>
                              i === index
                                ? { ...item, action: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Expected result
                      <textarea
                        value={step.expected || ""}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            steps: form.steps.map((item, i) =>
                              i === index
                                ? { ...item, expected: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Test data
                      <input
                        value={step.data || ""}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            steps: form.steps.map((item, i) =>
                              i === index
                                ? { ...item, data: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="secondary-action"
              onClick={() =>
                setForm({
                  ...form,
                  steps: [...form.steps, { action: "", expected: "" }],
                })
              }
            >
              <Plus size={15} />
              Add step
            </button>
          </div>
        )}
        <div className="full-width">
          <h2 className="section-title">Linked requirements</h2>
          <div className="requirement-options">
            {requirements.map((requirement) => (
              <label className="checkbox-label" key={requirement.id}>
                <input
                  type="checkbox"
                  checked={form.linkedRequirements.includes(requirement.key)}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      linkedRequirements: event.target.checked
                        ? [...form.linkedRequirements, requirement.key]
                        : form.linkedRequirements.filter(
                            (key) => key !== requirement.key,
                          ),
                    })
                  }
                />
                <span>
                  {requirement.key} · {requirement.summary}
                </span>
              </label>
            ))}
            {requirements.length === 0 && (
              <p className="page-footnote">
                Create a requirement to establish traceability.
              </p>
            )}
          </div>
        </div>
        {canWrite && !test.archivedAt && (
          <div className="form-actions full-width">
            <button className="primary-action" disabled={busy}>
              Save test
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                setForm(test)
                setLabels(test.labels.join(", "))
              }}
            >
              Discard edits
            </button>
          </div>
        )}
      </fieldset>
      <ToastEl />
    </form>
  )
}
