import { executionStatus } from "@/lib/execution"
import { Prisma, User } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { assert, idSchema, nameSchema } from "./http"
import {
  organizationAccess,
  projectAccess,
  transactionWriteAccess,
} from "./permissions"
import { hashToken, newToken } from "./session"
import type { PlatformState, Role } from "@/lib/types"

const stepSchema = z.object({
  action: z.string().trim().min(1).max(4000),
  data: z.string().max(4000).optional(),
  expected: z.string().max(4000).optional(),
})
const testSchema = z.object({
  summary: nameSchema,
  description: z.string().max(20000).optional(),
  type: z.enum(["Manual", "Cucumber", "Generic"]).default("Manual"),
  priority: z.enum(["Highest", "High", "Medium", "Low"]).default("Medium"),
  status: z.enum(["TODO", "READY", "REVIEW"]).default("TODO"),
  folder: z.string().trim().max(120).default("General"),
  precondition: z.string().max(8000).optional(),
  gherkin: z.string().max(30000).optional(),
  labels: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  steps: z.array(stepSchema).max(100).default([]),
  linkedRequirements: z.array(z.string().max(80)).max(100).default([]),
})
const statuses = z.enum([
  "TODO",
  "PASS",
  "FAIL",
  "EXECUTING",
  "ABORTED",
  "BLOCKED",
])
const draftPayloadSchema = z.object({
  summary: nameSchema,
  steps: z.array(stepSchema).max(100),
  gherkin: z.string().max(30000),
})
export const testInclude = {
  steps: { orderBy: { order: "asc" as const } },
  folder: true,
  requirementLinks: { include: { issue: true } },
  revisions: {
    select: { revision: true, actor: true, createdAt: true },
    orderBy: { revision: "desc" as const },
    take: 20,
  },
  comments: { orderBy: { createdAt: "desc" as const }, take: 100 },
} satisfies Prisma.TestInclude
export function testDto(
  test: Prisma.TestGetPayload<{ include: typeof testInclude }>,
  key: string,
) {
  return {
    ...test,
    steps: test.steps.map((step) => ({
      action: step.action,
      expected: step.expected ?? undefined,
      data: step.data ?? undefined,
    })),
    description: test.description ?? undefined,
    precondition: test.precondition ?? undefined,
    gherkin: test.gherkin ?? undefined,
    status: ["TODO", "READY", "REVIEW"].includes(test.status)
      ? test.status
      : "TODO",
    project: key,
    folder: test.folder?.name || "General",
    labels: test.labels?.split(",").filter(Boolean) || [],
    linkedRequirements: test.requirementLinks.map((link) => link.issue.key),
  }
}
export async function readPlatform(
  user: User,
  requestedProject?: string | null,
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
  const organizations = memberships.map((member) => ({
    ...member.organization,
    role: member.role as Role,
  }))
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
  const admin = organization && ["Owner", "Admin"].includes(organization.role)
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

async function validTestIds(
  tx: Prisma.TransactionClient,
  projectId: string,
  ids: string[],
  includeArchived = false,
) {
  const unique = [...new Set(ids)]
  const count = await tx.test.count({
    where: {
      projectId,
      id: { in: unique },
      ...(includeArchived ? {} : { archivedAt: null }),
    },
  })
  assert(
    count === unique.length,
    400,
    "Select active tests from the current project.",
  )
  return unique
}
async function nextKey(tx: Prisma.TransactionClient, projectId: string) {
  const project = await tx.project.update({
    where: { id: projectId },
    data: { nextIssue: { increment: 1 } },
  })
  return `${project.key}-${project.nextIssue}`
}
async function saveTest(
  tx: Prisma.TransactionClient,
  projectId: string,
  input: unknown,
  user: User,
  id?: string,
) {
  const data = testSchema.parse(input)
  const folder =
    (await tx.folder.findFirst({
      where: { projectId, name: data.folder || "General" },
    })) ||
    (await tx.folder.create({
      data: { projectId, name: data.folder || "General" },
    }))
  const issues = await tx.issue.findMany({
    where: { projectId, key: { in: data.linkedRequirements } },
  })
  assert(
    issues.length === new Set(data.linkedRequirements).size,
    400,
    "A linked requirement is outside this project.",
  )
  const { labels, steps } = data
  const payload = {
    summary: data.summary,
    description: data.description,
    type: data.type,
    priority: data.priority,
    status: data.status,
    precondition: data.precondition,
    gherkin: data.gherkin,
    labels: labels.join(","),
    folderId: folder.id,
  }
  if (id) {
    const existing = await tx.test.findFirst({
      where: { id, projectId },
      include: testInclude,
    })
    assert(existing, 404, "Test not found.")
    assert(!existing.archivedAt, 409, "Restore the test before editing it.")
    const revision = z
      .object({ revision: z.number().int().positive() })
      .parse(input).revision
    const updated = await tx.test.updateMany({
      where: { id, projectId, revision },
      data: { ...payload, revision: { increment: 1 } },
    })
    assert(
      updated.count === 1,
      409,
      "This test changed since you opened it. Refresh and review the latest version before saving.",
    )
    await tx.testRevision.create({
      data: {
        testId: id,
        revision: existing.revision,
        snapshot: JSON.stringify(testDto(existing, "")),
        actor: user.name,
      },
    })
    await tx.testStep.deleteMany({ where: { testId: id } })
    await tx.requirementLink.deleteMany({ where: { testId: id } })
    await tx.test.update({
      where: { id },
      data: {
        steps: { create: steps.map((step, order) => ({ ...step, order })) },
        requirementLinks: {
          create: issues.map((issue) => ({ issueId: issue.id })),
        },
      },
    })
    return existing.id
  }
  const created = await tx.test.create({
    data: {
      ...payload,
      key: await nextKey(tx, projectId),
      projectId,
      steps: { create: steps.map((step, order) => ({ ...step, order })) },
      requirementLinks: {
        create: issues.map((issue) => ({ issueId: issue.id })),
      },
    },
  })
  return created.id
}

export async function mutatePlatform(user: User, body: unknown) {
  const { action, projectId, organizationId, input } = z
    .object({
      action: z.string().max(80),
      projectId: idSchema.optional(),
      organizationId: idSchema.optional(),
      input: z.unknown().default({}),
    })
    .parse(body)
  if (action === "organization.create") {
    const { name } = z.object({ name: nameSchema }).parse(input)
    return prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name,
          members: { create: { userId: user.id, role: "Owner" } },
          workspaces: { create: { name: "Main workspace" } },
        },
      })
      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          action,
          entity: "Organization",
          entityId: organization.id,
        },
      })
      return organization
    })
  }
  if (
    action.startsWith("organization.") ||
    action.startsWith("workspace.") ||
    action.startsWith("project.") ||
    action.startsWith("member.") ||
    action.startsWith("invitation.")
  ) {
    assert(organizationId, 400, "Choose an organization.")
    await organizationAccess(user.id, organizationId, true, true)
    return prisma.$transaction(async (tx) => {
      const member = await tx.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: user.id } },
      })
      assert(
        member && ["Owner", "Admin"].includes(member.role),
        403,
        "Your organization administration access has changed.",
      )
      let result: unknown
      let entityId = organizationId
      if (action === "organization.update") {
        const { name } = z.object({ name: nameSchema }).parse(input)
        result = await tx.organization.update({
          where: { id: organizationId },
          data: { name },
        })
      } else if (action === "workspace.create") {
        const { name } = z.object({ name: nameSchema }).parse(input)
        result = await tx.workspace.create({ data: { name, organizationId } })
      } else if (action === "workspace.update") {
        const { id, name } = z
          .object({ id: idSchema, name: nameSchema })
          .parse(input)
        assert(
          await tx.workspace.findFirst({ where: { id, organizationId } }),
          404,
          "Workspace not found.",
        )
        result = await tx.workspace.update({ where: { id }, data: { name } })
        entityId = id
      } else if (action === "project.create") {
        const data = z
          .object({
            workspaceId: idSchema,
            name: nameSchema,
            key: z
              .string()
              .trim()
              .regex(
                /^[A-Z][A-Z0-9]{1,9}$/,
                "Use 2–10 uppercase letters or digits, starting with a letter.",
              ),
            description: z.string().max(4000).optional(),
          })
          .parse(input)
        assert(
          await tx.workspace.findFirst({
            where: { id: data.workspaceId, organizationId },
          }),
          403,
          "Workspace is outside this organization.",
        )
        result = await tx.project.create({ data })
      } else if (action === "project.update") {
        const data = z
          .object({
            id: idSchema,
            name: nameSchema.optional(),
            description: z.string().max(4000).optional(),
            archived: z.boolean().optional(),
          })
          .parse(input)
        assert(
          await tx.project.findFirst({
            where: { id: data.id, workspace: { organizationId } },
          }),
          404,
          "Project not found.",
        )
        result = await tx.project.update({
          where: { id: data.id },
          data: {
            name: data.name,
            description: data.description,
            ...(data.archived !== undefined
              ? { archivedAt: data.archived ? new Date() : null }
              : {}),
          },
        })
        entityId = data.id
      } else if (action === "member.project") {
        const data = z
          .object({
            userId: idSchema,
            projectId: idSchema,
            role: z.enum(["Tester", "Viewer"]).nullable(),
          })
          .parse(input)
        assert(
          await tx.project.findFirst({
            where: { id: data.projectId, workspace: { organizationId } },
          }),
          404,
          "Project is outside this organization.",
        )
        const target = await tx.organizationMember.findUnique({
          where: {
            organizationId_userId: { organizationId, userId: data.userId },
          },
        })
        assert(
          target && !["Owner", "Admin"].includes(target.role),
          400,
          "Project overrides apply only to testers and viewers in this organization.",
        )
        if (data.role)
          result = await tx.projectMember.upsert({
            where: {
              userId_projectId: {
                userId: data.userId,
                projectId: data.projectId,
              },
            },
            create: {
              userId: data.userId,
              projectId: data.projectId,
              role: data.role,
            },
            update: { role: data.role },
          })
        else {
          await tx.projectMember.deleteMany({
            where: { userId: data.userId, projectId: data.projectId },
          })
          result = { ok: true }
        }
        entityId = data.userId
      } else if (action === "member.update" || action === "member.remove") {
        const data = z
          .object({
            id: idSchema,
            role: z.enum(["Admin", "Tester", "Viewer"]).optional(),
          })
          .parse(input)
        const target = await tx.organizationMember.findFirst({
          where: { id: data.id, organizationId },
        })
        assert(target, 404, "Member not found.")
        assert(
          target.role !== "Owner",
          409,
          "The organization owner cannot be removed or demoted here.",
        )
        assert(
          member.role === "Owner" ||
            (target.role !== "Admin" && data.role !== "Admin"),
          403,
          "Only an owner can manage administrators.",
        )
        if (action === "member.remove") {
          result = await tx.organizationMember.delete({
            where: { id: target.id },
          })
          await tx.projectMember.deleteMany({
            where: {
              userId: target.userId,
              project: { workspace: { organizationId } },
            },
          })
          await tx.session.deleteMany({ where: { userId: target.userId } })
        } else {
          assert(data.role, 400, "Select a role.")
          result = await tx.organizationMember.update({
            where: { id: target.id },
            data: { role: data.role },
          })
        }
        entityId = target.id
      } else if (action === "invitation.create") {
        const data = z
          .object({
            email: z.email().transform((email) => email.toLowerCase()),
            role: z.enum(["Admin", "Tester", "Viewer"]),
          })
          .parse(input)
        assert(
          member.role === "Owner" || data.role !== "Admin",
          403,
          "Only an owner can invite administrators.",
        )
        const existing = await tx.organizationMember.findFirst({
          where: { organizationId, user: { email: data.email } },
        })
        assert(!existing, 409, "This person is already a member.")
        await tx.invitation.updateMany({
          where: { organizationId, email: data.email, acceptedAt: null },
          data: { expiresAt: new Date() },
        })
        const token = newToken()
        const invitation = await tx.invitation.create({
          data: {
            organizationId,
            email: data.email,
            role: data.role,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + 7 * 86400_000),
          },
        })
        result = { id: invitation.id, token }
        entityId = invitation.id
      } else if (action === "invitation.revoke") {
        const { id } = z.object({ id: idSchema }).parse(input)
        assert(
          await tx.invitation.findFirst({ where: { id, organizationId } }),
          404,
          "Invitation not found.",
        )
        result = await tx.invitation.update({
          where: { id },
          data: { expiresAt: new Date() },
        })
        entityId = id
      } else assert(false, 400, "Unknown administration action.")
      await tx.auditLog.create({
        data: {
          organizationId,
          userId: user.id,
          action,
          entity: action.split(".")[0],
          entityId,
        },
      })
      return result
    })
  }
  assert(projectId, 400, "Choose a project.")
  const isAdmin = /^(environment|version|token|legacy)\./.test(action)
  const access = await projectAccess(user.id, projectId, true, isAdmin)
  if (action === "draft.generate") {
    const data = z
      .object({
        source: z
          .string()
          .trim()
          .min(20, "Add at least 20 characters of requirements.")
          .max(12000),
        type: z.enum(["Manual", "Cucumber", "Generic"]),
        mode: z.enum(["template", "openai"]),
        requirementKey: z.string().max(80).optional(),
      })
      .parse(input)
    if (data.requirementKey)
      assert(
        await prisma.issue.findFirst({
          where: { projectId, key: data.requirementKey },
        }),
        400,
        "Requirement is outside this project.",
      )
    const { generateDraft } = await import("./drafts")
    const payload = await generateDraft(data)
    return prisma.$transaction(async (tx) => {
      // Recheck permissions after a potentially long model request.
      await transactionWriteAccess(tx, user.id, projectId)
      const draft = await tx.testDraft.create({
        data: {
          projectId,
          source: data.source,
          type: data.type,
          mode: data.mode,
          requirementKey: data.requirementKey,
          payload: JSON.stringify(payload),
          createdBy: user.name,
        },
      })
      await tx.auditLog.create({
        data: {
          organizationId: access.organizationId,
          projectId,
          userId: user.id,
          action,
          entity: "Draft",
          entityId: draft.id,
        },
      })
      return draft
    })
  }
  return prisma.$transaction(
    async (tx) => {
      await transactionWriteAccess(tx, user.id, projectId, isAdmin)
      let result: unknown
      let entityId = projectId
      if (action === "legacy.import") {
        const legacyTest = testSchema.extend({ id: z.string().optional() })
        const data = z
          .object({
            tests: z.array(legacyTest).min(1).max(200),
            executions: z
              .array(
                z.object({
                  name: nameSchema,
                  env: nameSchema.optional(),
                  version: z.string().max(120).optional(),
                  runs: z
                    .array(
                      z.object({
                        testId: idSchema,
                        status: statuses,
                        comment: z.string().max(8000).optional(),
                        defects: z.string().max(1000).optional(),
                      }),
                    )
                    .max(500),
                }),
              )
              .max(200)
              .default([]),
          })
          .parse(input)
        const ids = new Map<string, string>()
        for (const [index, test] of data.tests.entries()) {
          const id = await saveTest(tx, projectId, test, user)
          ids.set(test.id || String(index), id)
        }
        for (const execution of data.executions) {
          const env = execution.env || "Staging"
          if (
            !(await tx.environment.findFirst({
              where: { projectId, name: env },
            }))
          )
            await tx.environment.create({ data: { projectId, name: env } })
          const runs = execution.runs.map((run) => {
            const testId = ids.get(run.testId)
            assert(
              testId,
              400,
              "An execution references a test not included in this import.",
            )
            return { ...run, testId }
          })
          await tx.testExecution.create({
            data: {
              projectId,
              key: await nextKey(tx, projectId),
              name: execution.name,
              environment: env,
              version: execution.version,
              status: executionStatus(runs),
              runs: { create: runs },
            },
          })
        }
        result = { tests: ids.size, executions: data.executions.length }
      } else if (action === "token.create") {
        const data = z
          .object({
            name: nameSchema,
            scope: z.enum(["read", "write"]),
            days: z.number().int().min(1).max(90),
          })
          .parse(input)
        const token = `btr_${newToken()}`
        const created = await tx.apiKey.create({
          data: {
            projectId,
            userId: user.id,
            name: data.name,
            scope: data.scope,
            prefix: token.slice(0, 12),
            token: hashToken(token),
            expiresAt: new Date(Date.now() + data.days * 86400_000),
          },
        })
        result = { id: created.id, token }
        entityId = created.id
      } else if (action === "token.revoke") {
        const { id } = z.object({ id: idSchema }).parse(input)
        assert(
          await tx.apiKey.findFirst({ where: { id, projectId } }),
          404,
          "Token not found.",
        )
        await tx.apiKey.update({
          where: { id },
          data: { revokedAt: new Date() },
        })
        result = { id }
        entityId = id
      } else if (action === "exploration.create") {
        const data = z
          .object({
            title: nameSchema,
            charter: z.string().trim().min(10).max(8000),
          })
          .parse(input)
        result = await tx.exploratorySession.create({
          data: {
            ...data,
            projectId,
            createdBy: user.name,
            lastStartedAt: new Date(),
          },
        })
      } else if (
        action === "exploration.update" ||
        action === "exploration.defect"
      ) {
        const data = z
          .object({
            id: idSchema,
            revision: z.number().int().positive(),
            status: z.enum(["Running", "Paused", "Finished"]).optional(),
            note: z.string().trim().min(1).max(8000).optional(),
            noteId: idSchema.optional(),
          })
          .parse(input)
        const session = await tx.exploratorySession.findFirst({
          where: { id: data.id, projectId },
        })
        assert(session, 404, "Session not found.")
        assert(
          session.status !== "Finished",
          409,
          "This session is finished. Start a new session to continue testing.",
        )
        const notes = JSON.parse(session.notes) as {
          id: string
          text: string
          createdAt: string
          defectKey?: string
        }[]
        if (data.note) {
          assert(
            notes.length < 200,
            400,
            "A session can contain up to 200 notes.",
          )
          notes.push({
            id: newToken().slice(0, 16),
            text: data.note,
            createdAt: new Date().toISOString(),
          })
        }
        if (action === "exploration.defect") {
          const note = notes.find((note) => note.id === data.noteId)
          assert(note, 400, "Select a note from this session.")
          assert(
            !note.defectKey,
            409,
            "This note is already linked to a defect.",
          )
          const issue = await tx.issue.create({
            data: {
              projectId,
              key: await nextKey(tx, projectId),
              type: "Bug",
              summary: note.text.slice(0, 200),
              description: `Exploratory session: ${session.title}\n${session.charter}\n\n${note.text}`,
            },
          })
          note.defectKey = issue.key
        }
        const now = new Date()
        let durationSeconds = session.durationSeconds
        let lastStartedAt = session.lastStartedAt
        if (data.status && data.status !== session.status) {
          if (session.status === "Running" && session.lastStartedAt)
            durationSeconds += Math.floor(
              (now.getTime() - session.lastStartedAt.getTime()) / 1000,
            )
          lastStartedAt = data.status === "Running" ? now : null
        }
        const changed = await tx.exploratorySession.updateMany({
          where: { id: session.id, revision: data.revision },
          data: {
            notes: JSON.stringify(notes),
            status: data.status,
            durationSeconds,
            lastStartedAt,
            revision: { increment: 1 },
          },
        })
        assert(
          changed.count === 1,
          409,
          "This exploratory session changed. Refresh before saving.",
        )
        result = { id: session.id }
        entityId = session.id
      } else if (action === "test.import") {
        const data = z
          .object({ tests: z.array(testSchema).min(1).max(200) })
          .parse(input)
        const ids: string[] = []
        for (const test of data.tests)
          ids.push(await saveTest(tx, projectId, test, user))
        result = { ids }
        entityId = ids[0]
      } else if (action === "test.create" || action === "test.update") {
        const id =
          action === "test.update"
            ? z.object({ id: idSchema }).parse(input).id
            : undefined
        entityId = await saveTest(tx, projectId, input, user, id)
        result = { id: entityId }
      } else if (action === "test.restore") {
        const data = z
          .object({
            id: idSchema,
            sourceRevision: z.number().int().positive(),
            revision: z.number().int().positive(),
          })
          .parse(input)
        assert(
          await tx.test.findFirst({ where: { id: data.id, projectId } }),
          404,
          "Test not found.",
        )
        const previous = await tx.testRevision.findUnique({
          where: {
            testId_revision: { testId: data.id, revision: data.sourceRevision },
          },
        })
        assert(previous, 404, "Revision not found.")
        const id = await saveTest(
          tx,
          projectId,
          { ...JSON.parse(previous.snapshot), revision: data.revision },
          user,
          data.id,
        )
        entityId = id
        result = { id }
      } else if (action === "test.bulk") {
        const data = z
          .object({
            ids: z.array(idSchema).min(1).max(200),
            archived: z.boolean().optional(),
            priority: z.enum(["Highest", "High", "Medium", "Low"]).optional(),
            folder: z.string().trim().min(1).max(120).optional(),
          })
          .parse(input)
        const existing = await tx.test.findMany({
          where: { projectId, id: { in: data.ids } },
          include: testInclude,
        })
        assert(
          existing.length === new Set(data.ids).size,
          400,
          "Select tests from the current project.",
        )
        let folderId: string | undefined
        if (data.folder)
          folderId = (
            (await tx.folder.findFirst({
              where: { projectId, name: data.folder },
            })) ||
            (await tx.folder.create({ data: { projectId, name: data.folder } }))
          ).id
        for (const test of existing)
          await tx.testRevision.create({
            data: {
              testId: test.id,
              revision: test.revision,
              snapshot: JSON.stringify(testDto(test, access.project.key)),
              actor: user.name,
            },
          })
        result = await tx.test.updateMany({
          where: { projectId, id: { in: data.ids } },
          data: {
            ...(data.archived !== undefined
              ? { archivedAt: data.archived ? new Date() : null }
              : {}),
            priority: data.priority,
            folderId,
            revision: { increment: 1 },
          },
        })
      } else if (action === "test.comment") {
        const { id, body } = z
          .object({ id: idSchema, body: z.string().trim().min(1).max(8000) })
          .parse(input)
        assert(
          await tx.test.findFirst({ where: { id, projectId } }),
          404,
          "Test not found.",
        )
        result = await tx.testComment.create({
          data: { testId: id, body, actor: user.name },
        })
        entityId = id
      } else if (action === "folder.create") {
        const { name } = z.object({ name: nameSchema }).parse(input)
        assert(
          !(await tx.folder.findFirst({ where: { projectId, name } })),
          409,
          "A folder with this name already exists.",
        )
        result = await tx.folder.create({ data: { projectId, name } })
      } else if (action === "requirement.create") {
        const data = z
          .object({
            summary: nameSchema,
            type: z.enum(["Story", "Bug", "Task"]).default("Story"),
            priority: z
              .enum(["Highest", "High", "Medium", "Low"])
              .default("Medium"),
          })
          .parse(input)
        result = await tx.issue.create({
          data: { ...data, projectId, key: await nextKey(tx, projectId) },
        })
      } else if (action === "execution.create") {
        const data = z
          .object({
            name: nameSchema,
            testIds: z.array(idSchema).min(1).max(500),
            env: nameSchema,
            version: z.string().max(120).optional(),
            planId: idSchema.optional(),
          })
          .parse(input)
        const ids = await validTestIds(tx, projectId, data.testIds)
        assert(
          await tx.environment.findFirst({
            where: { projectId, name: data.env, archivedAt: null },
          }),
          400,
          "Select an active environment in this project.",
        )
        if (data.planId)
          assert(
            await tx.testPlan.findFirst({
              where: { id: data.planId, projectId },
            }),
            400,
            "Plan is outside this project.",
          )
        result = await tx.testExecution.create({
          data: {
            key: await nextKey(tx, projectId),
            projectId,
            name: data.name,
            environment: data.env,
            version: data.version,
            testPlanId: data.planId,
            runs: { create: ids.map((testId) => ({ testId })) },
          },
        })
      } else if (action === "execution.update") {
        const data = z
          .object({
            id: idSchema,
            revision: z.number().int(),
            testId: idSchema.optional(),
            status: statuses.optional(),
            comment: z.string().max(8000).optional(),
            defects: z.string().max(1000).optional(),
            notes: z.string().max(20000).optional(),
            bulkPass: z.boolean().optional(),
          })
          .parse(input)
        const changed = await tx.testExecution.updateMany({
          where: { id: data.id, projectId, revision: data.revision },
          data: { revision: { increment: 1 }, notes: data.notes },
        })
        assert(
          changed.count === 1,
          409,
          "This execution changed. Refresh before saving.",
        )
        if (data.bulkPass)
          await tx.testRun.updateMany({
            where: { executionId: data.id },
            data: {
              status: "PASS",
              executedBy: user.name,
              executedAt: new Date(),
            },
          })
        if (data.testId) {
          const run = await tx.testRun.findUnique({
            where: {
              testId_executionId: { testId: data.testId, executionId: data.id },
            },
          })
          assert(run, 400, "This test is not part of the execution.")
          await tx.testRun.update({
            where: { id: run.id },
            data: {
              status: data.status,
              comment: data.comment,
              defects: data.defects,
              executedBy: user.name,
              executedAt: new Date(),
            },
          })
        }
        const runs = await tx.testRun.findMany({
          where: { executionId: data.id },
        })
        const status = executionStatus(runs)
        result = await tx.testExecution.update({
          where: { id: data.id },
          data: { status },
        })
        entityId = data.id
      } else if (action === "environment.save") {
        const data = z
          .object({
            id: idSchema.optional(),
            name: nameSchema,
            description: z.string().max(2000).default(""),
            baseUrl: z
              .union([
                z.literal(""),
                z
                  .url()
                  .refine(
                    (url) =>
                      ["http:", "https:"].includes(new URL(url).protocol),
                    "Use an HTTP or HTTPS URL.",
                  ),
              ])
              .default(""),
            region: z.string().max(150).default(""),
          })
          .parse(input)
        const { id, ...fields } = data
        if (id) {
          const previous = await tx.environment.findFirst({
            where: { id, projectId },
          })
          assert(previous, 404, "Environment not found.")
          await tx.testExecution.updateMany({
            where: { projectId, environment: previous.name },
            data: { environment: data.name },
          })
          result = await tx.environment.update({ where: { id }, data: fields })
          entityId = id
        } else
          result = await tx.environment.create({
            data: { projectId, ...fields },
          })
      } else if (action === "environment.archive") {
        const data = z
          .object({ id: idSchema, archived: z.boolean() })
          .parse(input)
        assert(
          await tx.environment.findFirst({ where: { id: data.id, projectId } }),
          404,
          "Environment not found.",
        )
        result = await tx.environment.update({
          where: { id: data.id },
          data: { archivedAt: data.archived ? new Date() : null },
        })
        entityId = data.id
      } else if (action === "version.save") {
        const data = z
          .object({
            id: idSchema.optional(),
            name: nameSchema,
            status: z.enum(["Planned", "In Progress", "Released"]),
            description: z.string().max(2000).optional(),
          })
          .parse(input)
        if (data.id) {
          const previous = await tx.releaseVersion.findFirst({
            where: { id: data.id, projectId },
          })
          assert(previous, 404, "Version not found.")
          await tx.testExecution.updateMany({
            where: { projectId, version: previous.name },
            data: { version: data.name },
          })
          result = await tx.releaseVersion.update({
            where: { id: data.id },
            data: {
              name: data.name,
              status: data.status,
              description: data.description,
            },
          })
        } else
          result = await tx.releaseVersion.create({
            data: {
              projectId,
              name: data.name,
              status: data.status,
              description: data.description,
            },
          })
      } else if (
        action === "collection.save" ||
        action === "collection.clone"
      ) {
        const data = z
          .object({
            id: idSchema.optional(),
            kind: z.enum(["set", "plan"]),
            name: nameSchema,
            testIds: z.array(idSchema).max(500),
          })
          .parse(input)
        const ids = await validTestIds(tx, projectId, data.testIds, true)
        if (data.kind === "set") {
          if (data.id && action !== "collection.clone") {
            assert(
              await tx.testSet.findFirst({ where: { id: data.id, projectId } }),
              404,
              "Set not found.",
            )
            await tx.testSetTest.deleteMany({ where: { testSetId: data.id } })
            result = await tx.testSet.update({
              where: { id: data.id },
              data: {
                name: data.name,
                tests: { create: ids.map((testId) => ({ testId })) },
              },
            })
          } else
            result = await tx.testSet.create({
              data: {
                projectId,
                key: await nextKey(tx, projectId),
                name: data.name,
                tests: { create: ids.map((testId) => ({ testId })) },
              },
            })
        } else {
          if (data.id && action !== "collection.clone") {
            assert(
              await tx.testPlan.findFirst({
                where: { id: data.id, projectId },
              }),
              404,
              "Plan not found.",
            )
            await tx.testPlanTest.deleteMany({ where: { testPlanId: data.id } })
            result = await tx.testPlan.update({
              where: { id: data.id },
              data: {
                name: data.name,
                tests: { create: ids.map((testId) => ({ testId })) },
              },
            })
          } else
            result = await tx.testPlan.create({
              data: {
                projectId,
                key: await nextKey(tx, projectId),
                name: data.name,
                tests: { create: ids.map((testId) => ({ testId })) },
              },
            })
        }
      } else if (action === "draft.approve") {
        const data = z
          .object({
            id: idSchema,
            payload: draftPayloadSchema,
            reviewed: z.literal(true),
          })
          .parse(input)
        const draft = await tx.testDraft.findFirst({
          where: { id: data.id, projectId },
        })
        assert(draft, 404, "Draft not found.")
        assert(
          !draft.approvedTestId,
          409,
          "This draft has already been approved.",
        )
        if (draft.type === "Cucumber")
          assert(
            data.payload.gherkin.trim().length >= 20 &&
              !data.payload.gherkin.includes("# Review this scaffold"),
            400,
            "Review the Gherkin scaffold and replace its placeholders before approval.",
          )
        else
          assert(
            data.payload.steps.length > 0 &&
              data.payload.steps.every(
                (step) =>
                  step.action.trim() &&
                  step.expected?.trim() &&
                  !step.expected.startsWith("Define the expected result"),
              ),
            400,
            "Add concrete expected results for every step before approval.",
          )
        const id = await saveTest(
          tx,
          projectId,
          {
            ...data.payload,
            type: draft.type,
            status: "READY",
            folder: "AI Generated",
            linkedRequirements: draft.requirementKey
              ? [draft.requirementKey]
              : [],
          },
          user,
        )
        await tx.testDraft.update({
          where: { id: draft.id },
          data: {
            approvedTestId: id,
            approvedBy: user.name,
            payload: JSON.stringify(data.payload),
          },
        })
        result = { id }
        entityId = id
      } else assert(false, 400, "Unknown project action.")
      await tx.auditLog.create({
        data: {
          organizationId: access.organizationId,
          projectId,
          userId: user.id,
          action,
          entity: action.split(".")[0],
          entityId,
          detail: action === "test.bulk" ? JSON.stringify(input) : undefined,
        },
      })
      return result
    },
    { timeout: 15000 },
  )
}
