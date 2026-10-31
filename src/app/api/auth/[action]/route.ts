import { z } from "zod"
import { prisma } from "@/lib/db"
import {
  assert,
  failure,
  jsonBody,
  sameOrigin,
  nameSchema,
} from "@/lib/server/http"
import {
  createSession,
  logout,
  passwordHash,
  passwordMatches,
  requireUser,
  throttle,
  hashToken,
} from "@/lib/server/session"
import { demoUser } from "@/lib/server/bootstrap"

const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),
  password: z.string().min(12, "Use at least 12 characters.").max(256),
  name: nameSchema.optional(),
  organization: nameSchema.optional(),
  invitationToken: z.string().min(20).max(100).optional(),
})
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    sameOrigin(request)
    const { action } = await params
    if (action === "logout") {
      await logout()
      return Response.json({ ok: true })
    }
    if (action === "demo") {
      assert(
        process.env.NODE_ENV !== "production" &&
          process.env.ALLOW_LOCAL_DEMO === "true" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(
            new URL(request.url).hostname,
          ),
        403,
        "Local demo is available only on a development server at localhost.",
      )
      const user = await demoUser()
      await createSession(user.id)
      return Response.json({ ok: true })
    }
    if (action === "password") {
      const user = await requireUser()
      await throttle(`password:${user.id}`)
      const data = z
        .object({
          currentPassword: z.string().max(256),
          newPassword: z
            .string()
            .min(12, "Use at least 12 characters.")
            .max(256),
        })
        .parse(await jsonBody(request))
      assert(
        user.passwordHash,
        400,
        "The local demo account does not use a password.",
      )
      assert(
        await passwordMatches(data.currentPassword, user.passwordHash),
        401,
        "Current password is incorrect.",
      )
      const encoded = await passwordHash(data.newPassword)
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: encoded },
        }),
        prisma.session.deleteMany({ where: { userId: user.id } }),
      ])
      await createSession(user.id)
      return Response.json({ ok: true })
    }
    if (action === "accept-invitation") {
      const user = await requireUser()
      const { token } = z
        .object({ token: z.string().min(20).max(100) })
        .parse(await jsonBody(request))
      const organizationId = await prisma.$transaction(async (tx) => {
        const invitation = await tx.invitation.findUnique({
          where: { tokenHash: hashToken(token) },
        })
        assert(
          invitation &&
            !invitation.acceptedAt &&
            invitation.expiresAt > new Date(),
          400,
          "This invitation is expired or has already been used.",
        )
        assert(
          user.email === invitation.email,
          403,
          "Sign in with the email address on the invitation.",
        )
        await tx.organizationMember.upsert({
          where: {
            organizationId_userId: {
              organizationId: invitation.organizationId,
              userId: user.id,
            },
          },
          create: {
            organizationId: invitation.organizationId,
            userId: user.id,
            role: invitation.role,
          },
          update: {},
        })
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        })
        await tx.auditLog.create({
          data: {
            organizationId: invitation.organizationId,
            userId: user.id,
            action: "Accepted invitation",
            entity: "Membership",
            entityId: invitation.id,
          },
        })
        return invitation.organizationId
      })
      const project = await prisma.project.findFirst({
        where: { workspace: { organizationId }, archivedAt: null },
        orderBy: { createdAt: "asc" },
      })
      return Response.json({ ok: true, projectId: project?.id || null })
    }
    assert(
      action === "login" || action === "signup",
      404,
      "Unknown authentication action.",
    )
    const data = credentials.parse(await jsonBody(request))
    await throttle(`${action}:${data.email}`)
    if (action === "login") {
      const user = await prisma.user.findUnique({
        where: { email: data.email },
      })
      const valid = await passwordMatches(
        data.password,
        user?.passwordHash || null,
      )
      assert(user && valid, 401, "Email or password is incorrect.")
      await createSession(user.id)
    } else {
      assert(
        data.name && (data.organization || data.invitationToken),
        400,
        "Enter your name and organization, or use a valid invitation.",
      )
      const encoded = await passwordHash(data.password)
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { email: data.email, name: data.name!, passwordHash: encoded },
        })
        if (data.invitationToken) {
          const invitation = await tx.invitation.findUnique({
            where: { tokenHash: hashToken(data.invitationToken) },
          })
          assert(
            invitation &&
              !invitation.acceptedAt &&
              invitation.expiresAt > new Date() &&
              invitation.email === data.email,
            400,
            "Use a valid invitation and its invited email address.",
          )
          await tx.organizationMember.create({
            data: {
              organizationId: invitation.organizationId,
              userId: created.id,
              role: invitation.role,
            },
          })
          await tx.invitation.update({
            where: { id: invitation.id },
            data: { acceptedAt: new Date() },
          })
          await tx.auditLog.create({
            data: {
              organizationId: invitation.organizationId,
              userId: created.id,
              action: "Joined through invitation",
              entity: "Membership",
              entityId: invitation.id,
            },
          })
          return { user: created, organizationId: invitation.organizationId }
        }
        const organization = await tx.organization.create({
          data: {
            name: data.organization!,
            members: { create: { userId: created.id, role: "Owner" } },
            workspaces: {
              create: {
                name: "Main workspace",
                projects: { create: { key: "MAIN", name: "First project" } },
              },
            },
          },
        })
        await tx.auditLog.create({
          data: {
            organizationId: organization.id,
            userId: created.id,
            action: "Created organization",
            entity: "Organization",
            entityId: organization.id,
          },
        })
        return { user: created, organizationId: null }
      })
      await createSession(user.user.id)
      if (user.organizationId) {
        const project = await prisma.project.findFirst({
          where: {
            workspace: { organizationId: user.organizationId },
            archivedAt: null,
          },
          orderBy: { createdAt: "asc" },
        })
        return Response.json({
          ok: true,
          joinedInvitation: true,
          projectId: project?.id || null,
        })
      }
    }
    return Response.json({ ok: true })
  } catch (error) {
    return failure(error)
  }
}
