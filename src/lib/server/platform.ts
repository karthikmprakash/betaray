import type { User } from "@prisma/client"
import { prisma } from "@/lib/db"
import { assert } from "./http"
import { testDto, testInclude } from "./operations/shared"
import type { PlatformState, Role } from "@/lib/types"

/**
 * The web app's single read model. Mutations and agent-facing reads live in
 * `./operations`; see `operations/core.ts`.
 */
export async function readPlatform(
  user: User,
  requestedProject?: string | null,
  /** API tokens are bound to one project and never see organization administration data. */
  tokenScoped = false,
): Promise<PlatformState> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    include: {
      organization: {
        include: {
          workspaces: {
            orderBy: { createdAt: "asc" },
            include: { projects: { orderBy: { createdAt: "asc" } } },
          },
        },
      },
    },
  })
  const organizations = memberships
    .map((member) => ({ ...member.organization, role: member.role as Role }))
    .map((organization) =>
      tokenScoped
        ? {
            ...organization,
            workspaces: organization.workspaces
              .map((workspace) => ({
                ...workspace,
                projects: workspace.projects.filter(
                  (item) => item.id === requestedProject,
                ),
              }))
              .filter((workspace) => workspace.projects.length),
          }
        : organization,
    )
    .filter((organization) => !tokenScoped || organization.workspaces.length)
  const allProjects = organizations.flatMap((org) =>
    org.workspaces.flatMap((workspace) => workspace.projects),
  )
  const project = requestedProject
    ? allProjects.find((item) => item.id === requestedProject)
    : allProjects.find((item) => !item.archivedAt) || allProjects[0]
  assert(
    !requestedProject || project,
    403,
    "This project is not accessible. Choose a project from your organization.",
  )
  const organization =
    organizations.find((org) =>
      org.workspaces.some((workspace) =>
        workspace.projects.some((item) => item.id === project?.id),
      ),
    ) || organizations[0]
  const organizationId = organization?.id || null
  const admin =
    !tokenScoped &&
    organization &&
    ["Owner", "Admin"].includes(organization.role)
  const [
    tests,
    executions,
    requirements,
    environments,
    versions,
    folders,
    sets,
    plans,
    drafts,
    audit,
    members,
    invitations,
    tokens,
    explorations,
    projectMembers,
  ] = await Promise.all([
    project
      ? prisma.test.findMany({
          where: { projectId: project.id },
          include: testInclude,
          orderBy: { createdAt: "desc" },
        })
      : [],
    project
      ? prisma.testExecution.findMany({
          where: { projectId: project.id },
          include: { runs: true },
          orderBy: { createdAt: "desc" },
        })
      : [],
    project
      ? prisma.issue.findMany({
          where: { projectId: project.id },
          orderBy: { key: "asc" },
        })
      : [],
    project
      ? prisma.environment.findMany({
          where: { projectId: project.id },
          orderBy: { name: "asc" },
        })
      : [],
    project
      ? prisma.releaseVersion.findMany({
          where: { projectId: project.id },
          orderBy: { name: "desc" },
        })
      : [],
    project
      ? prisma.folder.findMany({
          where: { projectId: project.id },
          orderBy: { name: "asc" },
        })
      : [],
    project
      ? prisma.testSet.findMany({
          where: { projectId: project.id },
          include: { tests: true },
        })
      : [],
    project
      ? prisma.testPlan.findMany({
          where: { projectId: project.id },
          include: { tests: true, executions: { select: { id: true } } },
        })
      : [],
    project
      ? prisma.testDraft.findMany({
          where: { projectId: project.id },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : [],
    organizationId
      ? prisma.auditLog.findMany({
          where: {
            organizationId,
            ...(!admin && project ? { projectId: project.id } : {}),
          },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      : [],
    admin && organizationId
      ? prisma.organizationMember.findMany({
          where: { organizationId },
          include: { user: { select: { name: true, email: true } } },
        })
      : [],
    admin && organizationId
      ? prisma.invitation.findMany({
          where: { organizationId },
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
            acceptedAt: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : [],
    admin && project
      ? prisma.apiKey.findMany({
          where: { projectId: project.id },
          select: {
            id: true,
            name: true,
            prefix: true,
            scope: true,
            expiresAt: true,
            revokedAt: true,
            lastUsedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : [],
    project
      ? prisma.exploratorySession.findMany({
          where: { projectId: project.id },
          orderBy: { createdAt: "desc" },
        })
      : [],
    project
      ? prisma.projectMember.findMany({
          where: {
            projectId: project.id,
            ...(!admin ? { userId: user.id } : {}),
          },
          select: { id: true, userId: true, role: true },
        })
      : [],
  ])
  const state = {
    user: { id: user.id, name: user.name, email: user.email },
    organizations,
    projectId: project?.id || null,
    role:
      organization && ["Owner", "Admin"].includes(organization.role)
        ? organization.role
        : projectMembers.find((member) => member.userId === user.id)?.role ||
          organization?.role ||
          "Viewer",
    organizationId,
    tests: tests.map((test) => testDto(test, project!.key)),
    executions: executions.map((execution) => ({
      ...execution,
      project: project!.key,
      env: execution.environment,
    })),
    requirements,
    environments,
    versions,
    folders,
    sets: sets.map((set) => ({
      ...set,
      testIds: set.tests.map((test) => test.testId),
    })),
    plans: plans.map((plan) => ({
      ...plan,
      testIds: plan.tests.map((test) => test.testId),
      executionIds: plan.executions.map((execution) => execution.id),
    })),
    drafts: drafts.map((draft) => ({
      ...draft,
      payload: JSON.parse(draft.payload),
    })),
    audit: audit.map((entry) => ({
      ...entry,
      actor: entry.user?.name || "System",
    })),
    members,
    invitations,
    tokens,
    projectMembers,
    explorations: explorations.map((session) => ({
      ...session,
      notes: JSON.parse(session.notes),
    })),
    aiConfigured: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
  }
  return JSON.parse(JSON.stringify(state)) as PlatformState
}
