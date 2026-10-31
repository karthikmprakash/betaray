"use client"
import { useEffect, useState } from "react"
import { Copy, Plus, KeyRound, Plug, RefreshCw, ExternalLink } from "lucide-react"
import { useAppData } from "@/lib/appData"
import { SelectMenu } from "@/components/app/SelectMenu"
import { useToast } from "@/components/ui/toast"

type JiraProject = { id: string; key: string; name: string }
type JiraConnectionView = {
  id: string
  siteName: string | null
  siteUrl: string
  status: string
  jiraProjectKey: string | null
  jiraProjectName: string | null
  defaultIssueType: string
  lastSyncedAt: string | null
  lastSyncError: string | null
  webhookRegistered: boolean
}
type JiraView = { configured: boolean; connection: JiraConnectionView | null }

const JIRA_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Authorization was cancelled. Nothing was connected.",
  connection_failed: "The Jira connection could not be completed. Try again.",
  missing_code: "Jira did not return an authorization code. Try again.",
  missing_refresh_token:
    "Jira did not return a refresh token. Reconnect and grant offline access.",
  no_accessible_jira_site:
    "No Jira Cloud site is available to this account. Check the site permissions and try again.",
  state_user_mismatch: "This Jira connection belongs to another session. Start again.",
}
function jiraErrorMessage(code: string) {
  return JIRA_ERROR_MESSAGES[code] || `Jira connection failed (${code}).`
}

