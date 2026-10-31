"use client"
import Link from "next/link"
import { useRef, useState } from "react"
import {
  CheckCircle2,
  Download,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
} from "lucide-react"
import { useAppData } from "@/lib/appData"
import { SelectMenu } from "@/components/app/SelectMenu"
import { downloadText } from "@/lib/utils"
import type { Draft, DraftPayload } from "@/lib/types"

const templates = {
  Checkout:
    "As a customer, I can complete checkout with a saved payment method.\nAcceptance criteria:\n- A valid payment creates one order and shows an order number.\n- A declined payment shows an actionable error and preserves the cart.\n- Retrying after a network timeout must not create a duplicate order.",
  "API CRUD":
    "As an authorized API user, I can create and update a resource.\nAcceptance criteria:\n- A valid create returns the new resource identifier.\n- Invalid input is rejected with a field-level error.\n- A user from another organization cannot read or update the resource.",
  "Sign-in":
    "As an organization member, I can sign in to access my assigned workspaces.\nAcceptance criteria:\n- Valid credentials open the workspace.\n- Invalid credentials show an error without exposing account existence.\n- An expired session requires signing in again.",
}
export default function AIStudioPage() {
  const { requirements, drafts, mutate, aiConfigured, canWrite, busy } =
    useAppData()
  const [source, setSource] = useState("")
  const [requirementKey, setRequirementKey] = useState("")
  const [type, setType] = useState("Manual")
  const [mode, setMode] = useState("template")
  const [generating, setGenerating] = useState(false)
  const [selectedId, setSelectedId] = useState("")
  const [payload, setPayload] = useState<DraftPayload | null>(null)
  const [reviewed, setReviewed] = useState(false)
  const [approvedId, setApprovedId] = useState("")
  const reviewHeading = useRef<HTMLHeadingElement>(null)
  const selected = drafts.find((draft) => draft.id === selectedId)
  function selectDraft(draft: Draft) {
    setSelectedId(draft.id)
    setPayload(draft.payload)
    setSource(draft.source)
    setType(draft.type)
    setMode(draft.mode)
    setRequirementKey(draft.requirementKey || "")
    setReviewed(!!draft.approvedTestId)
    setApprovedId(draft.approvedTestId || "")
    requestAnimationFrame(() => reviewHeading.current?.focus())
  }
  function edit(next: DraftPayload) {
    setPayload(next)
    setReviewed(false)
  }
  function reorder(index: number, direction: number) {
    if (!payload) return
    const steps = [...payload.steps]
    ;[steps[index], steps[index + direction]] = [
      steps[index + direction],
      steps[index],
    ]
    edit({ ...payload, steps })
  }

  return (
    <div className="ai-studio">
      <div className="page-heading">
        <div>
          <h1>AI Studio</h1>
          <p>
            Draft tests from requirements, review the result, and approve it
            into the project library.
          </p>
        </div>
        <span className="type-label">
          {aiConfigured ? "AI provider configured" : "Template mode available"}
        </span>
      </div>
      <div className="ai-workbench">
        <section className="studio-panel" aria-labelledby="draft-input-heading">
          <div className="section-heading">
            <h2 id="draft-input-heading">Requirement</h2>
          </div>
          <form
            onSubmit={async (event) => {
              event.preventDefault()
              setGenerating(true)
              try {
                const draft = await mutate<{ id: string; payload: string }>(
                  "draft.generate",
                  {
                    source,
                    type,
                    mode,
                    requirementKey: requirementKey || undefined,
                  },
                )
                if (draft) {
                  setSelectedId(draft.id)
                  setPayload(JSON.parse(draft.payload))
                  setReviewed(false)
                  setApprovedId("")
                  requestAnimationFrame(() => reviewHeading.current?.focus())
                }
              } finally {
                setGenerating(false)
              }
            }}
          >
            <fieldset disabled={!canWrite || generating} className="form-grid">
              <label className="full-width">
                Link a requirement
                <SelectMenu
                  value={requirementKey}
                  options={[
                    { value: "", label: "No linked requirement" },
                    ...requirements.map((requirement) => ({
                      value: requirement.key,
                      label: `${requirement.key} · ${requirement.summary}`,
                    })),
                  ]}
                  onChange={(next) => {
                    setRequirementKey(next)
                    const requirement = requirements.find(
                      (item) => item.key === next,
                    )
                    if (requirement) setSource(requirement.summary)
                  }}
                />
              </label>
              <label className="full-width" htmlFor="studio-source">
                User story & acceptance criteria
                <textarea
                  id="studio-source"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  minLength={20}
                  maxLength={12000}
                  required
                  rows={9}
                  placeholder="Describe the intended behavior, observable outcomes, and error cases."
                />
                <span className="form-hint">
                  {source.length.toLocaleString()} / 12,000 characters
                </span>
              </label>
              <label>
                Test type
                <SelectMenu
                  value={type}
                  options={["Manual", "Cucumber", "Generic"].map((value) => ({
                    value,
                    label: value,
                  }))}
                  onChange={setType}
                />
              </label>
              <label>
                Generation mode
                <SelectMenu
                  value={mode}
                  options={[
                    { value: "template", label: "Template scaffold" },
                    {
                      value: "openai",
                      label: `AI provider${!aiConfigured ? " (not configured)" : ""}`,
                      disabled: !aiConfigured,
                    },
                  ]}
                  onChange={setMode}
                />
              </label>
              <p className="form-hint full-width">
                {mode === "template"
                  ? "Template mode creates an editable scaffold from your text. It does not call an AI model."
                  : "The requirement text will be sent to the configured OpenAI model. Remove secrets and personal information before generating."}
              </p>
              <button
                className="primary-action full-width"
                disabled={busy || !canWrite || source.trim().length < 20}
              >
                {generating
                  ? "Generating draft…"
                  : mode === "template"
                    ? "Create template draft"
                    : "Generate AI draft"}
              </button>
            </fieldset>
          </form>
          <div className="studio-templates">
            <span>Start from a template</span>
            {Object.entries(templates).map(([name, text]) => (
              <button
                key={name}
                className="secondary-action"
                disabled={generating}
                onClick={() => {
                  setSource(text)
                  setRequirementKey("")
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </section>
        <section
          className="studio-panel"
          aria-labelledby="draft-review-heading"
          aria-busy={generating}
        >
          <div className="section-heading">
            <div>
              <h2 id="draft-review-heading" ref={reviewHeading} tabIndex={-1}>
                Review draft
              </h2>
              <p>
                {selected
                  ? `${selected.type} · ${selected.mode === "template" ? "Template scaffold" : "AI-generated"}`
                  : "Review and edit before creating a test."}
              </p>
            </div>
            {selected && payload && (
              <button
                className="icon-button"
                aria-label="Download draft JSON"
                onClick={() =>
                  downloadText(
                    `test-draft-${selected.id}.json`,
                    JSON.stringify(payload, null, 2),
                    "application/json",
                  )
                }
              >
                <Download size={17} />
              </button>
            )}
          </div>
          {generating ? (
            <div className="studio-empty" role="status">
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <p>Preparing a draft for review…</p>
            </div>
          ) : !selected || !payload ? (
            <div className="studio-empty">
              <h3>No draft selected</h3>
              <p>
                Enter a requirement and create a draft, or reopen one from the
                project’s history below.
              </p>
            </div>
          ) : (
            <div className="studio-review">
              {approvedId || selected.approvedTestId ? (
                <div className="studio-approved">
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>Approved by {selected.approvedBy || "you"}</strong>
                    <p>This draft has been saved as a test.</p>
                    <Link
                      className="text-action"
                      href={`/app/tests/${approvedId || selected.approvedTestId}`}
                    >
                      Open approved test
                    </Link>
                  </div>
                </div>
              ) : null}
              <fieldset
                disabled={
                  !!(approvedId || selected.approvedTestId) || !canWrite || busy
                }
                className="studio-review-fields"
              >
                <label>
                  Test summary
                  <input
                    value={payload.summary}
                    maxLength={200}
                    onChange={(event) =>
                      edit({ ...payload, summary: event.target.value })
                    }
                  />
                </label>
                {selected.type === "Cucumber" ? (
                  <label>
                    Gherkin scenario
                    <textarea
                      className="studio-gherkin"
                      value={payload.gherkin}
                      onChange={(event) =>
                        edit({ ...payload, gherkin: event.target.value })
                      }
                      rows={14}
                    />
                  </label>
                ) : (
                  <>
                    <div className="studio-steps">
                      {payload.steps.map((step, index) => (
                        <div className="studio-step" key={index}>
                          <div className="studio-step-toolbar">
                            <strong>Step {index + 1}</strong>
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={`Move step ${index + 1} up`}
                              disabled={index === 0}
                              onClick={() => reorder(index, -1)}
                            >
                              <ArrowUp size={15} />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={`Move step ${index + 1} down`}
                              disabled={index === payload.steps.length - 1}
                              onClick={() => reorder(index, 1)}
                            >
                              <ArrowDown size={15} />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={`Remove step ${index + 1}`}
                              onClick={() =>
                                edit({
                                  ...payload,
                                  steps: payload.steps.filter(
                                    (_, i) => i !== index,
                                  ),
                                })
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <label>
                            Action
                            <textarea
                              rows={2}
                              value={step.action}
                              onChange={(event) =>
                                edit({
                                  ...payload,
                                  steps: payload.steps.map((item, i) =>
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
                              rows={2}
                              value={step.expected || ""}
                              onChange={(event) =>
                                edit({
                                  ...payload,
                                  steps: payload.steps.map((item, i) =>
                                    i === index
                                      ? {
                                          ...item,
                                          expected: event.target.value,
                                        }
                                      : item,
                                  ),
                                })
                              }
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() =>
                        edit({
                          ...payload,
                          steps: [
                            ...payload.steps,
                            { action: "", expected: "" },
                          ],
                        })
                      }
                    >
                      <Plus size={15} />
                      Add step
                    </button>
                  </>
                )}
                {!(approvedId || selected.approvedTestId) && (
                  <>
                    {selected.mode === "template" && (
                      <p className="form-hint">
                        Replace scaffold placeholders with specific actions and
                        expected results before approval.
                      </p>
                    )}
                    <label className="checkbox-label studio-approval">
                      <input
                        type="checkbox"
                        checked={reviewed}
                        onChange={(event) => setReviewed(event.target.checked)}
                      />
                      I reviewed this draft for accuracy and completeness.
                    </label>
                    <button
                      className="primary-action"
                      disabled={
                        !reviewed ||
                        !payload.summary.trim() ||
                        busy ||
                        (selected.type !== "Cucumber" &&
                          (!payload.steps.length ||
                            payload.steps.some(
                              (step) =>
                                !step.action.trim() ||
                                !step.expected?.trim() ||
                                step.expected.startsWith(
                                  "Define the expected result",
                                ),
                            ))) ||
                        (selected.type === "Cucumber" &&
                          (!payload.gherkin.trim() ||
                            payload.gherkin.includes("# Review this scaffold")))
                      }
                      onClick={async () => {
                        const result = await mutate<{ id: string }>(
                          "draft.approve",
                          { id: selected.id, payload, reviewed },
                        )
                        if (result) setApprovedId(result.id)
                      }}
                    >
                      Approve & create test
                    </button>
                  </>
                )}
              </fieldset>
            </div>
          )}
        </section>
      </div>
      <section className="platform-section">
        <div className="section-heading">
          <div>
            <h2>Project draft history</h2>
            <p>Saved drafts include their source, mode, and approval status.</p>
          </div>
        </div>
        <div className="draft-history">
          {drafts.map((draft) => (
            <button
              key={draft.id}
              className="draft-history-row"
              onClick={() => selectDraft(draft)}
              aria-pressed={selectedId === draft.id}
            >
              <span>
                <strong>{draft.payload.summary}</strong>
                <span>
                  {draft.type} · {draft.mode === "template" ? "Template" : "AI"}{" "}
                  · {new Date(draft.createdAt).toLocaleString()}
                </span>
              </span>
              <span className="type-label">
                {draft.approvedTestId ? "Approved" : "Draft"}
              </span>
            </button>
          ))}
          {drafts.length === 0 && (
            <p className="page-footnote">No drafts in this project yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}
