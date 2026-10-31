import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"
import type { JiraConnection } from "@prisma/client"
import { prisma } from "@/lib/db"
import { HttpError, assert } from "./http"

const AUTH_URL = "https://auth.atlassian.com/authorize"
const TOKEN_URL = "https://auth.atlassian.com/oauth/token"
const RESOURCE_URL = "https://api.atlassian.com/oauth/token/accessible-resources"
export const JIRA_SCOPES = [
  "read:jira-work",
  "write:jira-work",
  "read:jira-user",
  "manage:jira-webhook",
  "offline_access",
]
const FIELDS = "summary,description,status,priority,issuetype,updated,labels,assignee"

export type JiraTokenSet = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
}

export type JiraResource = {
  id: string
  url: string
  name: string
  scopes: string[]
  avatarUrl?: string
}

export type JiraProject = {
  id: string
  key: string
  name: string
}

export type JiraIssue = {
  id: string
  key: string
  fields: {
    summary?: string
    description?: unknown
    status?: { name?: string }
    priority?: { name?: string }
    issuetype?: { name?: string }
    updated?: string
    labels?: string[]
    assignee?: { displayName?: string } | null
  }
}

export type JiraStatePayload = {
  userId: string
  projectId: string
  exp: number
  nonce: string
}

export function jiraConfigured() {
  return Boolean(
    process.env.JIRA_CLIENT_ID &&
      process.env.JIRA_CLIENT_SECRET &&
      process.env.JIRA_TOKEN_KEY,
  )
}

export function assertJiraConfigured() {
  assert(
    jiraConfigured(),
    503,
    "Jira OAuth is not configured. Add JIRA_CLIENT_ID, JIRA_CLIENT_SECRET and JIRA_TOKEN_KEY on the server.",
  )
}

function secretKey(purpose: "encryption" | "state") {
  assertJiraConfigured()
  return createHash("sha256")
    .update(`${purpose}:${process.env.JIRA_TOKEN_KEY as string}`)
    .digest()
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", secretKey("encryption"), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".")
}

export function decryptSecret(value: string) {
  const [version, iv, tag, encrypted] = value.split(".")
  assert(version === "v1" && iv && tag && encrypted, 500, "Stored Jira credentials are not valid.")
  const decipher = createDecipheriv("aes-256-gcm", secretKey("encryption"), Buffer.from(iv, "base64url"))
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8")
}

export function signJiraState(payload: JiraStatePayload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  const signature = createHmac("sha256", secretKey("state")).update(body).digest("base64url")
  return `${body}.${signature}`
}

export function verifyJiraState(state: string): JiraStatePayload {
  const [body, signature] = state.split(".")
  assert(body && signature, 400, "The Jira connection state is invalid.")
  const expected = createHmac("sha256", secretKey("state")).update(body).digest()
  const provided = Buffer.from(signature, "base64url")
  assert(
    provided.length === expected.length && timingSafeEqual(provided, expected),
    400,
    "The Jira connection state could not be verified.",
  )
  let parsed: JiraStatePayload
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
  } catch {
    throw new HttpError(400, "The Jira connection state is invalid.")
  }
  assert(parsed.exp > Date.now(), 400, "The Jira connection request expired. Try again.")
  assert(typeof parsed.userId === "string" && typeof parsed.projectId === "string", 400, "The Jira connection state is invalid.")
  return parsed
}

export function appOrigin(request: Request) {
  return process.env.APP_URL
    ? new URL(process.env.APP_URL).origin
    : new URL(request.url).origin
}

export function jiraRedirectUri(request: Request) {
  return (
    process.env.JIRA_REDIRECT_URI ||
    `${appOrigin(request)}/api/integrations/jira/callback`
  )
}

export function jiraAuthorizeUrl(state: string, request: Request) {
  assertJiraConfigured()
  const uri = new URL(AUTH_URL)
  uri.searchParams.set("audience", "api.atlassian.com")
  uri.searchParams.set("client_id", process.env.JIRA_CLIENT_ID as string)
  uri.searchParams.set("scope", JIRA_SCOPES.join(" "))
  uri.searchParams.set("redirect_uri", jiraRedirectUri(request))
  uri.searchParams.set("state", state)
  uri.searchParams.set("response_type", "code")
  uri.searchParams.set("prompt", "consent")
  return uri.toString()
}

export async function exchangeJiraCode(code: string, redirectUri: string) {
  assertJiraConfigured()
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  })
  if (!response.ok)
    throw new HttpError(502, `Jira rejected the authorization code (${response.status}).`)
  return (await response.json()) as JiraTokenSet
}

export async function accessibleJiraResources(accessToken: string) {
  const response = await fetch(RESOURCE_URL, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  })
  if (!response.ok)
    throw new HttpError(502, `Jira could not list accessible sites (${response.status}).`)
  return (await response.json()) as JiraResource[]
}

