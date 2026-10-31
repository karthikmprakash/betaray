"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  LayoutDashboard,
  TestTube2,
  PlaySquare,
  FolderTree,
  ListChecks,
  FileBarChart,
  Package,
  Beaker,
  Sparkles,
  Settings,
  Boxes,
  Search,
  FlaskConical,
  GitCompare,
  Menu,
  X,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { LegacyImport } from "./LegacyImport"
import { useAppData } from "@/lib/appData"
import type { Organization, Project } from "@/lib/types"

const groups = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/app", icon: LayoutDashboard },
      { label: "Tests", href: "/app/tests", icon: TestTube2 },
      { label: "Repository", href: "/app/repository", icon: FolderTree },
      { label: "Test sets", href: "/app/test-sets", icon: Boxes },
      { label: "Test plans", href: "/app/test-plans", icon: Package },
      { label: "Executions", href: "/app/executions", icon: PlaySquare },
      { label: "Requirements", href: "/app/requirements", icon: ListChecks },
      { label: "Reports", href: "/app/reports", icon: FileBarChart },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "AI Studio", href: "/app/ai-studio", icon: Sparkles },
      { label: "Exploratory", href: "/app/exploratory", icon: Beaker },
      { label: "Integrations", href: "/app/integrations", icon: GitCompare },
      { label: "Environments", href: "/app/environments", icon: FlaskConical },
    ],
  },
]
const admin = { label: "Administration", href: "/app/admin", icon: Settings }
const navigation = [
  ...groups.flatMap((group) => group.items),
  admin,
  { label: "Your account", href: "/app/account", icon: Settings },
]


