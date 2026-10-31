# Betaray — Installation & usage guide

> Full interactive version at `/docs` when the app is running.

---

## 1. Installation

### Prerequisites

- **Node.js 22+** — `node --version`. Use `nvm` or `fnm` to manage versions.
- **Docker** (optional) — for containerized deployment.
- **Git**
- Postgres for production; SQLite works for local development.

### Quick start (local)

```sh
git clone https://github.com/karthikmprakash/betaray.git
cd betaray
npm ci
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run dev -- --port 3001
```

Open `http://localhost:3001/login` and create an organization. Signup creates a workspace and first project.

> **Local demo data:** set `ALLOW_LOCAL_DEMO="true"` in `.env` to enable the **Open local demo** button at sign-in. Disabled in production (`NODE_ENV === "production"`).

### Docker

```sh
# Pull and run
docker run --env-file .env -p 3000:3000 ghcr.io/karthikmprakash/betaray:latest

# Or build locally
docker build -t betaray:local .
docker run --env-file .env -p 3000:3000 betaray:local
```

Images are published on every push to `main` as `main`, `main-<sha>`, and `latest`, plus `v*` on tags. See `.github/workflows/docker.yml`.

#### docker-compose example

```yaml
services:
  app:
    image: ghcr.io/karthikmprakash/betaray:latest
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [db]
    restart: unless-stopped
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: betaray
      POSTGRES_USER: betaray
      POSTGRES_PASSWORD: betaray
    volumes: [pgdata:/var/lib/postgresql/data]
    ports: ["5432:5432"]
volumes:
  pgdata:
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | DB connection. `file:./dev.db` for SQLite, Postgres URL for production. |
| `APP_URL` | Prod | Canonical origin, e.g. `https://qa.example.com`. Used for OAuth callbacks and links. |
| `ALLOW_LOCAL_DEMO` | No | Set to `"true"` to enable seeded demo data (dev only). |
| `JIRA_CLIENT_ID` | Jira | Atlassian OAuth app client ID. |
| `JIRA_CLIENT_SECRET` | Jira | Atlassian OAuth app client secret. |
| `JIRA_REDIRECT_URI` | Jira | OAuth callback URL. Must match the Atlassian app config exactly. |
| `JIRA_TOKEN_KEY` | Jira | 32+ byte secret for AES-256-GCM encryption of Jira tokens at rest. |
| `OPENAI_API_KEY` | No | OpenAI API key for AI test generation. |
| `OPENAI_MODEL` | No | OpenAI model name (e.g. `gpt-4o`). Both `OPENAI_*` required for AI. |

> ⚠️ Keep `JIRA_TOKEN_KEY` stable — rotating it makes stored Jira tokens unreadable.

---

## 2. Quick start tour

1. **Create organization** — sign up at `/login`. A workspace and first project are created automatically.
2. **Invite your team** — Settings → Members. Roles: Owner, Admin, Tester, Viewer.
3. **Create a project** — from the sidebar or workspace overview. Each has its own key prefix (e.g. `BET-`).
4. **Add tests** — Manual steps, Gherkin, or AI-generated drafts. Organize with folders and labels.

### Organization → workspace → project

Betaray scopes everything as **organization → workspace → project**. Projects hold tests, executions, and integrations. Archive/restore without losing data.

### First test

1. Open project → **Tests** → **New test** (Manual, Gherkin, or AI Studio).
2. Add steps or feature/scenario, set priority/type, link a requirement.
3. Save. Revisions are tracked; view history and restore any version.

### Execution

1. Create a **Test Set** or **Test Plan** to group tests.
2. Create an **Execution** — pick environment and version.
3. Mark each test `PASS`/`FAIL`/`BLOCKED`/etc. Bulk-update and comment.
4. Or import results from CI (see API/CLI guides).

### Coverage

Link tests to requirements. The **Coverage** view shows every requirement and whether it has passing tests. Export the matrix for audits.

---

## 3. CLI guide

### Install

