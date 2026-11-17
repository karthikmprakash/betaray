import { z } from "zod"
import { assert, idSchema, nameSchema } from "../http"
import { hashToken, newToken } from "../session"
import { organizationOp, userOp, type OrganizationContext } from "./core"

userOp({
  name: "organization.create",
  summary: "Create an organization with a first workspace; you become its owner.",
  access: "write",
  interactiveOnly: true,
  input: z.object({ name: nameSchema }),
  async handler({ db, user, audit }, { name }) {
    const organization = await db.organization.create({
      data: {
        name,
        members: { create: { userId: user.id, role: "Owner" } },
        workspaces: { create: { name: "Main workspace" } },
      },
    })
    audit.organizationId = organization.id
    return organization
  },
})

userOp({
  name: "organization.list",
  summary: "List the organizations, workspaces and projects you can access.",
  access: "read",
  input: z.object({}),
  async handler({ db, user }) {
    const memberships = await db.organizationMember.findMany({
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
    return memberships.map((member) => ({
      id: member.organization.id,
      name: member.organization.name,
      role: member.role,
      workspaces: member.organization.workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        projects: workspace.projects.map((project) => ({
          id: project.id,
          key: project.key,
          name: project.name,
          archived: !!project.archivedAt,
        })),
      })),
    }))
  },
})

organizationOp({
  name: "organization.update",
  summary: "Rename an organization.",
  access: "admin",
  input: z.object({ name: nameSchema }),
  handler: ({ db, organizationId }, { name }) =>
    db.organization.update({ where: { id: organizationId }, data: { name } }),
})

organizationOp({
  name: "workspace.create",
  summary: "Create a workspace in an organization.",
  access: "admin",
  input: z.object({ name: nameSchema }),
  handler: ({ db, organizationId }, { name }) =>
    db.workspace.create({ data: { name, organizationId } }),
})

organizationOp({
  name: "workspace.update",
  summary: "Rename a workspace.",
  access: "admin",
  input: z.object({ id: idSchema, name: nameSchema }),
  async handler({ db, organizationId, audit }, { id, name }) {
    assert(
      await db.workspace.findFirst({ where: { id, organizationId } }),
      404,
      "Workspace not found.",
    )
    audit.entityId = id
    return db.workspace.update({ where: { id }, data: { name } })
  },
})

organizationOp({
  name: "project.create",
  summary: "Create a project in a workspace.",
  access: "admin",
  input: z.object({
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
  }),
  async handler({ db, organizationId, audit }, data) {
    assert(
      await db.workspace.findFirst({
        where: { id: data.workspaceId, organizationId },
      }),
      403,
      "Workspace is outside this organization.",
    )
    const project = await db.project.create({ data })
    audit.entityId = project.id
    return project
  },
})

organizationOp({
  name: "project.update",
  summary: "Rename, describe, archive or restore a project.",
  access: "admin",
  input: z.object({
    id: idSchema,
    name: nameSchema.optional(),
    description: z.string().max(4000).optional(),
    archived: z.boolean().optional(),
  }),
  async handler({ db, organizationId, audit }, data) {
    assert(
      await db.project.findFirst({
        where: { id: data.id, workspace: { organizationId } },
      }),
      404,
      "Project not found.",
    )
    audit.entityId = data.id
    return db.project.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description,
        ...(data.archived !== undefined
          ? { archivedAt: data.archived ? new Date() : null }
          : {}),
      },
    })
  },
})

organizationOp({
  name: "member.project",
  summary:
    "Give a tester or viewer a different role on one project, or clear the override with role null.",
  access: "admin",
  input: z.object({
    userId: idSchema,
    projectId: idSchema,
    role: z.enum(["Tester", "Viewer"]).nullable(),
  }),
  async handler({ db, organizationId, audit }, data) {
    assert(
      await db.project.findFirst({
        where: { id: data.projectId, workspace: { organizationId } },
      }),
      404,
      "Project is outside this organization.",
    )
    const target = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: data.userId } },
    })
    assert(
      target && !["Owner", "Admin"].includes(target.role),
      400,
      "Project overrides apply only to testers and viewers in this organization.",
    )
    audit.entityId = data.userId
    const where = { userId: data.userId, projectId: data.projectId }
    if (!data.role) {
      await db.projectMember.deleteMany({ where })
      return { ok: true }
    }
    return db.projectMember.upsert({
      where: { userId_projectId: where },
      create: { ...where, role: data.role },
      update: { role: data.role },
    })
  },
})

const memberTarget = async (
  context: OrganizationContext,
  id: string,
  role?: string,
) => {
  const target = await context.db.organizationMember.findFirst({
    where: { id, organizationId: context.organizationId },
  })
  assert(target, 404, "Member not found.")
  assert(
    target.role !== "Owner",
    409,
    "The organization owner cannot be removed or demoted here.",
  )
  assert(
    context.member.role === "Owner" ||
      (target.role !== "Admin" && role !== "Admin"),
    403,
    "Only an owner can manage administrators.",
  )
  context.audit.entityId = target.id
  return target
}

organizationOp({
  name: "member.update",
  summary: "Change a member's organization role.",
  access: "admin",
  input: z.object({
    id: idSchema,
    role: z.enum(["Admin", "Tester", "Viewer"]),
  }),
  async handler(context, { id, role }) {
    const target = await memberTarget(context, id, role)
    return context.db.organizationMember.update({
      where: { id: target.id },
      data: { role },
    })
  },
})

organizationOp({
  name: "member.remove",
  summary: "Remove a member from the organization and end their sessions.",
  access: "admin",
  input: z.object({ id: idSchema }),
  async handler(context, { id }) {
    const { db, organizationId } = context
    const target = await memberTarget(context, id)
    const removed = await db.organizationMember.delete({
      where: { id: target.id },
    })
    await db.projectMember.deleteMany({
      where: {
        userId: target.userId,
        project: { workspace: { organizationId } },
      },
    })
    await db.session.deleteMany({ where: { userId: target.userId } })
    return removed
  },
})

organizationOp({
  name: "invitation.create",
  summary: "Invite someone to the organization by email. Returns a single-use token.",
  access: "admin",
  interactiveOnly: true,
  input: z.object({
    email: z.email().transform((email) => email.toLowerCase()),
    role: z.enum(["Admin", "Tester", "Viewer"]),
  }),
  async handler({ db, organizationId, member, audit }, data) {
    assert(
      member.role === "Owner" || data.role !== "Admin",
      403,
      "Only an owner can invite administrators.",
    )
    const existing = await db.organizationMember.findFirst({
      where: { organizationId, user: { email: data.email } },
    })
    assert(!existing, 409, "This person is already a member.")
    await db.invitation.updateMany({
      where: { organizationId, email: data.email, acceptedAt: null },
      data: { expiresAt: new Date() },
    })
    const token = newToken()
    const invitation = await db.invitation.create({
      data: {
        organizationId,
        email: data.email,
        role: data.role,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 7 * 86400_000),
      },
    })
    audit.entityId = invitation.id
    return { id: invitation.id, token }
  },
})

organizationOp({
  name: "invitation.revoke",
  summary: "Revoke a pending invitation.",
  access: "admin",
  input: z.object({ id: idSchema }),
  async handler({ db, organizationId, audit }, { id }) {
    assert(
      await db.invitation.findFirst({ where: { id, organizationId } }),
      404,
      "Invitation not found.",
    )
    audit.entityId = id
    return db.invitation.update({
      where: { id },
      data: { expiresAt: new Date() },
    })
  },
})
