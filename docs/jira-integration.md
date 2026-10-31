# Jira Cloud integration

Betaray connects to Jira Cloud with OAuth 2.0 (3LO). It imports Jira issues into
the project's Requirements and keeps them updated through manual sync and Jira
webhooks.

## 1. Create the Atlassian OAuth app

1. Open <https://developer.atlassian.com/console/myapps/>.
2. Create an **OAuth 2.0 integration**.
3. Add **Jira platform API** permissions:
   - `read:jira-work`
   - `write:jira-work`
   - `read:jira-user`
   - `manage:jira-webhook`
   - `offline_access`
4. Set the callback URL to:
   ```text
   https://your-betaray-host/api/integrations/jira/callback
   ```
   For local development:
   ```text
   http://localhost:3001/api/integrations/jira/callback
   ```

## 2. Configure the server

Add these variables to `.env` and restart the app:

```env
JIRA_CLIENT_ID="..."
JIRA_CLIENT_SECRET="..."
JIRA_REDIRECT_URI="https://your-betaray-host/api/integrations/jira/callback"
JIRA_TOKEN_KEY="<random 32+ byte secret>"
APP_URL="https://your-betaray-host"
```

- `JIRA_REDIRECT_URI` must exactly match the callback URL in the Atlassian app.
  If omitted, the app derives it from `APP_URL` or the request origin.
- Generate `JIRA_TOKEN_KEY` with:
  ```sh
  openssl rand -base64 48
  ```
  It encrypts Jira access/refresh tokens at rest with AES-256-GCM.
- Keep `JIRA_TOKEN_KEY` stable after connecting. Rotating it makes stored tokens
  unreadable; existing projects must reconnect Jira.
- Never commit real credentials. `.env` is ignored by git.

## 3. Connect

1. Sign in as an **Owner** or **Admin**.
2. Open a project and go to **Integrations & API → Jira Cloud**.
3. Click **Connect Jira Cloud** and authorize the app.
4. Choose the Jira project to map.
5. Click **Save mapping**.
6. Click **Sync now**.

Imported Jira issues appear under **Requirements**. Their local keys are the
Jira issue keys, so existing test links continue to work.

## Sync behavior

- Import is Jira → Betaray.
- The sync is idempotent by `(connection, jiraIssueKey)`.
- Fields imported: summary, description, issue type, status, priority.
- Jira issue types map to Story / Bug / Epic / Task.
- Existing local issues with the same key are linked and updated.
- Jira issues are fetched from `/rest/api/3/search/jql` in pages of 50 using
  cursor-based `nextPageToken` pagination.
- The optional dynamic webhook handles `issue_created`, `issue_updated` and
  `issue_deleted`. Deleted issues are not removed locally.
- Jira expires REST-registered webhooks after 30 days. Each manual sync extends
  the current webhook, and saving the project mapping re-registers it.
- If webhook registration is unavailable, **Sync now** still works.

## API routes

| Route | Purpose |
|---|---|
| `GET /api/integrations/jira?projectId=…` | Connection status |
| `GET /api/integrations/jira/authorize?projectId=…` | Start OAuth |
| `GET /api/integrations/jira/callback` | OAuth callback |
| `GET /api/integrations/jira/projects?projectId=…` | List Jira projects |
| `POST /api/integrations/jira/configure` | Save project mapping and register webhook |
| `POST /api/integrations/jira/sync` | Manual sync |
| `POST /api/integrations/jira/webhook?connection=…&token=…` | Jira event receiver |
| `DELETE /api/integrations/jira?projectId=…` | Disconnect |

All management routes require an organization Owner/Admin. The webhook route is
unauthenticated but requires the per-connection secret embedded in its URL.

## Security notes

- OAuth state is HMAC-signed and expires after 10 minutes.
- Access and refresh tokens are encrypted at rest.
- Tokens are never returned to the browser.
- The webhook URL contains a high-entropy per-connection secret.
- Disconnecting attempts to delete the Jira webhook, then removes local
  credentials. Imported requirements remain.
- Requires Jira Cloud. Data Center uses a separate PAT-based connector.

## Current limitations

- One Jira site per Betaray project. If the Atlassian account grants access to
  multiple sites, the first accessible site is selected. Reconnecting a
  different site clears the old Jira mapping and issue links; imported
  requirements remain.
- One-way requirement sync; Betaray does not create Jira issues yet.
- No Jira attachment/comment import.
- Sync runs inline in the request. Large Jira instances should move it to a
  background worker with a job queue.
