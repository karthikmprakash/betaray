"use client"
import { useState } from "react"
import {
  Plus,
  Archive,
  RotateCcw,
  Copy,
  Download,
  Users,
  Settings2,
  Building2,
} from "lucide-react"
import { useAppData } from "@/lib/appData"
import { SelectMenu } from "@/components/app/SelectMenu"
import { downloadCsv } from "@/lib/utils"
import { useToast } from "@/components/ui/toast"

export default function AdministrationPage() {
  const {
    organizations,
    organizationId,
    members,
    projectMembers,
    invitations,
    audit,
    mutate,
    selectProject,
    canAdmin,
    busy,
    project,
    user,
  } = useAppData()
  const { toast, ToastEl } = useToast()
  const [tab, setTab] = useState("structure")
  const [orgId, setOrgId] = useState(
    organizationId || organizations[0]?.id || "",
  )
  const org = organizations.find((item) => item.id === orgId)
  const admin = !!org && ["Owner", "Admin"].includes(org.role)
  const [orgName, setOrgName] = useState("")
  const [workspaceName, setWorkspaceName] = useState("")
  const [workspaceId, setWorkspaceId] = useState("")
  const [projectForm, setProjectForm] = useState({
    name: "",
    key: "",
    description: "",
  })
  const [invitation, setInvitation] = useState({ email: "", role: "Tester" })
  const [inviteLink, setInviteLink] = useState("")
  const [query, setQuery] = useState("")
  const filteredAudit = audit.filter((entry) =>
    `${entry.action} ${entry.actor} ${entry.entity}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )
  const [newOrg, setNewOrg] = useState(false)
  const [newProject, setNewProject] = useState(false)
  const [renameId, setRenameId] = useState("")
  const [rename, setRename] = useState("")

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Administration</h1>
          <p>
            Manage organization structure, membership, and the history of
            changes.
          </p>
        </div>
        <span className="type-label">{org?.role || "Member"} access</span>
      </div>
      <div className="admin-tabs" role="group" aria-label="Administration view">
        {[
          {
            id: "structure",
            label: "Organization & projects",
            icon: Building2,
          },
          { id: "members", label: "Members & invitations", icon: Users },
          { id: "audit", label: "Audit log", icon: Settings2 },
        ].map((item) => (
          <button
            key={item.id}
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </div>
      {tab === "structure" && (
        <>
          <div className="organization-toolbar form-grid">
            <label>
              Organization
              <SelectMenu
                value={orgId}
                options={organizations.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                onChange={(next) => {
                  setOrgId(next)
                  setWorkspaceId("")
                  setNewProject(false)
                }}
              />
            </label>
            <button
              className="secondary-action"
              onClick={() => setNewOrg(!newOrg)}
            >
              <Plus size={15} />
              New organization
            </button>
          </div>
          {newOrg && (
            <form
              className="test-create-form"
              onSubmit={async (event) => {
                event.preventDefault()
                const created = await mutate<{ id: string }>(
                  "organization.create",
                  { name: orgName },
                )
                if (created) {
                  setOrgId(created.id)
                  setOrgName("")
                  setNewOrg(false)
                  toast("Organization created")
                }
              }}
            >
              <div className="form-grid">
                <label>
                  Organization name
                  <input
                    required
                    value={orgName}
                    maxLength={200}
                    onChange={(event) => setOrgName(event.target.value)}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button className="primary-action" disabled={busy}>
                  Create organization
                </button>
              </div>
            </form>
          )}
          {org && (
            <section className="platform-section">
              <div className="section-heading">
                <div>
                  <h2>{org.name}</h2>
                  <p>Organization → workspaces → projects → tests</p>
                </div>
                {admin && (
                  <button
                    className="text-action"
                    onClick={() => {
                      setRenameId(org.id)
                      setRename(org.name)
                    }}
                  >
                    Rename organization
                  </button>
                )}
              </div>
              {renameId === org.id && (
                <form
                  className="inline-edit"
                  onSubmit={async (event) => {
                    event.preventDefault()
                    if (
                      await mutate(
                        "organization.update",
                        { name: rename },
                        org.id,
                      )
                    ) {
                      setRenameId("")
                      toast("Organization renamed")
                    }
                  }}
                >
                  <label className="sr-only" htmlFor="org-rename">
                    Organization name
                  </label>
                  <input
                    id="org-rename"
                    required
                    value={rename}
                    onChange={(event) => setRename(event.target.value)}
                  />
                  <button className="primary-action" disabled={busy}>
                    Save name
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => setRenameId("")}
                  >
                    Cancel
                  </button>
                </form>
              )}
              <div className="organization-tree">
                {org.workspaces.map((workspace) => (
                  <section className="workspace-panel" key={workspace.id}>
                    <div className="section-heading">
                      <h3>{workspace.name}</h3>
                      {admin && (
                        <div className="form-actions">
                          <button
                            className="text-action"
                            onClick={() => {
                              setRenameId(workspace.id)
                              setRename(workspace.name)
                            }}
                          >
                            Rename
                          </button>
                          <button
                            className="secondary-action"
                            onClick={() => {
                              setWorkspaceId(workspace.id)
                              setNewProject(true)
                            }}
                          >
                            <Plus size={14} />
                            Add project
                          </button>
                        </div>
                      )}
                    </div>
                    {renameId === workspace.id && (
                      <form
                        className="inline-edit"
                        onSubmit={async (event) => {
                          event.preventDefault()
                          if (
                            await mutate(
                              "workspace.update",
                              { id: workspace.id, name: rename },
                              org.id,
                            )
                          )
                            setRenameId("")
                        }}
                      >
                        <input
                          aria-label="Workspace name"
                          required
                          value={rename}
                          onChange={(event) => setRename(event.target.value)}
                        />
                        <button className="primary-action" disabled={busy}>
                          Save
                        </button>
                        <button
                          type="button"
                          className="secondary-action"
                          onClick={() => setRenameId("")}
                        >
                          Cancel
                        </button>
                      </form>
                    )}
                    <div className="project-list">
                      {workspace.projects.map((item) => (
                        <div className="project-list-row" key={item.id}>
                          <span className="project-avatar">
                            {item.key.slice(0, 2)}
                          </span>
                          <div>
                            <strong>{item.name}</strong>
                            <span>
                              {item.key}
                              {item.archivedAt ? " · Archived" : ""}
                              {project?.id === item.id
                                ? " · Current project"
                                : ""}
                            </span>
                          </div>
                          <button
                            className="text-action"
                            disabled={busy}
                            onClick={() => void selectProject(item.id)}
                          >
                            Open
                          </button>
                          {admin && (
                            <>
                              <button
                                className="text-action"
                                onClick={() => {
                                  setRenameId(item.id)
                                  setRename(item.name)
                                }}
                              >
                                Rename
                              </button>
                              <button
                                className="icon-button"
                                disabled={busy}
                                aria-label={`${item.archivedAt ? "Restore" : "Archive"} project ${item.name}`}
                                onClick={async () => {
                                  if (
                                    await mutate(
                                      "project.update",
                                      {
                                        id: item.id,
                                        archived: !item.archivedAt,
                                      },
                                      org.id,
                                    )
                                  )
                                    toast(
                                      item.archivedAt
                                        ? "Project restored"
                                        : "Project archived; its records are preserved",
                                    )
                                }}
                              >
                                {item.archivedAt ? (
                                  <RotateCcw size={16} />
                                ) : (
                                  <Archive size={16} />
                                )}
                              </button>
                            </>
                          )}
                          {renameId === item.id && (
                            <form
                              className="inline-edit full-width"
                              onSubmit={async (event) => {
                                event.preventDefault()
                                if (
                                  await mutate(
                                    "project.update",
                                    { id: item.id, name: rename },
                                    org.id,
                                  )
                                )
                                  setRenameId("")
                              }}
                            >
                              <input
                                aria-label="Project name"
                                required
                                value={rename}
                                onChange={(event) =>
                                  setRename(event.target.value)
                                }
                              />
                              <button
                                className="primary-action"
                                disabled={busy}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="secondary-action"
                                onClick={() => setRenameId("")}
                              >
                                Cancel
                              </button>
                            </form>
                          )}
                        </div>
                      ))}
                      {workspace.projects.length === 0 && (
                        <p className="page-footnote">
                          No projects in this workspace yet.
                        </p>
                      )}
                    </div>
                  </section>
                ))}
              </div>
              {admin && (
                <form
                  className="test-create-form"
                  onSubmit={async (event) => {
                    event.preventDefault()
                    if (
                      await mutate(
                        "workspace.create",
                        { name: workspaceName },
                        org.id,
                      )
                    ) {
                      setWorkspaceName("")
                      toast("Workspace created")
                    }
                  }}
                >
                  <h2>Add a workspace</h2>
                  <div className="inline-edit">
                    <input
                      aria-label="New workspace name"
                      required
                      maxLength={200}
                      value={workspaceName}
                      onChange={(event) => setWorkspaceName(event.target.value)}
                      placeholder="e.g. Platform engineering"
                    />
                    <button className="primary-action" disabled={busy}>
                      Create workspace
                    </button>
                  </div>
                </form>
              )}
              {newProject && admin && (
                <form
                  className="test-create-form"
                  onSubmit={async (event) => {
                    event.preventDefault()
                    const created = await mutate<{ id: string }>(
                      "project.create",
                      { ...projectForm, workspaceId },
                      org.id,
                    )
                    if (created) {
                      setNewProject(false)
                      setProjectForm({ name: "", key: "", description: "" })
                      await selectProject(created.id)
                      toast("Project created and selected")
                    }
                  }}
                >
                  <h2>Create a project</h2>
                  <div className="form-grid">
                    <label>
                      Workspace
                      <SelectMenu
                        value={workspaceId}
                        options={org.workspaces.map((workspace) => ({
                          value: workspace.id,
                          label: workspace.name,
                        }))}
                        onChange={setWorkspaceId}
                      />
                    </label>
                    <label>
                      Project key
                      <input
                        required
                        pattern="[A-Z][A-Z0-9]{1,9}"
                        maxLength={10}
                        placeholder="PAY"
                        value={projectForm.key}
                        onChange={(event) =>
                          setProjectForm({
                            ...projectForm,
                            key: event.target.value.toUpperCase(),
                          })
                        }
                      />
                      <span className="form-hint">
                        2–10 uppercase letters or digits.
                      </span>
                    </label>
                    <label className="full-width">
                      Project name
                      <input
                        autoFocus
                        required
                        value={projectForm.name}
                        onChange={(event) =>
                          setProjectForm({
                            ...projectForm,
                            name: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="full-width">
                      Description
                      <textarea
                        value={projectForm.description}
                        onChange={(event) =>
                          setProjectForm({
                            ...projectForm,
                            description: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <div className="form-actions">
                    <button className="primary-action" disabled={busy}>
                      Create project
                    </button>
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() => setNewProject(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}
        </>
      )}
      {tab === "members" && (
        <section className="platform-section">
          <div className="section-heading">
            <div>
              <h2>
                Members of{" "}
                {organizations.find((org) => org.id === organizationId)?.name}
              </h2>
              <p>
                Organization roles are the default across workspaces. Override
                Tester or Viewer access for the current project when a team
                needs different permissions.
              </p>
            </div>
          </div>
          {!canAdmin ? (
            <p className="permission-notice">
              Only organization owners and administrators can manage
              memberships.
            </p>
          ) : (
            <>
              <div className="tests-table-wrap">
                <table className="tests-table">
                  <thead>
                    <tr>
                      <th scope="col">Member</th>
                      <th scope="col">Organization role</th>
                      <th scope="col">Current project role</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td>
                          <strong className="test-title">
                            {member.user.name}
                            {member.userId === user.id ? " (you)" : ""}
                          </strong>
                          <span className="muted-text">
                            {member.user.email}
                          </span>
                        </td>
                        <td>
                          {member.role === "Owner" ? (
                            <span>Owner</span>
                          ) : (
                            <SelectMenu
                              ariaLabel={`Role for ${member.user.name}`}
                              value={member.role}
                              disabled={
                                busy ||
                                (member.role === "Admin" &&
                                  organizations.find(
                                    (org) => org.id === organizationId,
                                  )?.role !== "Owner")
                              }
                              options={["Admin", "Tester", "Viewer"].map((role) => ({
                                value: role,
                                label: role,
                              }))}
                              onChange={(role) =>
                                void mutate("member.update", {
                                  id: member.id,
                                  role,
                                })
                              }
                            />
                          )}
                        </td>
                        <td>
                          {["Owner", "Admin"].includes(member.role) ? (
                            <span>Organization administrator</span>
                          ) : (
                            <SelectMenu
                              ariaLabel={`Project role for ${member.user.name}`}
                              value={
                                projectMembers.find(
                                  (override) =>
                                    override.userId === member.userId,
                                )?.role || "inherit"
                              }
                              disabled={busy || !project}
                              options={[
                                { value: "inherit", label: "Use organization role" },
                                { value: "Tester", label: "Tester" },
                                { value: "Viewer", label: "Viewer" },
                              ]}
                              onChange={(role) =>
                                void mutate("member.project", {
                                  projectId: project?.id,
                                  userId: member.userId,
                                  role: role === "inherit" ? null : role,
                                })
                              }
                            />
                          )}
                        </td>
                        <td>
                          {member.role !== "Owner" && (
                            <button
                              className="text-action result-danger"
                              disabled={busy}
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    `Remove ${member.user.name} from this organization? They will lose access to its projects.`,
                                  )
                                )
                                  await mutate("member.remove", {
                                    id: member.id,
                                  })
                              }}
                            >
                              Remove access
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <form
                className="test-create-form platform-section"
                onSubmit={async (event) => {
                  event.preventDefault()
                  const result = await mutate<{ token: string }>(
                    "invitation.create",
                    invitation,
                  )
                  if (result) {
                    setInviteLink(
                      `${window.location.origin}/invite?token=${encodeURIComponent(result.token)}`,
                    )
                    setInvitation({ ...invitation, email: "" })
                  }
                }}
              >
                <h2>Invite a member</h2>
                <div className="form-grid">
                  <label>
                    Email
                    <input
                      required
                      type="email"
                      value={invitation.email}
                      onChange={(event) =>
                        setInvitation({
                          ...invitation,
                          email: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Role
                    <SelectMenu
                      value={invitation.role}
                      options={["Admin", "Tester", "Viewer"].map((role) => ({
                        value: role,
                        label: role,
                      }))}
                      onChange={(role) =>
                        setInvitation({
                          ...invitation,
                          role,
                        })
                      }
                    />
                  </label>
                </div>
                <div className="form-actions">
                  <button className="primary-action" disabled={busy}>
                    Create invitation link
                  </button>
                </div>
                <p className="form-hint">
                  Links expire in 7 days. Email delivery is not configured;
                  share the link with the invited person.
                </p>
                {inviteLink && (
                  <div className="invitation-result">
                    <label>
                      Invitation link · copy now; it is shown only once
                      <input
                        readOnly
                        value={inviteLink}
                        onFocus={(event) => event.target.select()}
                      />
                    </label>
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(inviteLink)
                          toast("Invitation link copied")
                        } catch {
                          toast("Select and copy the link manually")
                        }
                      }}
                    >
                      <Copy size={15} />
                      Copy link
                    </button>
                  </div>
                )}
              </form>
              <div className="section-heading">
                <h2>Invitations</h2>
              </div>
              <div className="version-list">
                {invitations.map((invitation) => (
                  <div key={invitation.id}>
                    <strong>{invitation.email}</strong>
                    <span>
                      {invitation.role} ·{" "}
                      {invitation.acceptedAt
                        ? "Accepted"
                        : new Date(invitation.expiresAt) < new Date()
                          ? "Expired"
                          : "Pending"}
                    </span>
                    {!invitation.acceptedAt &&
                      new Date(invitation.expiresAt) > new Date() && (
                        <button
                          className="text-action"
                          disabled={busy}
                          onClick={() =>
                            void mutate("invitation.revoke", {
                              id: invitation.id,
                            })
                          }
                        >
                          Revoke
                        </button>
                      )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}
      {tab === "audit" && (
        <section className="platform-section">
          <div className="section-heading">
            <div>
              <h2>Audit log</h2>
              <p>
                Latest {audit.length} recorded changes
                {canAdmin ? " in this organization" : " in this project"}.
              </p>
            </div>
            <button
              className="secondary-action"
              onClick={() =>
                downloadCsv("betaray-audit.csv", [
                  ["Time", "Actor", "Action", "Entity", "ID"],
                  ...filteredAudit.map((entry) => [
                    entry.createdAt,
                    entry.actor,
                    entry.action,
                    entry.entity,
                    entry.entityId,
                  ]),
                ])
              }
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
          <div className="test-toolbar">
            <div className="test-search">
              <input
                aria-label="Search audit log"
                placeholder="Search action, actor, or entity…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          <div className="audit-list">
            {filteredAudit.map((entry) => (
              <div key={entry.id}>
                <div>
                  <strong>{entry.action}</strong>
                  <span>
                    {entry.actor} · {entry.entity}
                  </span>
                </div>
                <time dateTime={entry.createdAt}>
                  {new Date(entry.createdAt).toLocaleString()}
                </time>
              </div>
            ))}
            {filteredAudit.length === 0 && (
              <p className="page-footnote">No changes match this view yet.</p>
            )}
          </div>
        </section>
      )}
      <ToastEl />
    </div>
  )
}
