import { prisma } from "@/lib/db"
import { failure } from "@/lib/server/http"
import { listJiraProjects } from "@/lib/server/jira"
import { projectAccess } from "@/lib/server/permissions"
import { requireUser } from "@/lib/server/session"

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const projectId = new URL(request.url).searchParams.get("projectId")
    if (!projectId) return Response.json({ error: "projectId is required." }, { status: 400 })
    await projectAccess(user.id, projectId, true, true)
    const connection = await prisma.jiraConnection.findUnique({ where: { projectId } })
    if (!connection) return Response.json({ error: "Connect Jira first." }, { status: 404 })
    return Response.json(
      { projects: await listJiraProjects(connection) },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    return failure(error)
  }
}