export async function refreshJiraToken(connection: JiraConnection) {
  assertJiraConfigured()
  const refreshToken = decryptSecret(connection.refreshToken)
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  })
  if (!response.ok)
    throw new HttpError(401, "The Jira connection expired. Reconnect Jira to continue syncing.")
  const tokens = (await response.json()) as JiraTokenSet
  connection.accessToken = encryptSecret(tokens.access_token)
  connection.refreshToken = encryptSecret(tokens.refresh_token || refreshToken)
  connection.expiresAt = new Date(Date.now() + Math.max(30, tokens.expires_in || 3600) * 1000)
  if (tokens.scope) connection.scope = tokens.scope
  await prisma.jiraConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      expiresAt: connection.expiresAt,
      scope: connection.scope,
    },
  })
  return tokens.access_token
}

async function accessToken(connection: JiraConnection, force = false) {
  if (!force && connection.expiresAt.getTime() > Date.now() + 60_000)
    return decryptSecret(connection.accessToken)
  return refreshJiraToken(connection)
}

async function jiraFetch(
  connection: JiraConnection,
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<unknown> {
  const token = await accessToken(connection)
  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${connection.cloudId}/rest/api/3${path}`,
    {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers || {}),
      },
      cache: "no-store",
    },
  )
  if (response.status === 401 && !retried) {
    await refreshJiraToken(connection)
    return jiraFetch(connection, path, init, true)
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new HttpError(
      502,
      `Jira request failed (${response.status})${detail ? `: ${detail.slice(0, 240)}` : "."}`,
    )
  }
  if (response.status === 204) return null
  return response.json()
}

export async function listJiraProjects(connection: JiraConnection): Promise<JiraProject[]> {
  const data = (await jiraFetch(connection, "/project/search?maxResults=100&orderBy=name")) as {
    values?: Array<{ id: string; key: string; name: string }>
  }
  return (data.values || []).map(({ id, key, name }) => ({ id, key, name }))
}

export async function searchJiraIssues(
  connection: JiraConnection,
  jiraProjectKey: string,
  nextPageToken?: string,
  maxResults = 50,
): Promise<{ issues: JiraIssue[]; nextPageToken: string | null }> {
  const jql = `project = "${jiraProjectKey.replace(/"/g, '\\"')}" ORDER BY updated ASC`
  const query = new URLSearchParams({
    jql,
    maxResults: String(maxResults),
    fields: FIELDS,
  })
  if (nextPageToken) query.set("nextPageToken", nextPageToken)
  const data = (await jiraFetch(connection, `/search/jql?${query.toString()}`)) as {
    issues?: JiraIssue[]
    nextPageToken?: string
  }
  return {
    issues: data.issues || [],
    nextPageToken: data.nextPageToken || null,
  }
}

export async function getJiraIssue(connection: JiraConnection, issueKey: string) {
  return (await jiraFetch(
    connection,
    `/issue/${encodeURIComponent(issueKey)}?fields=${encodeURIComponent(FIELDS)}`,
  )) as JiraIssue
}

export async function registerJiraWebhook(
  connection: JiraConnection,
  url: string,
): Promise<string | null> {
  if (!connection.jiraProjectKey) return null
  const data = (await jiraFetch(connection, "/webhook", {
    method: "POST",
    body: JSON.stringify({
      url,
      webhooks: [
        {
          events: ["jira:issue_created", "jira:issue_updated", "jira:issue_deleted"],
          jqlFilter: `project = "${connection.jiraProjectKey.replace(/"/g, '\\"')}"`,
        },
      ],
    }),
  })) as { webhookRegistrationResult?: Array<{ createdWebhookId?: number; errors?: unknown[] }> }
  const registration = data.webhookRegistrationResult?.[0]
  if (registration?.errors?.length) return null
  return registration?.createdWebhookId ? String(registration.createdWebhookId) : null
}

export async function deleteJiraWebhook(connection: JiraConnection) {
  if (!connection.webhookId) return
  try {
    await jiraFetch(connection, "/webhook", {
      method: "DELETE",
      body: JSON.stringify({ webhookIds: [Number(connection.webhookId)] }),
    })
  } catch {
    // A stale webhook is harmless; the local connection is disconnected either way.
  }
}

export async function refreshJiraWebhook(connection: JiraConnection) {
  if (!connection.webhookId) return
  try {
    await jiraFetch(connection, "/webhook/refresh", {
      method: "PUT",
      body: JSON.stringify({ webhookIds: [Number(connection.webhookId)] }),
    })
  } catch (error) {
    // Registration is best-effort. Manual sync remains available if Jira
    // expires or rejects the webhook.
    console.warn("Jira webhook refresh failed", error)
  }
}

function adfText(value: unknown): string {
  if (!value) return ""
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.map(adfText).join("")
  if (typeof value !== "object") return ""
  const node = value as { type?: string; text?: string; content?: unknown[]; attrs?: { text?: string } }
  if (node.type === "text") return node.text || ""
  if (node.type === "hardBreak") return "\n"
  const content = Array.isArray(node.content) ? node.content.map(adfText).join("") : ""
  return node.type === "paragraph" || node.type === "heading" ? `${content}\n` : content
}

