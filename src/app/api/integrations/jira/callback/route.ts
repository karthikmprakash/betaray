import { randomBytes } from "node:crypto"
import { prisma } from "@/lib/db"
import {
  accessibleJiraResources,
  assertJiraConfigured,
  deleteJiraWebhook,
  encryptSecret,
  exchangeJiraCode,
  jiraRedirectUri,
  appOrigin,
  verifyJiraState,
} from "@/lib/server/jira"
import { projectAccess } from "@/lib/server/permissions"
import { requireUser } from "@/lib/server/session"

function back(request: Request, params: Record<string, string>) {
  const target = new URL("/app/integrations", appOrigin(request))
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value)
  return Response.redirect(target, 302)
}

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const url = new URL(request.url)
    const oauthError = url.searchParams.get("error")
    if (oauthError) return back(request, { jira: "error", message: oauthError })
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    if (!code || !state) return back(request, { jira: "error", message: "missing_code" })
    const payload = verifyJiraState(state)
    if (payload.userId !== user.id)
      return back(request, { jira: "error", message: "state_user_mismatch" })
    const access = await projectAccess(user.id, payload.projectId, true, true)
    assertJiraConfigured()
    const tokens = await exchangeJiraCode(code, jiraRedirectUri(request))
    const resources = await accessibleJiraResources(tokens.access_token)
    if (!resources.length)
      return back(request, { jira: "error", message: "no_accessible_jira_site" })
    const site = resources[0]
    const existing = await prisma.jiraConnection.findUnique({
      where: { projectId: payload.projectId },
    })
    const refreshToken = tokens.refresh_token
      ? encryptSecret(tokens.refresh_token)
      : existing?.refreshToken
    if (!refreshToken)
      return back(request, { jira: "error", message: "missing_refresh_token" })
    const sameSite = existing?.cloudId === site.id
    const webhookSecret =
      existing?.webhookSecret || encryptSecret(randomBytes(24).toString("base64url"))
    if (existing && !sameSite) {
      await deleteJiraWebhook(existing)
      await prisma.jiraIssueLink.deleteMany({
        where: { connectionId: existing.id },
      })
    }
    await prisma.jiraConnection.upsert({
      where: { projectId: payload.projectId },
      create: {
        organizationId: access.organizationId,
        projectId: payload.projectId,
        cloudId: site.id,
        siteUrl: site.url,
        siteName: site.name,
        accessToken: encryptSecret(tokens.access_token),
        refreshToken,
        expiresAt: new Date(Date.now() + Math.max(30, tokens.expires_in || 3600) * 1000),
        scope: tokens.scope || "",
        webhookSecret,
        status: "connected",
      },
      update: {
        cloudId: site.id,
        siteUrl: site.url,
        siteName: site.name,
        accessToken: encryptSecret(tokens.access_token),
        refreshToken,
        expiresAt: new Date(Date.now() + Math.max(30, tokens.expires_in || 3600) * 1000),
        scope: tokens.scope || "",
        status: "connected",
        lastSyncError: null,
        ...(sameSite
          ? {}
          : {
              jiraProjectId: null,
              jiraProjectKey: null,
              jiraProjectName: null,
              webhookId: null,
            }),
      },
    })
    return back(request, { jira: "connected" })
  } catch (error) {
    console.error("Jira callback failed", error)
    return back(request, { jira: "error", message: "connection_failed" })
  }
}
