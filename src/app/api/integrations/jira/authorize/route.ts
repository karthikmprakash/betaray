import { randomBytes } from "node:crypto"
import { failure, assert } from "@/lib/server/http"
import {
  assertJiraConfigured,
  jiraAuthorizeUrl,
  signJiraState,
} from "@/lib/server/jira"
import { projectAccess } from "@/lib/server/permissions"
import { requireUser } from "@/lib/server/session"

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const projectId = new URL(request.url).searchParams.get("projectId")
    assert(projectId, 400, "projectId is required.")
    await projectAccess(user.id, projectId, true, true)
    assertJiraConfigured()
    const state = signJiraState({
      userId: user.id,
      projectId,
      nonce: randomBytes(16).toString("base64url"),
      exp: Date.now() + 10 * 60_000,
    })
    return Response.redirect(jiraAuthorizeUrl(state, request), 302)
  } catch (error) {
    return failure(error)
  }
}