export default function IntegrationsPage() {
  const { tokens, project, executions, allTests, mutate, canAdmin, busy } =
    useAppData()
  const { toast, ToastEl } = useToast()
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ name: "", scope: "read", days: 30 })
  const [secret, setSecret] = useState("")
  const [jira, setJira] = useState<JiraView | null>(null)
  const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([])
  const [jiraProjectKey, setJiraProjectKey] = useState("")
  const [jiraBusy, setJiraBusy] = useState(true)
  const [jiraError, setJiraError] = useState("")
  const [origin, setOrigin] = useState("")
  const base = origin || "https://YOUR_BETARAY_HOST"
  const execution = executions[0]
  const test = allTests.find((test) =>
    execution?.runs.some((run) => run.testId === test.id),
  )
  const example = `curl --request POST '${base}/api/v2/import/execution' \\\n  --header "Authorization: Bearer $BETARAY_TOKEN" \\\n  --header 'Content-Type: application/json' \\\n  --data '${JSON.stringify({ projectId: project?.id || "PROJECT_ID", testExecutionKey: execution?.key || "EXECUTION_KEY", tests: [{ testKey: test?.key || "TEST_KEY", status: "PASS", comment: "CI result" }] })}'`
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast("Copied")
    } catch {
      toast("Copy is unavailable. Select the text and copy it manually.")
    }
  }

  async function loadJira() {
    if (!project?.id) return
    try {
      const response = await fetch(
        `/api/integrations/jira?projectId=${encodeURIComponent(project.id)}`,
        { cache: "no-store" },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not load Jira.")
      setJira(data)
      setJiraProjectKey(data.connection?.jiraProjectKey || "")
      if (canAdmin && data.connection) {
        const projects = await fetch(
          `/api/integrations/jira/projects?projectId=${encodeURIComponent(project.id)}`,
          { cache: "no-store" },
        )
        if (!projects.ok) {
          const payload = await projects.json().catch(() => ({}))
          throw new Error(payload.error || "Could not load Jira projects.")
        }
        const payload = await projects.json()
        setJiraProjects(payload.projects || [])
      }
    } catch (error) {
      setJiraError(error instanceof Error ? error.message : "Could not load Jira.")
    } finally {
      setJiraBusy(false)
    }
  }

  useEffect(() => {
    // Load Jira state for the selected project from the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadJira()
  }, [project?.id])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const state = params.get("jira")
    if (state === "connected") {
      toast("Jira connected. Choose a Jira project to finish setup.")
      window.history.replaceState({}, "", "/app/integrations")
    } else if (state === "error") {
      toast(jiraErrorMessage(params.get("message") || "connection_failed"))
      window.history.replaceState({}, "", "/app/integrations")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function connectJira() {
    if (!project?.id) return
    // The authorize route redirects to Atlassian, so this must be a full navigation.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(
      `/api/integrations/jira/authorize?projectId=${encodeURIComponent(project.id)}`,
    )
  }

  async function configureJira() {
    if (!project?.id || !jiraProjectKey) {
      setJiraError("Choose a Jira project first.")
      return
    }
    setJiraBusy(true)
    setJiraError("")
    try {
      const response = await fetch("/api/integrations/jira/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, jiraProjectKey }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not map that Jira project.")
      toast(
        data.webhookRegistered
          ? "Jira project mapped. Webhook is active."
          : "Jira project mapped. Use Sync now until webhooks are available.",
      )
      await loadJira()
    } catch (error) {
      setJiraError(error instanceof Error ? error.message : "Could not map that Jira project.")
    } finally {
      setJiraBusy(false)
    }
  }

  async function syncJira() {
    if (!project?.id) return
    setJiraBusy(true)
    setJiraError("")
    try {
      const response = await fetch("/api/integrations/jira/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Jira sync failed.")
      toast(
        `Jira sync complete: ${data.imported} imported, ${data.updated} updated${data.failed ? `, ${data.failed} failed` : ""}.`,
      )
      await loadJira()
    } catch (error) {
      setJiraError(error instanceof Error ? error.message : "Jira sync failed.")
    } finally {
      setJiraBusy(false)
    }
  }

  async function disconnectJira() {
    if (!project?.id) return
    if (!window.confirm("Disconnect this Jira site? Existing imported requirements remain.")) return
    setJiraBusy(true)
    setJiraError("")
    try {
      const response = await fetch(
        `/api/integrations/jira?projectId=${encodeURIComponent(project.id)}`,
        { method: "DELETE" },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not disconnect Jira.")
      toast("Jira disconnected")
      await loadJira()
    } catch (error) {
      setJiraError(error instanceof Error ? error.message : "Could not disconnect Jira.")
    } finally {
      setJiraBusy(false)
    }
  }
  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Integrations & API</h1>
          <p>Connect CI jobs to a project using scoped, expiring API tokens.</p>
        </div>
        {canAdmin && (
          <button
            className="primary-action"
            onClick={() => {
              setShow(!show)
              setSecret("")
            }}
          >
            <Plus size={15} />
            Create API token
          </button>
        )}
      </div>
      {!canAdmin && (
        <p className="permission-notice">
          An administrator must create and revoke project tokens.
        </p>
      )}
      <section className="jira-section" aria-labelledby="jira-heading">
        <div className="section-heading">
          <div>
            <h2 id="jira-heading" className="section-title">
              <Plug size={16} aria-hidden="true" />
              Jira Cloud
            </h2>
            <p>
              Import Jira issues into Requirements and keep their status,
              priority and issue type aligned.
            </p>
          </div>
          <span
            className={`jira-status ${
              jira?.connection ? "is-connected" : ""
            }`}
          >
            {!jira ? "Checking…" : jira.connection ? "Connected" : "Not connected"}
          </span>
        </div>
        {jiraError && (
          <p className="form-error" role="alert">
            {jiraError}
          </p>
        )}
        {jira && !jira.configured && (
          <div className="permission-notice">
            Jira OAuth is not configured on this server. Add{" "}
            <code>JIRA_CLIENT_ID</code>,{" "}
            <code>JIRA_CLIENT_SECRET</code> and{" "}
            <code>JIRA_TOKEN_KEY</code> to the server environment, then restart
            the server. Use{" "}
            <code>/api/integrations/jira/callback</code> as the callback URL.
          </div>
        )}
        {!jira?.connection ? (
          <div className="jira-empty">
            <div>
              <strong>Sync Jira issues into requirements</strong>
              <p>
                Connect a Jira Cloud site, choose a project, then import its
                issues. Existing test links stay intact.
              </p>
            </div>
            <button
              className="primary-action"
              disabled={!canAdmin || !jira?.configured || jiraBusy}
              onClick={connectJira}
            >
              <Plug size={15} aria-hidden="true" />
              Connect Jira Cloud
            </button>
            {!canAdmin && (
              <p className="form-hint">
                An organization administrator must connect Jira.
              </p>
            )}
          </div>
        ) : (
          <div className="jira-connected">
            <div className="jira-site">
              <span className="jira-site-mark" aria-hidden="true">
                {jira.connection.siteName?.slice(0, 1) || "J"}
              </span>
              <div className="jira-site-copy">
                <strong>{jira.connection.siteName || "Jira Cloud"}</strong>
                <a
                  href={jira.connection.siteUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {jira.connection.siteUrl.replace(/^https?:\/\//, "")}
                  <ExternalLink size={11} aria-hidden="true" />
                </a>
              </div>
              <span className="jira-webhook">
                {jira.connection.webhookRegistered
                  ? "Webhook active"
                  : "Manual sync"}
              </span>
            </div>
            {jira.connection.lastSyncError && (
              <p className="form-error" role="alert">
                {jira.connection.lastSyncError}
              </p>
            )}
            {canAdmin ? (
              <>
                <div className="form-grid jira-map">
                  <label className="full-width" htmlFor="jira-project">
                    Jira project
                    <SelectMenu
                      id="jira-project"
                      value={jiraProjectKey}
                      onChange={setJiraProjectKey}
                      disabled={jiraBusy}
                      placeholder={
                        jiraBusy && !jiraProjects.length
                          ? "Loading Jira projects…"
                          : "Choose a Jira project"
                      }
                      options={jiraProjects.map((item) => ({
                        value: item.key,
                        label: `${item.key} · ${item.name}`,
                      }))}
                    />
                  </label>
                </div>
                <div className="form-actions jira-actions">
                  <button
                    className="primary-action"
                    disabled={jiraBusy || !jiraProjectKey}
                    onClick={() => void configureJira()}
                  >
                    {jira.connection.jiraProjectKey ? "Update mapping" : "Save mapping"}
                  </button>
                  {jira.connection.jiraProjectKey && (
                    <button
                      className="secondary-action"
                      disabled={jiraBusy}
                      onClick={() => void syncJira()}
                    >
                      <RefreshCw size={14} aria-hidden="true" />
                      Sync now
                    </button>
                  )}
                  <button
                    className="text-action result-danger jira-disconnect"
                    disabled={jiraBusy}
                    onClick={() => void disconnectJira()}
                  >
                    Disconnect
                  </button>
                </div>
              </>
            ) : (
              <p className="form-hint">
                An organization administrator must manage this Jira
                connection.
              </p>
            )}
            <p className="form-hint">
              {jira.connection.jiraProjectKey
                ? `Mapped to ${jira.connection.jiraProjectKey} · ${
                    jira.connection.lastSyncedAt
                      ? `Last sync ${new Date(
                          jira.connection.lastSyncedAt,
                        ).toLocaleString()}`
                      : "Not synced yet"
                  }`
                : "Choose a Jira project to enable sync."}
            </p>
          </div>
        )}
      </section>
      {show && (
        <form
          className="test-create-form"
          onSubmit={async (event) => {
            event.preventDefault()
            const result = await mutate<{ token: string }>("token.create", form)
            if (result) {
              setSecret(result.token)
              setShow(false)
              setForm({ name: "", scope: "read", days: 30 })
            }
          }}
        >
          <h2>New token for {project?.name}</h2>
          <div className="form-grid">
            <label className="full-width">
              Token name
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="e.g. Checkout CI"
              />
            </label>
            <label>
              Scope
              <SelectMenu
                value={form.scope}
                describedBy="token-scope-hint"
                options={[
                  { value: "read", label: "Read-only" },
                  { value: "write", label: "Read & write" },
                ]}
                onChange={(scope) => setForm({ ...form, scope })}
              />
            </label>
            <label>
              Expires after
              <SelectMenu
                value={String(form.days)}
                options={[
                  { value: "7", label: "7 days" },
                  { value: "30", label: "30 days" },
                  { value: "90", label: "90 days" },
                ]}
                onChange={(days) => setForm({ ...form, days: Number(days) })}
              />
            </label>
          </div>
          <p id="token-scope-hint" className="form-hint">
            {form.scope === "read"
              ? "Read-only tokens can view tests, requirements, executions and reports. They cannot create or change data."
              : "Read & write tokens can view and create tests, update execution results, and import CI output."}
          </p>
          <div className="form-actions">
            <button className="primary-action" disabled={busy}>
              Create token
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
      {secret && (
        <div className="test-create-form">
          <h2>Copy this token now</h2>
          <p className="form-hint">
            It is shown only once. Store it in your CI secret manager.
          </p>
          <div className="inline-edit">
            <input
              aria-label="New API token"
              readOnly
              value={secret}
              onFocus={(event) => event.target.select()}
            />
            <button
              className="secondary-action"
              onClick={() => void copy(secret)}
            >
              <Copy size={15} />
              Copy token
            </button>
            <button className="secondary-action" onClick={() => setSecret("")}>
              Done
            </button>
          </div>
        </div>
      )}
      {canAdmin && (
        <div className="tests-table-wrap">
          <table className="tests-table">
            <thead>
              <tr>
                <th scope="col">Token</th>
                <th scope="col">Scope</th>
                <th scope="col">Expires</th>
                <th scope="col">Last used</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <tr key={token.id}>
                  <td>
                    <strong className="test-title">{token.name}</strong>
                    <span className="test-key">{token.prefix}…</span>
                  </td>
                  <td>{token.scope === "write" ? "Read & write" : "Read-only"}</td>
                  <td>
                    {token.expiresAt
                      ? new Date(token.expiresAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    {token.lastUsedAt
                      ? new Date(token.lastUsedAt).toLocaleString()
                      : "Never"}
                  </td>
                  <td>
                    {token.revokedAt
                      ? "Revoked"
                      : token.expiresAt &&
                          new Date(token.expiresAt) < new Date()
                        ? "Expired"
                        : "Active"}
                  </td>
                  <td>
                    {!token.revokedAt && (
                      <button
                        className="text-action result-danger"
                        disabled={busy}
                        onClick={async () => {
                          if (await mutate("token.revoke", { id: token.id }))
                            toast("Token revoked")
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tokens.length === 0 && (
            <p className="section-empty">
              No API tokens created for this project.
            </p>
          )}
        </div>
      )}
      <section className="platform-section">
        <div className="section-heading">
          <div>
            <h2>Import execution results</h2>
            <p>
              The execution and tests must already exist in the same project.
              Imports are atomic: invalid entries reject the whole batch.
            </p>
          </div>
          <button
            className="secondary-action"
            onClick={() => setOrigin(window.location.origin)}
          >
            Use this server
          </button>
        </div>
        <pre className="api-example">{example}</pre>
        <button className="secondary-action" onClick={() => void copy(example)}>
          <Copy size={15} />
          Copy example
        </button>
        <div className="api-reference">
          <h3>
            <KeyRound size={16} />
            Supported endpoints
          </h3>
          <p>
            <code>GET /api/tests?projectId=…</code> · Read project tests.
          </p>
          <p>
            <code>POST /api/tests</code> · Create a test with a projectId and
            summary.
          </p>
          <p>
            <code>POST /api/v2/import/execution</code> · Record test results.
          </p>
          <p>
            Pass the token in the Authorization header. Tokens are stored as
            hashes, checked against their owner’s current organization role, and
            limited to one project. Native Jira synchronization and
            vendor-specific reporters require separate integration work.
          </p>
        </div>
      </section>
      <ToastEl />
    </div>
  )
}
