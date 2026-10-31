-- CreateTable
CREATE TABLE "JiraConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'cloud',
    "cloudId" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "siteName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "scope" TEXT NOT NULL,
    "jiraProjectId" TEXT,
    "jiraProjectKey" TEXT,
    "jiraProjectName" TEXT,
    "defaultIssueType" TEXT NOT NULL DEFAULT 'Story',
    "status" TEXT NOT NULL DEFAULT 'connected',
    "lastSyncedAt" DATETIME,
    "lastSyncError" TEXT,
    "webhookId" TEXT,
    "webhookSecret" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JiraConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JiraConnection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JiraIssueLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "jiraIssueId" TEXT NOT NULL,
    "jiraIssueKey" TEXT NOT NULL,
    "jiraUpdatedAt" DATETIME,
    "jiraStatus" TEXT,
    "jiraType" TEXT,
    "syncHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JiraIssueLink_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "JiraConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JiraIssueLink_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JiraSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'inbound',
    "status" TEXT NOT NULL,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JiraSyncLog_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "JiraConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "JiraConnection_projectId_key" ON "JiraConnection"("projectId");

-- CreateIndex
CREATE INDEX "JiraIssueLink_jiraIssueKey_idx" ON "JiraIssueLink"("jiraIssueKey");

-- CreateIndex
CREATE UNIQUE INDEX "JiraIssueLink_connectionId_jiraIssueKey_key" ON "JiraIssueLink"("connectionId", "jiraIssueKey");

-- CreateIndex
CREATE UNIQUE INDEX "JiraIssueLink_connectionId_issueId_key" ON "JiraIssueLink"("connectionId", "issueId");

-- CreateIndex
CREATE INDEX "JiraSyncLog_connectionId_createdAt_idx" ON "JiraSyncLog"("connectionId", "createdAt");
