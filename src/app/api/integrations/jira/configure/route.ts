import { randomBytes } from "node:crypto"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { assert, failure, jsonBody, sameOrigin } from "@/lib/server/http"
import {
  appOrigin,
  decryptSecret,
  deleteJiraWebhook,
  encryptSecret,
  listJiraProjects,
  publicJiraConnection,
  registerJiraWebhook,
} from "@/lib/server/jira"
import { projectAccess } from "@/lib/server/permissions"
import { requireUser } from "@/lib/server/session"

const schema = z.object({
  projectId: z.string().min(1),
  jiraProjectKey: z.string().trim().min(1).max(120),
})

export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const user = await requireUser()
    const input = schema.parse(await jsonBody(request))
    await projectAccess(user.id, input.projectId, true, true)
    const connection = await prisma.jiraConnection.findUnique({
      where: { projectId: input.projectId },
    })
    assert(connection, 404, "Connect Jira before choosing a project.")
    const projects = await listJiraProjects(connection)
    const target = projects.find((project) => project.key === input.jiraProjectKey)
    assert(target, 404, "That Jira project is not available to this connection.")

    const webhookToken = connection.webhookSecret
      ? decryptSecret(connection.webhookSecret)
      : randomBytes(24).toString("base64url")
    const encryptedSecret = connection.webhookSecret || encryptSecret(webhookToken)
    if (connection.webhookId) await deleteJiraWebhook(connection)
    await prisma.jiraConnection.update({
      where: { id: connection.id },
      data: {
        jiraProjectId: target.id,
        jiraProjectKey: target.key,
        jiraProjectName: target.name,
        webhookSecret: encryptedSecret,
        webhookId: null,
        lastSyncError: null,
      },
    })
    const updated = await prisma.jiraConnection.findUnique({
      where: { id: connection.id },
    })
    assert(updated, 500, "Jira connection could not be updated.")
    const webhookUrl = `${appOrigin(request)}/api/integrations/jira/webhook?connection=${connection.id}&token=${encodeURIComponent(webhookToken)}`
    let webhookId: string | null = null
    try {
      webhookId = await registerJiraWebhook(updated, webhookUrl)
    } catch (error) {
      console.warn("Jira webhook registration failed; manual sync remains available", error)
    }
    if (webhookId) {
      await prisma.jiraConnection.update({
        where: { id: connection.id },
        data: { webhookId },
      })
    }
    const result = await prisma.jiraConnection.findUnique({
      where: { id: connection.id },
    })
    return Response.json({
      connection: result ? publicJiraConnection(result) : null,
      webhookRegistered: Boolean(webhookId),
    })
  } catch (error) {
    return failure(error)
  }
}
