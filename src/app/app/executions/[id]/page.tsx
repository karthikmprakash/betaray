"use client"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, Download, CheckCircle2 } from "lucide-react"
import { useAppData } from "@/lib/appData"
import { SelectMenu } from "@/components/app/SelectMenu"
import type { Execution, Run } from "@/lib/types"
import { downloadCsv } from "@/lib/utils"
import { useToast } from "@/components/ui/toast"

export default function ExecutionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { executions, allTests, mutate, canWrite, busy } = useAppData()
  const execution = executions.find((execution) => execution.id === id)
  const { toast, ToastEl } = useToast()
  if (!execution)
    return (
      <div className="tests-empty">
        <h1>Execution not found in this project</h1>
        <Link className="text-action" href="/app/executions">
          Back to executions
        </Link>
      </div>
    )
  const passed = execution.runs.filter((run) => run.status === "PASS").length
  const failed = execution.runs.filter((run) => run.status === "FAIL").length
  return (
    <div>
      <Link href="/app/executions" className="text-action">
        <ArrowLeft size={14} />
        Back to executions
      </Link>
      <div className="page-heading detail-page-heading">
        <div>
          <span className="test-key">
            {execution.key} · {execution.status}
          </span>
          <h1>{execution.name}</h1>
          <p>
            {execution.env || "No environment"}
            {execution.version ? ` · v${execution.version}` : ""} · {passed}{" "}
            passed · {failed} failed · {execution.runs.length - passed - failed}{" "}
            remaining
          </p>
        </div>
        <div className="detail-actions">
          <button
            className="secondary-action"
            onClick={() =>
              downloadCsv(`${execution.key}-results.csv`, [
                ["Test", "Summary", "Status", "Defects", "Comment"],
                ...execution.runs.map((run) => {
                  const test = allTests.find((test) => test.id === run.testId)
                  return [
                    test?.key || run.testId,
                    test?.summary || "",
                    run.status,
                    run.defects || "",
                    run.comment || "",
                  ]
                }),
              ])
            }
          >
            <Download size={15} />
            Export CSV
          </button>
          {canWrite && (
            <button
              className="secondary-action"
              disabled={busy}
              onClick={async () => {
                if (
                  window.confirm(
                    "Mark every test in this execution as passed? Existing results will be overwritten.",
                  )
                ) {
                  if (
                    await mutate("execution.update", {
                      id: execution.id,
                      revision: execution.revision,
                      bulkPass: true,
                    })
                  )
                    toast("All test runs marked as passed")
                }
              }}
            >
              <CheckCircle2 size={15} />
              Bulk pass
            </button>
          )}
        </div>
      </div>
      <div className="execution-run-list">
        {execution.runs.map((run) => (
          <RunEditor
            key={`${run.testId}-${run.executedAt || "not-run"}`}
            run={run}
            execution={execution}
          />
        ))}
        {execution.runs.length === 0 && (
          <p className="section-empty">This execution has no test runs.</p>
        )}
      </div>
      <ExecutionNotes
        key={`notes-${execution.id}-${execution.notes || ""}`}
        execution={execution}
      />
      <ToastEl />
    </div>
  )
}
function RunEditor({ run, execution }: { run: Run; execution: Execution }) {
  const { allTests, updateRun, canWrite, busy } = useAppData()
  const test = allTests.find((test) => test.id === run.testId)
  const [form, setForm] = useState({
    status: run.status,
    comment: run.comment || "",
    defects: run.defects || "",
  })
  const [showSteps, setShowSteps] = useState(false)
  const { toast, ToastEl } = useToast()
  return (
    <section className="run-editor">
      <div className="section-heading">
        <div>
          <span className="test-key">
            {test?.key}
            {test?.archivedAt ? " · Archived test" : ""}
          </span>
          <h2>
            {test ? (
              <Link href={`/app/tests/${test.id}`}>{test.summary}</Link>
            ) : (
              "Test unavailable"
            )}
          </h2>
        </div>
        <span
          className={`type-label ${run.status === "FAIL" ? "result-danger" : run.status === "PASS" ? "result-success" : ""}`}
        >
          {run.status}
        </span>
      </div>
      <button
        className="text-action"
        aria-expanded={showSteps}
        onClick={() => setShowSteps(!showSteps)}
      >
        {showSteps ? "Hide steps" : "Show test steps"}
      </button>
      {showSteps && (
        <div className="run-step-reference">
          {test?.gherkin ? (
            <pre>{test.gherkin}</pre>
          ) : (
            test?.steps.map((step, index) => (
              <div key={index}>
                <strong>
                  {index + 1}. {step.action}
                </strong>
                <p>Expected: {step.expected || "Not specified"}</p>
                {step.data && <p>Data: {step.data}</p>}
              </div>
            ))
          )}
        </div>
      )}
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          if (await updateRun(execution.id, run.testId, form))
            toast("Test run saved")
        }}
      >
        <fieldset className="run-editor-fields" disabled={!canWrite || busy}>
          <label>
            Status
            <SelectMenu
              value={form.status}
              options={["TODO", "EXECUTING", "PASS", "FAIL", "BLOCKED", "ABORTED"].map(
                (status) => ({ value: status, label: status }),
              )}
              onChange={(status) => setForm({ ...form, status })}
            />
          </label>
          <label>
            Linked defect keys
            <input
              value={form.defects}
              placeholder="e.g. BET-102"
              onChange={(event) =>
                setForm({ ...form, defects: event.target.value })
              }
            />
          </label>
          <label className="full-width">
            Result notes / evidence URL
            <textarea
              value={form.comment}
              placeholder="Record observed behavior and links to evidence."
              onChange={(event) =>
                setForm({ ...form, comment: event.target.value })
              }
            />
          </label>
          {canWrite && (
            <button className="primary-action" disabled={busy}>
              Save result
            </button>
          )}
        </fieldset>
      </form>
      <ToastEl />
    </section>
  )
}
function ExecutionNotes({ execution }: { execution: Execution }) {
  const { mutate, canWrite, busy } = useAppData()
  const [notes, setNotes] = useState(execution.notes || "")
  const { toast, ToastEl } = useToast()
  return (
    <form
      className="test-create-form platform-section"
      onSubmit={async (event) => {
        event.preventDefault()
        if (
          await mutate("execution.update", {
            id: execution.id,
            revision: execution.revision,
            notes,
          })
        )
          toast("Execution notes saved")
      }}
    >
      <div className="form-grid">
        <label className="full-width">
          Execution notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={!canWrite || busy}
          />
        </label>
      </div>
      {canWrite && (
        <div className="form-actions">
          <button className="primary-action" disabled={busy}>
            Save notes
          </button>
        </div>
      )}
      <ToastEl />
    </form>
  )
}