function ProjectSwitcher({
  id,
  organizations,
  project,
  busy,
  onSelect,
}: {
  id: string
  organizations: Organization[]
  project: Project | undefined
  busy: boolean
  onSelect: (id: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const labelId = `${id}-label`
  const menuId = `${id}-menu`
  const allProjects = organizations.flatMap((org) =>
    org.workspaces.flatMap((workspace) =>
      workspace.projects.map((item) => ({
        item,
        orgName: org.name,
        workspaceName: workspace.name,
      })),
    ),
  )
  const current = allProjects.find((entry) => entry.item.id === project?.id)
  const term = query.trim().toLowerCase()
  const filtered = allProjects.filter((entry) =>
    `${entry.item.key} ${entry.item.name} ${entry.orgName} ${entry.workspaceName}`
      .toLowerCase()
      .includes(term),
  )
  const grouped = organizations
    .map((org) => ({
      org,
      workspaces: org.workspaces
        .map((workspace) => ({
          workspace,
          projects: filtered.filter(
            (entry) =>
              entry.orgName === org.name &&
              entry.workspaceName === workspace.name,
          ),
        }))
        .filter((entry) => entry.projects.length > 0),
    }))
    .filter((entry) => entry.workspaces.length > 0)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointer)
    const timer = window.setTimeout(() => search.current?.focus(), 40)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      window.clearTimeout(timer)
    }
  }, [open])

  async function choose(next: string) {
    if (next === project?.id) {
      setOpen(false)
      return
    }
    setOpen(false)
    await onSelect(next)
  }

  function onMenuKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      setOpen(false)
      trigger.current?.focus()
      return
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
    const options = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'),
    )
    if (!options.length) return
    event.preventDefault()
    const at = options.indexOf(document.activeElement as HTMLButtonElement)
    let next = 0
    if (event.key === "End") next = options.length - 1
    else if (event.key === "ArrowDown") next = at < 0 ? 0 : (at + 1) % options.length
    else if (event.key === "ArrowUp") next = at < 0 ? options.length - 1 : (at - 1 + options.length) % options.length
    options[next]?.focus()
  }

  return (
    <div className="project-picker" ref={root}>
      <label id={labelId} className="sr-only">
        Current project
      </label>
      <button
        id={id}
        ref={trigger}
        type="button"
        className="project-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-labelledby={labelId}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            if (!open) {
              event.preventDefault()
              setOpen(true)
            }
          }
        }}
      >
        <span className="project-trigger-key" aria-hidden="true">
          {project?.key || "—"}
        </span>
        <span className="project-trigger-copy">
          <span className="project-trigger-name">
            {project?.name || "Select a project"}
          </span>
          <span className="project-trigger-meta">
            {current ? `${current.orgName} / ${current.workspaceName}` : "No workspace"}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`project-trigger-chevron ${open ? "is-open" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          id={menuId}
          className="project-menu"
          role="listbox"
          aria-labelledby={labelId}
          onKeyDown={onMenuKey}
        >
          <div className="project-menu-search">
            <Search size={13} aria-hidden="true" />
            <input
              ref={search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a project…"
              aria-label="Find a project"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="project-menu-scroll">
            {grouped.map(({ org, workspaces }) => (
              <div key={org.id} className="project-menu-group" role="group" aria-label={`${org.name}`}>
                {workspaces.map(({ workspace, projects }) => (
                  <div key={workspace.id}>
                    <div className="project-menu-label">
                      {org.name} / {workspace.name}
                    </div>
                    {projects.map(({ item }) => {
                      const selected = item.id === project?.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className="project-option"
                          onClick={() => void choose(item.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              void choose(item.id)
                            }
                          }}
                        >
                          <span className="project-option-key" aria-hidden="true">{item.key}</span>
                          <span className="project-option-copy">
                            <span className="project-option-name">{item.name}</span>
                            {item.archivedAt && <span className="project-option-archived">Archived</span>}
                          </span>
                          {selected && <Check size={14} className="project-option-check" aria-hidden="true" />}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            ))}
            {grouped.length === 0 && (
              <div className="project-menu-empty">No projects match “{query}”</div>
            )}
          </div>
          <div className="project-menu-footer">
            <Link href="/app/admin" onClick={() => setOpen(false)}>Manage projects</Link>
            <span>{filtered.length} {filtered.length === 1 ? "project" : "projects"}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const {
    tests,
    executions,
    requirements,
    organizations,
    project,
    user,
    selectProject,
    busy,
    error,
    clearError,
    refresh,
    canWrite,
  } = useAppData()
  const router = useRouter()
  const currentOrganization = organizations.find((org) =>
    org.workspaces.some((workspace) =>
      workspace.projects.some((item) => item.id === project?.id),
    ),
  )
  const currentWorkspace = currentOrganization?.workspaces.find(
    (workspace) => workspace.id === project?.workspaceId,
  )
  const [query, setQuery] = useState("")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const commandDialog = useRef<HTMLDialogElement>(null)
  const navigationDialog = useRef<HTMLDialogElement>(null)
  const active = navigation.find((item) =>
    item.href === "/app"
      ? pathname === item.href
      : pathname.startsWith(item.href),
  )

  function openSearch() {
    setQuery("")
    commandDialog.current?.showModal()
  }

  useEffect(() => {
    try {
      // Hydrate the persisted sidebar preference after mount to avoid a
      // server/client markup mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSidebarCollapsed(
        window.localStorage.getItem("betaray:sidebar-collapsed") === "true",
      )
    } catch {}
  }, [])

  function toggleSidebar() {
    setSidebarCollapsed((previous) => {
      const next = !previous
      try {
        window.localStorage.setItem("betaray:sidebar-collapsed", String(next))
      } catch {}
      return next
    })
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        if (commandDialog.current?.open) commandDialog.current.close()
        else commandDialog.current?.showModal()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const term = query.trim().toLowerCase()
  const records = [
    ...tests.map((test) => ({
      label: test.summary,
      key: test.key,
      href: `/app/tests/${test.id}`,
      icon: TestTube2,
      kind: "Test",
    })),
    ...executions.map((execution) => ({
      label: execution.name,
      key: execution.key,
      href: `/app/executions/${execution.id}`,
      icon: PlaySquare,
      kind: "Execution",
    })),
    ...requirements.map((requirement) => ({
      label: requirement.summary,
      key: requirement.key,
      href: "/app/requirements",
      icon: ListChecks,
      kind: "Requirement",
    })),
  ].filter((item) => `${item.key} ${item.label}`.toLowerCase().includes(term))
  const results = term
    ? records.slice(0, 12)
    : navigation.map((item) => ({ ...item, key: item.href, kind: "Page" }))

  function sidebar(mobile = false) {
    return (
      <>
        <div className="workspace-brand">
          <Link href="/" className="brand-link" aria-label="Betaray home">
            <img
              src="/brand/betaray/betaray-mark-mono.svg"
              alt=""
              width={36}
              height={36}
              className="brand-mark-image"
            />
            <span className="brand-name">Betaray</span>
          </Link>
          {mobile && (
            <button
              className="icon-button"
              aria-label="Close navigation"
              onClick={() => navigationDialog.current?.close()}
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="project-context">
          <div className="project-selector-group">
            <Link href="/app/admin" className="organization-context">
              {currentOrganization?.name || "Your organizations"}
            </Link>
            <ProjectSwitcher
              id={mobile ? "mobile-project-select" : "desktop-project-select"}
              organizations={organizations}
              project={project}
              busy={busy}
              onSelect={async (id) => {
                await selectProject(id)
                navigationDialog.current?.close()
                router.push("/app")
              }}
            />
          </div>
        </div>
        <nav
          aria-label={mobile ? "Mobile navigation" : "Main navigation"}
          className="workspace-nav"
        >
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active?.href === item.href ? "page" : undefined}
                  aria-label={item.label}
                  title={item.label}
                  className="nav-link"
                  onClick={() => navigationDialog.current?.close()}
                >
                  <item.icon size={17} strokeWidth={1.7} aria-hidden="true" />
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            href={admin.href}
            className="nav-link"
            aria-current={active?.href === admin.href ? "page" : undefined}
            aria-label={admin.label}
            title={admin.label}
            onClick={() => navigationDialog.current?.close()}
          >
            <Settings size={17} strokeWidth={1.7} aria-hidden="true" />
            <span className="nav-label">Administration</span>
          </Link>
          <div className="workspace-account">
            <span className="account-avatar" aria-hidden="true">
              {user.name
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>
                <Link href="/app/account">{user.name}</Link>
              </strong>
              <span>{currentOrganization?.role || "Member"}</span>
            </div>
            <button
              className="text-action sign-out"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" })
                router.replace("/login")
                router.refresh()
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside
        id="desktop-sidebar"
        className={`desktop-sidebar ${sidebarCollapsed ? "is-collapsed" : ""}`}
        aria-label="Workspace navigation"
      >
        {sidebar()}
      </aside>
      <dialog
        ref={navigationDialog}
        className="mobile-navigation"
        aria-label="Workspace navigation"
      >
        {sidebar(true)}
      </dialog>
      <div className="workspace-content">
        <header className="workspace-toolbar">
          <button
            className="icon-button mobile-menu-button"
            aria-label="Open navigation"
            onClick={() => navigationDialog.current?.showModal()}
          >
            <Menu size={19} />
          </button>
          <button
            type="button"
            className="icon-button desktop-sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
            aria-controls="desktop-sidebar"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={18} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={18} aria-hidden="true" />
            )}
          </button>
          <div className="workspace-breadcrumb">
            <span>{currentWorkspace?.name || "Workspace"}</span>
            <ChevronRight size={13} aria-hidden="true" />
            {project && <span className="toolbar-project">{project.key}</span>}
            <ChevronRight size={13} aria-hidden="true" />
            <strong>{active?.label || "Workspace"}</strong>
          </div>
          <button
            className="workspace-search"
            onClick={openSearch}
            aria-label="Search workspace"
          >
            <Search size={16} aria-hidden="true" />
            <span>Search workspace…</span>
            <kbd>⌘ K / Ctrl K</kbd>
          </button>
          <Link className="toolbar-home" href="/">
            Product site
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="app-main"
          aria-busy={busy}
        >
          {error && (
            <div className="platform-alert" role="alert">
              <span>{error}</span>
              <button
                className="text-action"
                onClick={() =>
                  void refresh()
                    .then(clearError)
                    .catch(() => {})
                }
              >
                Reload latest
              </button>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={clearError}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!canWrite && project && (
            <div className="permission-notice">
              {project.archivedAt
                ? "This project is archived. Restore it in Administration to make changes."
                : "You have Viewer access. An administrator can change your role in Administration."}
            </div>
          )}
          {!project && (
            <div className="permission-notice">
              No project selected.{" "}
              <Link href="/app/admin" className="text-action">
                Create a workspace and project in Administration.
              </Link>
            </div>
          )}
          <LegacyImport />
          {children}
        </main>
        <footer className="workspace-footer">
          <span>Betaray · Test management</span>
          <span>Database-backed workspace · Changes saved to the server</span>
        </footer>
      </div>
      <dialog
        ref={commandDialog}
        className="command-dialog"
        aria-labelledby="search-title"
        onClick={(event) => {
          if (event.target === event.currentTarget)
            commandDialog.current?.close()
        }}
      >
        <h2 id="search-title" className="sr-only">
          Search workspace
        </h2>
        <div className="command-input">
          <Search size={19} aria-hidden="true" />
          <input
            autoFocus
            aria-label="Search tests, executions and requirements"
            placeholder="Search by name or issue key…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            className="icon-button"
            aria-label="Close search"
            onClick={() => commandDialog.current?.close()}
          >
            <X size={18} />
          </button>
        </div>
        <div className="command-results">
          <p className="command-caption" aria-live="polite">
            {term
              ? `${records.length} matching result${records.length === 1 ? "" : "s"}${records.length > 12 ? " · Showing first 12" : ""}`
              : "Go to a page, or type to find a record"}
          </p>
          {results.map((item) => (
            <Link
              key={`${item.kind}-${item.key}`}
              href={item.href}
              onClick={() => commandDialog.current?.close()}
              className="command-result"
            >
              <item.icon size={16} aria-hidden="true" />
              <div>
                <strong>{item.label}</strong>
                <span>
                  {item.kind}
                  {item.kind !== "Page" ? ` · ${item.key}` : ""}
                </span>
              </div>
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          ))}
          {results.length === 0 && (
            <div className="search-empty">
              <strong>No matching records</strong>
              <p>Try a test name or an issue key such as BET-201.</p>
              <button className="text-action" onClick={() => setQuery("")}>
                Clear search
              </button>
            </div>
          )}
        </div>
        <div className="command-footer">
          <span>Tab to move between results · Enter to open</span>
          <span>Esc to close</span>
        </div>
      </dialog>
    </div>
  )
}
