import { prisma } from "@/lib/db"
import { assert } from "./http"

export async function organizationAccess(
  userId: string,
  organizationId: string,
  write = false,
  admin = false,
) {
  const member = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  })
  assert(member, 403, "You do not have access to this organization.")
  if (write)
    assert(member.role !== "Viewer", 403, "Your role has read-only access.")
  if (admin)
    assert(
      ["Owner", "Admin"].includes(member.role),
      403,
      "An organization administrator must make this change.",
    )
  return member
}
export async function projectAccess(
  userId: string,
  projectId: string,
  write = false,
  admin = false,
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { workspace: true },
  })
  assert(project?.workspace, 404, "Project not found in your organization.")
  const member = await organizationAccess(
    userId,
    project.workspace.organizationId,
    false,
    admin,
  )
  const override = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  })
  const effectiveRole = ["Owner", "Admin"].includes(member.role)
    ? member.role
    : override?.role || member.role
  if (write)
    assert(
      effectiveRole !== "Viewer",
      403,
      "Your role has read-only access to this project.",
    )
  if (write)
    assert(
      !project.archivedAt,
      409,
      "Restore this project before changing its records.",
    )
  return {
    project,
    member,
    effectiveRole,
    organizationId: project.workspace.organizationId,
  }
}

export async function transactionWriteAccess(
  tx: import("@prisma/client").Prisma.TransactionClient,
  userId: string,
  projectId: string,
  admin = false,
) {
  const project = await tx.project.findUnique({
    where: { id: projectId },
    include: { workspace: true },
  })
  assert(
    project?.workspace && !project.archivedAt,
    409,
    "The project is archived or no longer available.",
  )
  const member = await tx.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: project.workspace.organizationId,
        userId,
      },
    },
  })
  assert(member, 403, "Your organization access has changed.")
  const override = await tx.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  })
  const effectiveRole = ["Owner", "Admin"].includes(member.role)
    ? member.role
    : override?.role || member.role
  assert(
    effectiveRole !== "Viewer",
    403,
    "Your role has read-only access to this project.",
  )
  if (admin)
    assert(
      ["Owner", "Admin"].includes(member.role),
      403,
      "An administrator must make this change.",
    )
}
