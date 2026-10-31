"use client"
import { useState } from "react"
import { Plus, Pencil, Archive, RotateCcw } from "lucide-react"
import { useAppData } from "@/lib/appData"
import { SelectMenu } from "@/components/app/SelectMenu"
import type { Environment, Release } from "@/lib/types"
import { useToast } from "@/components/ui/toast"

const empty = { name: "", description: "", baseUrl: "", region: "" }
export default function EnvironmentsPage() {
  const { environments, versions, executions, mutate, canAdmin, busy } =
    useAppData()
  const { toast, ToastEl } = useToast()
  const [editing, setEditing] = useState<string | null>(null)
  const [show, setShow] = useState(false)
  const [form, setForm] = useState(empty)
  const [showArchived, setShowArchived] = useState(false)
  const [version, setVersion] = useState({
    id: "",
    name: "",
    status: "Planned",
    description: "",
  })
  const [showVersion, setShowVersion] = useState(false)
  function edit(environment: Environment) {
    setEditing(environment.id)
    setForm({
      name: environment.name,
      description: environment.description || "",
      baseUrl: environment.baseUrl || "",
      region: environment.region || "",
    })
    setShow(true)
  }
  function editVersion(release: Release) {
    setVersion({
      id: release.id,
      name: release.name,
      status: release.status,
      description: release.description || "",
    })
    setShowVersion(true)
  }
  const rows = environments.filter((environment) =>
    showArchived ? !!environment.archivedAt : !environment.archivedAt,
  )
  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Environments & versions</h1>
          <p>
            Configure where tests run and the release each execution validates.
          </p>
        </div>
        {canAdmin && (
          <button
            className="primary-action"
            disabled={busy}
            onClick={() => {
              setEditing(null)
              setForm(empty)
              setShow(!show)
            }}
            aria-expanded={show}
            aria-controls="environment-form"
          >
            <Plus size={16} />
            {show ? "Close form" : "New Environment"}
          </button>
        )}
      </div>
      {show && (
        <form
          id="environment-form"
          className="test-create-form"
          onSubmit={async (event) => {
            event.preventDefault()
            const saved = await mutate("environment.save", {
              ...form,
              id: editing || undefined,
            })
            if (saved) {
              setShow(false)
              setForm(empty)
              toast(editing ? "Environment updated" : "Environment created")
            }
          }}
        >
          <h2>{editing ? "Edit environment" : "New environment"}</h2>
          <div className="form-grid">
            <label>
              Name
              <input
                autoFocus
                required
                maxLength={200}
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="e.g. Pre-production"
              />
            </label>
            <label>
              Region or location
              <input
                maxLength={150}
                value={form.region}
                onChange={(event) =>
                  setForm({ ...form, region: event.target.value })
                }
                placeholder="e.g. eu-west-1"
              />
            </label>
            <label className="full-width">
              Base URL
              <input
                type="url"
                value={form.baseUrl}
                onChange={(event) =>
                  setForm({ ...form, baseUrl: event.target.value })
                }
                placeholder="https://staging.example.com"
              />
            </label>
            <label className="full-width">
              Description
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                maxLength={2000}
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary-action" disabled={busy}>
              Save environment
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
      <div className="test-toolbar">
        <h2 className="section-title">Project environments</h2>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
          />
          Show archived
        </label>
      </div>
      <div className="environment-grid">
        {rows.map((environment) => (
          <section className="environment-panel" key={environment.id}>
            <div className="section-heading">
              <h2>{environment.name}</h2>
              {canAdmin && (
                <button
                  className="icon-button"
                  aria-label={`Edit ${environment.name}`}
                  onClick={() => edit(environment)}
                >
                  <Pencil size={16} />
                </button>
              )}
            </div>
            <p>{environment.description || "No description added."}</p>
            <dl className="metadata-list">
              <div>
                <dt>Location</dt>
                <dd>{environment.region || "Not specified"}</dd>
              </div>
              <div>
                <dt>Base URL</dt>
                <dd className="break-anywhere">
                  {environment.baseUrl || "Not specified"}
                </dd>
              </div>
              <div>
                <dt>Executions</dt>
                <dd>
                  {
                    executions.filter(
                      (execution) => execution.env === environment.name,
                    ).length
                  }
                </dd>
              </div>
            </dl>
            {canAdmin && (
              <button
                className="text-action"
                disabled={busy}
                onClick={async () => {
                  if (
                    await mutate("environment.archive", {
                      id: environment.id,
                      archived: !environment.archivedAt,
                    })
                  )
                    toast(
                      environment.archivedAt
                        ? "Environment restored"
                        : "Environment archived; past executions are preserved",
                    )
                }}
              >
                {environment.archivedAt ? (
                  <RotateCcw size={14} />
                ) : (
                  <Archive size={14} />
                )}
                {environment.archivedAt ? "Restore" : "Archive"}
              </button>
            )}
          </section>
        ))}
      </div>
      {rows.length === 0 && (
        <div className="tests-empty">
          <h2>
            {showArchived
              ? "No archived environments"
              : "No environments configured"}
          </h2>
          <p>
            {canAdmin
              ? "Create an environment before starting an execution."
              : "Ask an administrator to configure the environments for this project."}
          </p>
        </div>
      )}
      <section className="platform-section">
        <div className="section-heading">
          <div>
            <h2>Release versions</h2>
            <p>Track planned, active, and released versions.</p>
          </div>
          {canAdmin && (
            <button
              className="secondary-action"
              onClick={() => {
                setVersion({
                  id: "",
                  name: "",
                  status: "Planned",
                  description: "",
                })
                setShowVersion(!showVersion)
              }}
            >
              New version
            </button>
          )}
        </div>
        {showVersion && (
          <form
            className="test-create-form"
            onSubmit={async (event) => {
              event.preventDefault()
              if (
                await mutate("version.save", {
                  ...version,
                  id: version.id || undefined,
                })
              ) {
                setShowVersion(false)
                toast("Version saved")
              }
            }}
          >
            <div className="form-grid">
              <label>
                Version name
                <input
                  required
                  value={version.name}
                  onChange={(event) =>
                    setVersion({ ...version, name: event.target.value })
                  }
                  placeholder="1.5.0"
                />
              </label>
              <label>
                Status
                <SelectMenu
                  value={version.status}
                  options={["Planned", "In Progress", "Released"].map((value) => ({
                    value,
                    label: value,
                  }))}
                  onChange={(status) => setVersion({ ...version, status })}
                />
              </label>
              <label className="full-width">
                Description
                <input
                  value={version.description}
                  onChange={(event) =>
                    setVersion({ ...version, description: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="form-actions">
              <button className="primary-action" disabled={busy}>
                Save version
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={() => setShowVersion(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        <div className="version-list">
          {versions.map((release) => (
            <div key={release.id}>
              <strong>{release.name}</strong>
              <span>{release.description}</span>
              <span className="type-label">{release.status}</span>
              {canAdmin && (
                <button
                  className="icon-button"
                  aria-label={`Edit version ${release.name}`}
                  onClick={() => editVersion(release)}
                >
                  <Pencil size={15} />
                </button>
              )}
            </div>
          ))}
          {versions.length === 0 && (
            <p className="page-footnote">No release versions added yet.</p>
          )}
        </div>
      </section>
      <ToastEl />
    </div>
  )
}
