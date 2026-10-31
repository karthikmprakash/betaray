import { createHash, timingSafeEqual } from "node:crypto"
import { prisma } from "@/lib/db"
import { failure, jsonBody } from "@/lib/server/http"
import { decryptSecret, syncSingleJiraIssue } from "@/lib/server/jira"

function matches(left: string, right: string) {
  const a = createHash("sha256").update(left).digest()
  const b = createHash("sha256").update(right).digest()
  return timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const connectionId = url.searchParams.get("connection")
    const token = url.searchParams.get("token")
    if (!connectionId || !token)
      return Response.json({ error: "Unknown webhook." }, { status: 404 })
    const connection = await prisma.jiraConnection.findUnique({
      where: { id: connectionId },
    })
    if (!connection?.webhookSecret)
      return Response.json({ error: "Unknown webhook." }, { status: 404 })
    if (!matches(token, decryptSecret(connection.webhookSecret)))
      return Response.json({ error: "Invalid webhook token." }, { status: 401 })

    const payload = (await jsonBody(request)) as {
      webhookEvent?: string
      issue?: { key?: string; fields?: { project?: { key?: string } } }
    }
    const issueKey = payload.issue?.key
    const projectKey = payload.issue?.fields?.project?.key
    if (
      !issueKey ||
      (connection.jiraProjectKey &&
        projectKey &&
        projectKey !== connection.jiraProjectKey)
    )
      return Response.json({ ok: true, ignored: true }, { status: 202 })

    if (payload.webhookEvent === "jira:issue_deleted")
      return Response.json({ ok: true, deleted: true }, { status: 202 })

    try {
      await syncSingleJiraIssue(connection.id, issueKey)
    } catch (error) {
      console.error("Jira webhook sync failed", issueKey, error)
      return Response.json({ error: "Jira issue sync failed." }, { status: 500 })
    }
    return Response.json({ ok: true }, { status: 202 })
  } catch (error) {
    return failure(error)
  }
}
