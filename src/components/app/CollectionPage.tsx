"use client"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Copy, Download, Play } from "lucide-react"
import { useAppData } from "@/lib/appData"
import { SelectMenu } from "@/components/app/SelectMenu"
import type { Collection } from "@/lib/types"
import { downloadCsv } from "@/lib/utils"
import { useToast } from "@/components/ui/toast"

export function CollectionPage({ kind }: { kind: "set" | "plan" }) {
  const {
    sets,
    plans,
    allTests,
    tests,
    envs,
    mutate,
    createExecution,
    canWrite,
    busy,
  } = useAppData()
  const router = useRouter()
  const { toast, ToastEl } = useToast()
  const collections = kind === "set" ? sets : plans
  const [query, setQuery] = useState("")
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({
    id: "",
    name: "",
    testIds: [] as string[],
  })
  const [run, setRun] = useState<Collection | null>(null)
  const [runName, setRunName] = useState("")
  const [env, setEnv] = useState(envs[0] || "")
  const [version, setVersion] = useState("")
  function edit(collection: Collection) {
    setForm({
      id: collection.id,
      name: collection.name,
      testIds: collection.testIds,
    })
    setShow(true)
  }
  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Test {kind === "set" ? "sets" : "plans"}</h1>
          <p>
            {kind === "set"
              ? "Organize reusable collections of tests across executions."
              : "Define the tests for a release and track its linked executions."}
          </p>
        </div>
        {canWrite && (
          <button
            className="primary-action"
            onClick={() => {
              setForm({ id: "", name: "", testIds: [] })
              setShow(!show)
            }}
          >
            <Plus size={16} />
            Create {kind}
          </button>
        )}
      </div>
      {show && (
        <form
          className="test-create-form"
          onSubmit={async (event) => {
            event.preventDefault()
            if (
              await mutate("collection.save", {
                ...form,
                id: form.id || undefined,
                kind,
              })
            ) {
              setShow(false)
              toast(`Test ${kind} saved`)
            }
          }}
        >
          <h2>
            {form.id ? "Edit" : "Create"} test {kind}
          </h2>
          <div className="form-grid">
            <label className="full-width">
              Name
              <input
                required
                value={form.name}
                maxLength={200}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </label>
          </div>
          <fieldset className="execution-test-selector">
            <legend>Included tests · {form.testIds.length} selected</legend>
            <div className="execution-test-options">
              {allTests.map((test) => (
                <label key={test.id}>
                  <input
                    type="checkbox"
                    checked={form.testIds.includes(test.id)}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        testIds: event.target.checked
                          ? [...form.testIds, test.id]
                          : form.testIds.filter((id) => id !== test.id),
                      })
                    }
                  />
                  <span className="test-key">{test.key}</span>
                  <span>
                    {test.summary}
                    {test.archivedAt ? " (archived)" : ""}
                  </span>
                </label>
              ))}
              {allTests.length === 0 && (
                <p className="section-empty">
                  Create tests in the library first.
                </p>
              )}
            </div>
          </fieldset>
          <div className="form-actions">
            <button className="primary-action" disabled={busy}>
              Save {kind}
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={() => setShow(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {run && (
        <form
          className="test-create-form"
          onSubmit={async (event) => {
            event.preventDefault()
            const ids = run.testIds.filter((id) =>
              tests.some((test) => test.id === id),
            )
            const result = await createExecution(runName, ids, {
              env: envs.includes(env) ? env : envs[0] || "",
              version,
              planId: kind === "plan" ? run.id : undefined,
            })
            if (result) router.push(`/app/executions/${result.id}`)
          }}
        >
          <h2>Create execution from {run.name}</h2>
          <div className="form-grid">
            <label className="full-width">
              Execution name
              <input
                required
                value={runName}
                onChange={(event) => setRunName(event.target.value)}
              />
            </label>
            <label>
              Environment
              <SelectMenu
                value={env}
                placeholder="Select an environment"
                options={envs.map((name) => ({ value: name, label: name }))}
                onChange={setEnv}
              />
            </label>
            <label>
              Release version
              <input
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>
          {envs.length === 0 && (
            <p className="form-error">
              Configure an environment in{" "}
              <Link href="/app/environments" className="text-action">
                Environments
              </Link>{" "}
              first.
            </p>
          )}
          <p className="form-hint">
            Only active tests are included in the new execution.
          </p>
          <div className="form-actions">
            <button
              className="primary-action"
              disabled={
                busy ||
                envs.length === 0 ||
                !run.testIds.some((id) => tests.some((test) => test.id === id))
              }
            >
              Create execution
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={() => setRun(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="test-toolbar">
        <div className="test-search">
          <input
            aria-label={`Search test ${kind}s`}
            placeholder={`Search test ${kind}s…`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <span className="test-count">
          {collections.length} {kind}s
        </span>
      </div>
      <div className="collection-list">
        {collections
          .filter((collection) =>
            `${collection.key} ${collection.name}`
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((collection) => (
            <section key={collection.id} className="collection-panel">
              <div className="section-heading">
                <div>
                  <span className="test-key">{collection.key}</span>
                  <h2>{collection.name}</h2>
                </div>
                <div className="detail-actions">
                  {canWrite && (
                    <>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${collection.name}`}
                        onClick={() => edit(collection)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button"
                        disabled={busy}
                        aria-label={`Clone ${collection.name}`}
                        onClick={async () => {
                          if (
                            await mutate("collection.clone", {
                              kind,
                              name: `${collection.name.slice(0, 190)} (copy)`,
                              testIds: collection.testIds,
                            })
                          )
                            toast("Collection cloned")
                        }}
                      >
                        <Copy size={16} />
                      </button>
                    </>
                  )}
                  <button
                    className="icon-button"
                    aria-label={`Export ${collection.name}`}
                    onClick={() =>
                      downloadCsv(`${collection.key}.csv`, [
                        ["Key", "Summary", "Type", "Priority"],
                        ...collection.testIds.map((id) => {
                          const test = allTests.find((test) => test.id === id)
                          return [
                            test?.key || id,
                            test?.summary || "",
                            test?.type || "",
                            test?.priority || "",
                          ]
                        }),
                      ])
                    }
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
              <div className="collection-tests">
                {collection.testIds.map((id) => {
                  const test = allTests.find((test) => test.id === id)
                  return test ? (
                    <Link key={id} href={`/app/tests/${test.id}`}>
                      <span className="test-key">{test.key}</span>
                      <span>
                        {test.summary}
                        {test.archivedAt ? " · Archived" : ""}
                      </span>
                    </Link>
                  ) : null
                })}
                {collection.testIds.length === 0 && (
                  <p className="page-footnote">
                    No tests added. Edit this {kind} to select tests.
                  </p>
                )}
              </div>
              <div className="collection-footer">
                <span>
                  {collection.testIds.length} tests
                  {kind === "plan"
                    ? ` · ${collection.executionIds?.length || 0} linked executions`
                    : ""}
                </span>
                {canWrite && (
                  <button
                    className="secondary-action"
                    disabled={
                      !collection.testIds.some((id) =>
                        tests.some((test) => test.id === id),
                      )
                    }
                    onClick={() => {
                      setRun(collection)
                      setRunName(`${collection.name} run`)
                      setEnv(envs[0] || "")
                    }}
                  >
                    <Play size={14} />
                    Create execution
                  </button>
                )}
              </div>
              {kind === "plan" && !!collection.executionIds?.length && (
                <div className="requirement-links">
                  {collection.executionIds.map((id) => (
                    <Link
                      key={id}
                      href={`/app/executions/${id}`}
                      className="text-action"
                    >
                      View execution
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
      </div>
      {collections.length === 0 && (
        <div className="tests-empty">
          <h2>No test {kind}s yet</h2>
          <p>
            Create a named collection, then select the tests it should contain.
          </p>
        </div>
      )}
      <ToastEl />
    </div>
  )
}