```sh
# Global install (once published)
npm install -g betaray-cli
betaray --help

# One-off
npx betaray-cli --help

# From source
git clone https://github.com/karthikmprakash/betaray.git
cd betaray/cli
npm install
npm run build
npm link
```

### Authentication

```sh
betaray login --url https://betaray.example.com --token btr_xxx --project proj_123
betaray status
betaray whoami --json
```

Create the token in **Integrations & API → API Tokens → Create token** (shown once).

**Config file & env vars:**

- Config: `~/.betaray/config.json` (or `$XDG_CONFIG_HOME/betaray/config.json`). Override with `BETARAY_CONFIG`.
- Env vars: `BETARAY_URL`, `BETARAY_TOKEN`, `BETARAY_PROJECT`
- Precedence: CLI flag → env var → config file
- Inspect: `betaray config get`, `betaray config path`
- Clear: `betaray logout` or `betaray config reset`

### Commands

| Command | Description |
|---|---|
| `betaray login` | Save URL, token, project to config |
| `betaray logout` | Clear saved config |
| `betaray status / whoami` | Check connectivity & identity |
| `betaray project list` | List projects |
| `betaray test list` | List tests (`--project`, `--limit`) |
| `betaray test get <key>` | Fetch a single test |
| `betaray test create` | Create test (`--summary`, `--type`, `--priority`, `--labels`, `--folder`) |
| `betaray execution list` | List executions |
| `betaray execution create` | Create execution (`--name`, `--tests`, `--env`, `--version`) |
| `betaray execution import` | Import results (`--execution`, `--file`) |
| `betaray requirement list/create` | Manage requirements |
| `betaray draft list/generate/approve` | AI drafts lifecycle |
| `betaray import --file <path>` | Bulk import tests from JSON |
| `betaray config get/set/path/reset` | Manage local config |

**Examples:**

```sh
betaray test create --summary "Login flow" --type Manual --priority High
betaray test create --summary "Checkout" --labels smokes,regression --folder Payments
betaray execution create --name "Sprint 1" --tests PROJ-1,PROJ-2 --env Staging --version v1.2
betaray execution import --execution PROJ-5 --file results.json
# results.json: [{"testKey":"PROJ-1","status":"PASS"},{"testKey":"PROJ-2","status":"FAIL","comment":"..."}]
betaray draft generate --source "Requirements text..." --type Manual --mode template
betaray import --file export.json --project proj_123
```

### JSON mode & AI agents

Every command supports `--json` for machine-readable output:

```sh
echo '{"summary":"API test","type":"Generic"}' | betaray test create --stdin
betaray test create --file payload.json
cat payload.json | betaray test create --file - --project proj_123
betaray test list --json | jq '.tests[].key'
betaray whoami --json
```

Use `--verbose` to log HTTP requests. Global flags `--url`, `--token`, `--project` work on every command.

### CI usage (GitHub Actions)

```yaml
name: Report to Betaray
on: [push]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test
      - name: Install Betaray CLI
        run: npm install -g betaray-cli
      - name: Import execution results
        env:
          BETARAY_URL: ${{ secrets.BETARAY_URL }}
          BETARAY_TOKEN: ${{ secrets.BETARAY_TOKEN }}
          BETARAY_PROJECT: ${{ secrets.BETARAY_PROJECT }}
        run: |
          betaray execution import \
            --execution ${{ vars.BETARAY_EXECUTION_KEY }} \
            --file results.json
```

Store `BETARAY_TOKEN` in GitHub → Settings → Secrets (write-scoped token from the Betaray UI).

---

## 4. API guide

### Authentication

Create a project-scoped token in **Integrations & API** (read/write scope, optional expiry, revocable).

```sh
curl -H "Authorization: Bearer $BETARAY_TOKEN" \
  "$APP_URL/api/tests?projectId=YOUR_PROJECT_ID"
```

> Tokens are per-project. `/api/platform` requires a browser session; use the token endpoints for automation.

### Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/tests?projectId=…` | Bearer | List tests |
| POST | `/api/tests` | Bearer | Create test |
| POST | `/api/v2/import/execution` | Bearer | Import execution results |
| GET | `/api/platform?projectId=…` | Session | Read platform state |
| POST | `/api/platform` | Session | Mutate (`{action, projectId, input}`) |
| GET | `/api/health` | None | Health check |

