import { z } from "zod"
import { prisma } from "@/lib/db"
import { assert, failure, jsonBody, sameOrigin } from "@/lib/server/http"
import { syncJiraConnection } from "@/lib/server/jira"
import { projectAccess } from "@/lib/server/permissions"
import { requireUser } from "@/lib/server/session"

const schema = z.object({ projectId: z.string().min(1) })

export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const user = await requireUser()
    const input = schema.parse(await jsonBody(request))
    await projectAccess(user.id, input.projectId, true, true)
    const connection = await prisma.jiraConnection.findUnique({
      where: { projectId: input.projectId },
    })
    assert(connection, 404, "Connect Jira before syncing.")
    assert(connection.jiraProjectKey, 400, "Choose a Jira project before syncing.")
    const result = await syncJiraConnection(connection.id)
    return Response.json(result)
  } catch (error) {
    return failure(error)
  }
}
