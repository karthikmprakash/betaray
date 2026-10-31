import { prisma } from "@/lib/db"
import { failure, sameOrigin } from "@/lib/server/http"
import {
  deleteJiraWebhook,
  jiraConfigured,
  publicJiraConnection,
} from "@/lib/server/jira"
import { projectAccess } from "@/lib/server/permissions"
import { requireUser } from "@/lib/server/session"

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const projectId = new URL(request.url).searchParams.get("projectId")
    if (!projectId)
      return Response.json({ configured: jiraConfigured(), connection: null })
    await projectAccess(user.id, projectId)
    const connection = await prisma.jiraConnection.findUnique({
      where: { projectId },
    })
    return Response.json(
      {
        configured: jiraConfigured(),
        connection: connection ? publicJiraConnection(connection) : null,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    return failure(error)
  }
}

export async function DELETE(request: Request) {
  try {
    sameOrigin(request)
    const user = await requireUser()
    const projectId = new URL(request.url).searchParams.get("projectId")
    if (!projectId) return Response.json({ error: "projectId is required." }, { status: 400 })
    await projectAccess(user.id, projectId, true, true)
    const connection = await prisma.jiraConnection.findUnique({
      where: { projectId },
    })
    if (connection) {
      await deleteJiraWebhook(connection)
      await prisma.jiraConnection.delete({ where: { id: connection.id } })
    }
    return Response.json({ ok: true })
  } catch (error) {
    return failure(error)
  }
}