function jiraType(value?: string) {
  const type = (value || "").toLowerCase()
  if (type.includes("bug")) return "Bug"
  if (type.includes("epic")) return "Epic"
  if (type.includes("story")) return "Story"
  return "Task"
}

export type JiraSyncResult = {
  imported: number
  updated: number
  failed: number
  total: number
  lastSyncedAt: string
}

async function upsertJiraIssue(connection: JiraConnection, issue: JiraIssue) {
  const fields = issue.fields
  const key = issue.key
  const data = {
    summary: fields.summary?.trim() || key,
    description: adfText(fields.description).trim().slice(0, 20000) || null,
    type: jiraType(fields.issuetype?.name),
    status: fields.status?.name || "To Do",
    priority: fields.priority?.name || "Medium",
  }
  const existing = await prisma.jiraIssueLink.findUnique({
    where: {
      connectionId_jiraIssueKey: {
        connectionId: connection.id,
        jiraIssueKey: key,
      },
    },
  })
  const local = existing
    ? await prisma.issue.update({ where: { id: existing.issueId }, data })
    : await prisma.issue.upsert({
        where: { projectId_key: { projectId: connection.projectId, key } },
        update: data,
        create: { key, projectId: connection.projectId, ...data },
      })
  await prisma.jiraIssueLink.upsert({
    where: {
      connectionId_jiraIssueKey: {
        connectionId: connection.id,
        jiraIssueKey: key,
      },
    },
    create: {
      connectionId: connection.id,
      issueId: local.id,
      jiraIssueId: issue.id,
      jiraIssueKey: key,
      jiraUpdatedAt: fields.updated ? new Date(fields.updated) : null,
      jiraStatus: fields.status?.name,
      jiraType: fields.issuetype?.name,
      syncHash: createHash("sha256").update(JSON.stringify(data)).digest("hex"),
    },
    update: {
      issueId: local.id,
      jiraIssueId: issue.id,
      jiraUpdatedAt: fields.updated ? new Date(fields.updated) : null,
      jiraStatus: fields.status?.name,
      jiraType: fields.issuetype?.name,
      syncHash: createHash("sha256").update(JSON.stringify(data)).digest("hex"),
    },
  })
  return existing ? "updated" : "imported"
}

export async function syncJiraConnection(connectionId: string): Promise<JiraSyncResult> {
  const connection = await prisma.jiraConnection.findUnique({ where: { id: connectionId } })
  assert(connection, 404, "Jira connection not found.")
  assert(connection.jiraProjectKey, 400, "Choose a Jira project before syncing.")
  let imported = 0
  let updated = 0
  let failed = 0
  let nextPageToken: string | undefined
  let total = 0
  const seenTokens = new Set<string>()
  try {
    do {
      const page = await searchJiraIssues(connection, connection.jiraProjectKey, nextPageToken)
      for (const issue of page.issues) {
        total += 1
        try {
          const result = await upsertJiraIssue(connection, issue)
          if (result === "updated") updated += 1
          else imported += 1
        } catch (error) {
          failed += 1
          console.error("Jira issue sync failed", issue.key, error)
        }
      }
      nextPageToken = page.nextPageToken || undefined
      if (!page.issues.length || !nextPageToken) break
      if (seenTokens.has(nextPageToken)) break
      seenTokens.add(nextPageToken)
    } while (nextPageToken)
    await refreshJiraWebhook(connection)
    const lastSyncedAt = new Date()
    await prisma.jiraConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt, lastSyncError: null, status: "connected" },
    })
    await prisma.jiraSyncLog.create({
      data: { connectionId, status: failed ? "partial" : "success", imported, updated, failed, message: `${total} Jira issues` },
    })
    return { imported, updated, failed, total, lastSyncedAt: lastSyncedAt.toISOString() }
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Jira sync failed."
    await prisma.jiraConnection.update({
      where: { id: connection.id },
      data: { status: "error", lastSyncError: message },
    })
    await prisma.jiraSyncLog.create({
      data: { connectionId, status: "failed", imported, updated, failed, message },
    })
    throw error
  }
}

export async function syncSingleJiraIssue(connectionId: string, issueKey: string) {
  const connection = await prisma.jiraConnection.findUnique({ where: { id: connectionId } })
  assert(connection, 404, "Jira connection not found.")
  const issue = await getJiraIssue(connection, issueKey)
  const result = await upsertJiraIssue(connection, issue)
  await prisma.jiraConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date(), lastSyncError: null, status: "connected" },
  })
  return result
}

export function publicJiraConnection(connection: JiraConnection) {
  return {
    id: connection.id,
    siteName: connection.siteName,
    siteUrl: connection.siteUrl,
    status: connection.status,
    jiraProjectKey: connection.jiraProjectKey,
    jiraProjectName: connection.jiraProjectName,
    defaultIssueType: connection.defaultIssueType,
    lastSyncedAt: connection.lastSyncedAt?.toISOString() || null,
    lastSyncError: connection.lastSyncError,
    webhookRegistered: Boolean(connection.webhookId),
  }
}
