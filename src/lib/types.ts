export type Role = "Owner" | "Admin" | "Tester" | "Viewer"
export type Step = { action: string; data?: string; expected?: string }
export type Test = {
  id: string
  key: string
  project: string
  summary: string
  description?: string
  type: string
  priority: string
  status: string
  labels: string[]
  folder?: string
  precondition?: string
  gherkin?: string
  steps: Step[]
  linkedRequirements: string[]
  createdAt: string
  revision: number
  archivedAt: string | null
  revisions: { revision: number; actor: string; createdAt: string }[]
  comments: { id: string; body: string; actor: string; createdAt: string }[]
}
export type Run = {
  testId: string
  status: string
  comment?: string
  defects?: string
  executedAt?: string
}
export type Execution = {
  id: string
  key: string
  project: string
  name: string
  status: string
  env?: string
  version?: string
  notes?: string
  revision: number
  createdAt: string
  runs: Run[]
}
export type Requirement = {
  id: string
  key: string
  summary: string
  type: string
  status: string
  priority: string
}
export type Environment = {
  id: string
  name: string
  description: string | null
  baseUrl: string | null
  region: string | null
  archivedAt: string | null
}
export type Release = {
  id: string
  name: string
  status: string
  description: string | null
}
export type Collection = {
  id: string
  key: string
  name: string
  status?: string
  testIds: string[]
  executionIds?: string[]
}
export type DraftPayload = { summary: string; steps: Step[]; gherkin: string }
export type Draft = {
  id: string
  source: string
  type: string
  mode: string
  payload: DraftPayload
  requirementKey: string | null
  approvedTestId: string | null
  createdAt: string
  createdBy: string
  approvedBy: string | null
}
export type Project = {
  id: string
  key: string
  name: string
  description: string | null
  archivedAt: string | null
  workspaceId: string | null
}
export type Workspace = {
  id: string
  name: string
  organizationId: string
  projects: Project[]
}
export type Organization = {
  id: string
  name: string
  role: Role
  workspaces: Workspace[]
}
export type AuditEntry = {
  id: string
  action: string
  entity: string
  entityId: string
  detail: string | null
  actor: string
  createdAt: string
}
export type Exploration = {
  id: string
  title: string
  charter: string
  notes: { id: string; text: string; createdAt: string; defectKey?: string }[]
  status: "Running" | "Paused" | "Finished"
  durationSeconds: number
  lastStartedAt: string | null
  revision: number
  createdAt: string
  createdBy: string
}
export type ApiToken = {
  id: string
  name: string
  scope: string
  prefix: string | null
  expiresAt: string | null
  revokedAt: string | null
  lastUsedAt: string | null
  createdAt: string
}
export type PlatformState = {
  user: { id: string; name: string; email: string }
  organizations: Organization[]
  projectId: string | null
  role: Role
  organizationId: string | null
  tests: Test[]
  executions: Execution[]
  requirements: Requirement[]
  environments: Environment[]
  versions: Release[]
  folders: { id: string; name: string }[]
  sets: Collection[]
  plans: Collection[]
  drafts: Draft[]
  audit: AuditEntry[]
  members: {
    id: string
    userId: string
    role: Role
    user: { name: string; email: string }
  }[]
  invitations: {
    id: string
    email: string
    role: Role
    expiresAt: string
    acceptedAt: string | null
  }[]
  projectMembers: { id: string; userId: string; role: string }[]
  tokens: ApiToken[]
  explorations: Exploration[]
  aiConfigured: boolean
}