### Examples

**List tests:**

```sh
curl "$APP_URL/api/tests?projectId=proj_123" \
  -H "Authorization: Bearer $BETARAY_TOKEN"
```

**Create a test:**

```sh
curl -X POST "$APP_URL/api/tests" \
  -H "Authorization: Bearer $BETARAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_123",
    "summary": "Login with valid credentials",
    "type": "Manual",
    "priority": "High",
    "labels": ["smoke"],
    "steps": [{"action": "Enter credentials", "expected": "Dashboard appears"}]
  }'
```

**Import execution results (up to 500 atomically):**

```sh
curl -X POST "$APP_URL/api/v2/import/execution" \
  -H "Authorization: Bearer $BETARAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_123",
    "testExecutionKey": "BET-1",
    "tests": [
      {"testKey": "BET-T1", "status": "PASS"},
      {"testKey": "BET-T2", "status": "FAIL", "comment": "Timeout on 3DS challenge"}
    ]
  }'
```

Allowed statuses: `TODO` `PASS` `FAIL` `EXECUTING` `ABORTED` `BLOCKED`

### Error handling

```json
{ "error": "Test BET-T99 is not part of this execution.", "status": 400 }
```

| Status | Meaning |
|---|---|
| 400 | Validation error — missing field or test not in execution |
| 401 | Missing or invalid token / session |
| 403 | Insufficient role or scope (write required for mutations) |
| 404 | Project, execution, or test not found |
| 429 | Rate limited (when enabled) |

---

## 5. Jira Cloud integration

Betaray connects to Jira Cloud via OAuth 2.0 (3LO). Jira issues are imported as Requirements.

### Create the Atlassian OAuth app

1. Open https://developer.atlassian.com/console/myapps/
2. Create an **OAuth 2.0 integration**.
3. Add **Jira platform API** permissions: `read:jira-work`, `write:jira-work`, `read:jira-user`, `manage:jira-webhook`, `offline_access`
4. Set callback URL to `https://your-betaray-host/api/integrations/jira/callback` (local dev: `http://localhost:3001/api/integrations/jira/callback`)

### Environment

Add to `.env` and restart:

```env
JIRA_CLIENT_ID="..."
JIRA_CLIENT_SECRET="..."
JIRA_REDIRECT_URI="https://your-betaray-host/api/integrations/jira/callback"
JIRA_TOKEN_KEY="<random 32+ byte secret>"
APP_URL="https://your-betaray-host"
```

- `JIRA_REDIRECT_URI` must match the Atlassian app callback exactly. If omitted, derived from `APP_URL` or request origin.
- Generate `JIRA_TOKEN_KEY` with `openssl rand -base64 48` — encrypts tokens at rest with AES-256-GCM.

### Connect flow

1. Sign in as **Owner** or **Admin**.
2. Open project → **Integrations & API → Jira Cloud** → **Connect Jira Cloud** → authorize.
3. Choose the Jira project to map → **Save mapping** → **Sync now**.
4. Imported issues appear under **Requirements** with their Jira keys preserved.

### Sync behavior

- One-way: Jira → Betaray. Idempotent by `(connection, jiraIssueKey)`.
- Fields: summary, description, issue type, status, priority → Story/Bug/Epic/Task.
- Fetched via `/rest/api/3/search/jql` in pages of 50 with `nextPageToken`.
- Deleted Jira issues are not removed locally.

### Webhooks & expiry

- Optional webhook handles `issue_created`, `issue_updated`, `issue_deleted`.
- Jira expires REST webhooks after **30 days**. Each manual **Sync now** extends it; saving the mapping re-registers it.
- If webhook registration fails, sync still works.

### API routes

