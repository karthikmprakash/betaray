# Betaray

<p>
  <a href="https://github.com/karthikmprakash/betaray/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/karthikmprakash/betaray/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://github.com/karthikmprakash/betaray/pkgs/container/betaray"><img alt="GHCR" src="https://img.shields.io/badge/ghcr.io-betaray-0ea5e9?logo=docker" /></a>
  <a href="https://github.com/karthikmprakash/betaray/releases"><img alt="Release" src="https://img.shields.io/github/v/release/karthikmprakash/betaray?sort=semver" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green" /></a>
  <a href="https://nextjs.org"><img alt="Next.js 16" src="https://img.shields.io/badge/next.js-16-black?logo=next.js" /></a>
</p>

### See beyond the surface.

Open-source test management — an **Xray alternative** built for self-hosting. Organize work as **organization → workspace → project → tests**, with revisions, draft review, executions, coverage, scoped API tokens, and **Jira Cloud sync**. No fake compliance claims.

Inspired by the manta ray: broad coverage, precise filtering, and movement that keeps quality connected. Read the [brand narrative](docs/Betaray_Brand_Narrative.md).

- **Stack:** Next.js 16 + React 19, Prisma 6, SQLite (local) → Postgres-ready, Zustand, Tailwind
- **Auth:** email/password, scrypt, HttpOnly sessions, throttling, Owner/Admin/Tester/Viewer roles
- **Jira Cloud:** OAuth 2.0 (3LO), encrypted tokens, project mapping, `search/jql` sync, webhooks
- **Run anywhere:** `npm` locally or `ghcr.io/karthikmprakash/betaray` via Docker

---

## Quick start

Requires **Node 22+**.

```sh
git clone https://github.com/karthikmprakash/betaray.git
cd betaray
npm ci
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run dev -- --port 3001
```

Open **http://localhost:3001/login** and create an organization. Signup creates a workspace and first project. For sample data, set `ALLOW_LOCAL_DEMO="true"` in `.env` and use **Open local demo** at sign-in (disabled in production).

## Docker (GHCR)

```sh
docker run --env-file .env -p 3000:3000 ghcr.io/karthikmprakash/betaray:latest
# or build locally
docker build -t betaray:local .
docker run --env-file .env -p 3000:3000 betaray:local
```

Images are published on every push to `main` as `main`, `main-<sha>`, and `latest`, and on tags as `v*`. See [`.github/workflows/docker.yml`](.github/workflows/docker.yml).

Set these in production:

```env
DATABASE_URL="file:./data/prod.db"   # or your Postgres URL when you migrate
APP_URL="https://qa.example.com"
JIRA_CLIENT_ID=""        # only if you use Jira Cloud
JIRA_CLIENT_SECRET=""
JIRA_REDIRECT_URI="https://qa.example.com/api/integrations/jira/callback"
JIRA_TOKEN_KEY=""         # 32+ random bytes, e.g. openssl rand -base64 48
```

Keep `JIRA_TOKEN_KEY` stable — rotating it makes stored Jira tokens unreadable.

## Features

- Organizations, workspaces, projects with archive/restore and project-scoped keys
- Tests, folders, labels, manual steps, Gherkin, revisions with restore, comments, requirement links, coverage
- Test sets/plans → executions with environment/version, bulk results, CSV export
- Draft editing with requirement linking, template/AI scaffolds, human review and single-use approval
- Exploratory charters with timers, observations → defects
- Project-scoped API tokens (read/write, expiry, revocation, hashed storage)
- Jira Cloud OAuth per project, `search/jql` import, preserved test links, optional webhooks
- Audit log with search/export (application log, not certified immutable storage)

Full Jira setup is in [`docs/jira-integration.md`](docs/jira-integration.md).

## API

Create a token in **Integrations & API** (shown once, store it in your CI secrets):

- `GET /api/tests?projectId=…` — list tests
- `POST /api/tests` — create a test (`projectId`, `summary`, …)
- `POST /api/v2/import/execution` — atomically update runs (`projectId`, `testExecutionKey`, `tests: [{ testKey, status, comment? }]`)

Authenticate with `Authorization: Bearer <token>`. The interactive `/api/platform` API requires a browser session.

Example:

```sh
curl -X POST "$APP_URL/api/v2/import/execution" \
  -H "Authorization: Bearer $BETARAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"...","testExecutionKey":"BET-1","tests":[{"testKey":"BET-T1","status":"PASS"}]}'
```

## Verification

```sh
npm run lint
npx tsc --noEmit
npm test        # isolated temp DB + server, no demo data or AI calls
npm run build
```

## Self-hosting notes

This is a working foundation, not a compliance certification. Before production:

- Email verification, password recovery, MFA/SSO as needed
- Postgres, backups/restores, object storage for attachments (currently text/URL evidence only)
- HTTPS, `APP_URL`, rate limiting, monitoring, audit retention
- Review onboarding, private-project access, approval separation, accessibility

No SSO, certification, or residency guarantee is presented as active functionality.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`SECURITY.md`](SECURITY.md). PRs should pass lint, typecheck, tests, and build. Use the issue and PR templates.

## License

[MIT](LICENSE) — see `LICENSE`. Betaray is not affiliated with Xray or Atlassian.
