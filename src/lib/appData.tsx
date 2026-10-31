"use client"

import Link from "next/link"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import type { Execution, PlatformState, Test } from "./types"
export type { Step, Test, Execution, Requirement } from "./types"

type Context = PlatformState & {
  allTests: Test[]
  envs: string[]
  canWrite: boolean
  canAdmin: boolean
  busy: boolean
  error: string | null
  project:
    | PlatformState["organizations"][number]["workspaces"][number]["projects"][number]
    | undefined
  refresh: () => Promise<void>
  selectProject: (id: string) => Promise<void>
  clearError: () => void
  mutate: <T = { id: string }>(
    action: string,
    input: unknown,
    organizationId?: string,
  ) => Promise<T | null>
  createTest: (test: Partial<Test>) => Promise<Test | null>
  updateTest: (id: string, patch: Partial<Test>) => Promise<boolean>
  createExecution: (
    name: string,
    ids: string[],
    options?: { env: string; version: string; planId?: string },
  ) => Promise<Execution | null>
  updateRun: (
    execId: string,
    testId: string,
    patch: Partial<Execution["runs"][number]>,
  ) => Promise<boolean>
  addRequirementLink: (testId: string, key: string) => Promise<boolean>
}
const AppCtx = createContext<Context | null>(null)
export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlatformState | null>(null)
  const [ready, setReady] = useState(false)
  const [unauthenticated, setUnauthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(0)
  const currentProject = useRef<string | null>(null)
  const stateRef = useRef<PlatformState | null>(null)

  const load = useCallback(async (id?: string | null) => {
    const response = await fetch(
      `/api/platform${id ? `?projectId=${encodeURIComponent(id)}` : ""}`,
      { cache: "no-store" },
    )
    const payload = await response.json()
    if (response.status === 401) {
      setUnauthenticated(true)
      setState(null)
      stateRef.current = null
      return null
    }
    if (!response.ok)
      throw new Error(payload.error || "Workspace could not be loaded.")
    const next = payload as PlatformState
    currentProject.current = next.projectId
    stateRef.current = next
    setState(next)
    setUnauthenticated(false)
    try {
      if (next.projectId)
        localStorage.setItem("betaray:selected-project", next.projectId)
    } catch {}
    return next
  }, [])
  useEffect(() => {
    let id: string | null = null
    try {
      id = localStorage.getItem("betaray:selected-project")
    } catch {}
    Promise.resolve()
      .then(() => load(id))
      .catch(() => load())
      .catch((error) => setError(error.message))
      .finally(() => setReady(true))
  }, [load])
  const refresh = useCallback(async () => {
    await load(currentProject.current)
  }, [load])
  async function selectProject(id: string) {
    if (pending) return
    setPending((count) => count + 1)
    setError(null)
    try {
      await load(id)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Project could not be loaded.",
      )
    } finally {
      setPending((count) => count - 1)
    }
  }
  async function mutate<T = { id: string }>(
    action: string,
    input: unknown,
    organizationId?: string,
  ): Promise<T | null> {
    const id = currentProject.current
    setPending((count) => count + 1)
    setError(null)
    try {
      const response = await fetch("/api/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          projectId: id || undefined,
          organizationId:
            organizationId || stateRef.current?.organizationId || undefined,
          input,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        if (response.status === 401) setUnauthenticated(true)
        throw new Error(payload.error || "Your change could not be saved.")
      }
      // Never replace a newly selected project's records with a previous project's response.
      if (currentProject.current === id) await load(id)
      return payload.result as T
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Your change could not be saved.",
      )
      return null
    } finally {
      setPending((count) => count - 1)
    }
  }
  async function createTest(input: Partial<Test>) {
    const result = await mutate<{ id: string }>("test.create", input)
    return result
      ? stateRef.current?.tests.find((test) => test.id === result.id) || null
      : null
  }
  async function updateTest(id: string, patch: Partial<Test>) {
    const existing = stateRef.current?.tests.find((test) => test.id === id)
    if (!existing) return false
    return !!(await mutate("test.update", {
      ...existing,
      ...patch,
      id,
      revision: patch.revision ?? existing.revision,
    }))
  }
  async function createExecution(
    name: string,
    testIds: string[],
    options?: { env: string; version: string; planId?: string },
  ) {
    const result = await mutate<{ id: string }>("execution.create", {
      name,
      testIds,
      env:
        options?.env ||
        stateRef.current?.environments.find((env) => !env.archivedAt)?.name ||
        "",
      version: options?.version || "",
      planId: options?.planId,
    })
    return result
      ? stateRef.current?.executions.find(
          (execution) => execution.id === result.id,
        ) || null
      : null
  }
  async function updateRun(
    execId: string,
    testId: string,
    patch: Partial<Execution["runs"][number]>,
  ) {
    const execution = stateRef.current?.executions.find(
      (item) => item.id === execId,
    )
    return (
      !!execution &&
      !!(await mutate("execution.update", {
        id: execId,
        revision: execution.revision,
        testId,
        ...patch,
      }))
    )
  }
  async function addRequirementLink(testId: string, key: string) {
    const test = stateRef.current?.tests.find((item) => item.id === testId)
    return (
      !!test &&
      updateTest(testId, {
        linkedRequirements: [...new Set([...test.linkedRequirements, key])],
      })
    )
  }
  if (!ready)
    return (
      <div className="platform-loading" role="status">
        Loading your workspace…
      </div>
    )
  if (unauthenticated)
    return (
      <div className="platform-gate">
        <h1>Sign in to your workspace</h1>
        <p>
          Your organizations, projects, and test results are stored on the
          server.
        </p>
        <Link className="primary-action" href="/login">
          Continue to sign in
        </Link>
      </div>
    )
  if (!state)
    return (
      <div className="platform-gate" role="alert">
        <h1>Workspace could not be loaded</h1>
        <p>{error}</p>
        <button
          className="primary-action"
          onClick={() => refresh().catch((error) => setError(error.message))}
        >
          Try again
        </button>
      </div>
    )
  const project = state.organizations
    .flatMap((org) => org.workspaces.flatMap((workspace) => workspace.projects))
    .find((project) => project.id === state.projectId)
  const canAdmin = ["Owner", "Admin"].includes(state.role)
  return (
    <AppCtx.Provider
      value={{
        ...state,
        allTests: state.tests,
        tests: state.tests.filter((test) => !test.archivedAt),
        project,
        envs: state.environments
          .filter((env) => !env.archivedAt)
          .map((env) => env.name),
        canAdmin,
        canWrite: state.role !== "Viewer" && !project?.archivedAt,
        busy: pending > 0,
        error,
        refresh,
        selectProject,
        clearError: () => setError(null),
        mutate,
        createTest,
        updateTest,
        createExecution,
        updateRun,
        addRequirementLink,
      }}
    >
      {children}
    </AppCtx.Provider>
  )
}
export function useAppData() {
  const context = useContext(AppCtx)
  if (!context) throw new Error("useAppData requires AppDataProvider")
  return context
}