| Route | Purpose |
|---|---|
| `GET /api/integrations/jira?projectId=…` | Connection status |
| `GET /api/integrations/jira/authorize?projectId=…` | Start OAuth |
| `GET /api/integrations/jira/callback` | OAuth callback |
| `GET /api/integrations/jira/projects?projectId=…` | List Jira projects |
| `POST /api/integrations/jira/configure` | Save mapping & register webhook |
| `POST /api/integrations/jira/sync` | Manual sync |
| `POST /api/integrations/jira/webhook?connection=…&token=…` | Jira event receiver |
| `DELETE /api/integrations/jira?projectId=…` | Disconnect |

### Troubleshooting

| Issue | Fix |
|---|---|
| `redirect_uri mismatch` | Atlassian callback and `JIRA_REDIRECT_URI` must be identical, including protocol. |
| Tokens unreadable after deploy | `JIRA_TOKEN_KEY` changed — restore previous value or reconnect. |
| Webhook not firing | Expired after 30 days — run Sync now. Check server logs. |
| Multiple Jira sites | One site per project; first accessible site selected. Reconnecting clears old mapping. |
| No Jira projects listed | Authorizing account must have access to the Jira site/projects. |

OAuth state is HMAC-signed (10 min expiry). Tokens are never returned to the browser. Disconnecting deletes the webhook then removes local credentials.

---

## 6. Self-hosting & production

### HTTPS & APP_URL

- Always set `APP_URL` to your canonical origin in production.
- Terminate TLS at a reverse proxy (Caddy, nginx, Traefik) or load balancer.
- Sessions use `HttpOnly`, `Secure` cookies — they require HTTPS.

### Postgres migration

SQLite works for dev; use Postgres in production:

```env
DATABASE_URL="postgresql://betaray:secret@db:5432/betaray?schema=public"
```

Update `prisma/schema.prisma` datasource to `postgresql`, run `npx prisma migrate deploy`, restart. The Docker image runs migrations on startup.

### Backups

- SQLite: snapshot `prisma/dev.db` (or `./data/prod.db` in Docker).
- Postgres: `pg_dump` or cloud automated backups. Test restores.
- Back up `JIRA_TOKEN_KEY` separately — without it Jira tokens cannot be decrypted.

### Monitoring

- Health check: `GET /api/health` for load balancer / uptime probes.
- Logs go to stdout — collect with your aggregator.
- Watch for failed Jira syncs and webhook expiries.

### Rate limiting

Betaray does not ship built-in rate limiting. Place a reverse proxy or API gateway in front that rate-limits by IP/token, especially for `/api/tests` and `/api/v2/import/execution`.

> ⚠️ Before going live, review: email verification, password recovery, MFA/SSO, Postgres, HTTPS, backups, rate limiting, monitoring, audit retention. This is a working foundation — not a compliance certification.

---

## 7. Troubleshooting & FAQ

| Question | Answer |
|---|---|
| `npm ci` fails — Node version error | Requires Node 22+. Upgrade via `nvm install 22`. |
| Database locked / migration fails | No other process should hold the SQLite file. Check `DATABASE_URL` for Postgres. Run `npx prisma migrate deploy` manually. |
| Login returns 401 | Check credentials. Ensure cookies enabled and `APP_URL` matches origin. |
| `ALLOW_LOCAL_DEMO` not working | Only when `NODE_ENV !== "production"` and value is exactly `"true"`. Restart after change. |
| Import: Test not part of execution | Only tests in the execution can receive results. Add the test first. |
| Import: Execution not found | `testExecutionKey` must match an existing execution in the project. |
| Docker exits immediately | Check `docker logs <container>`. Usually missing `DATABASE_URL` or bad `.env`. |
| Jira sync imports nothing | Verify mapping is saved, Jira project has issues, `JIRA_*` env vars set. Check logs. |
| Use without Jira? | Yes — Jira is optional. All test management works standalone. |
| Kubernetes? | Yes — use GHCR image + Postgres service, mount secrets, set `APP_URL` to ingress host. |
| Backups? | SQLite: copy DB file. Postgres: `pg_dump`. Always back up `JIRA_TOKEN_KEY`. |
| SSO / SAML? | Not yet — email/password with scrypt. On the roadmap. |

Still stuck? Open an issue at https://github.com/karthikmprakash/betaray/issues
