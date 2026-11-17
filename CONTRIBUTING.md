# Contributing to Betaray

Thanks for considering a contribution. Betaray is MIT-licensed and built for self-hosting.

## Quick start

```sh
npm ci
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run dev -- --port 3001
```

Open `http://localhost:3001/login` and create an organization. Add `ALLOW_LOCAL_DEMO="true"` to inspect sample data.

## Checks before a PR

```sh
npm run lint
npx tsc --noEmit
npm test
npm run build
```

All four must pass in CI.

## Project layout

- `src/app/app` — workspace UI (organization → workspace → project)
- `src/app/api` — HTTP routes, MCP, Jira OAuth, sync and webhooks
- `src/lib/server/operations` — the operation registry (the source of truth)
- `src/lib/server/platform.ts` — the web app's read model only
- `cli/` — generated-command CLI and stdio MCP bridge
- `prisma/schema.prisma` — SQLite by default; Postgres is a deployment concern
- `docs/` — setup and operational notes
- `scripts/migrate.mjs` — applies committed migrations

## Adding a capability

Every capability is declared once in `src/lib/server/operations/`. From that
declaration the web API, `/api/operations`, MCP tools and CLI commands are
generated automatically.

1. Add a definition to the relevant domain file with `projectOp`,
   `organizationOp` or `userOp`:
   - `name` (`group.verb`), `summary`, `access` (`read` / `write` / `admin`)
   - a Zod `input` schema with `.describe()` text for CLI/MCP help
   - `interactiveOnly` if it needs a signed-in browser session
   - `prepare` for slow network work that must run outside a transaction
   - a `handler` that uses `db`, sets `audit.entityId`, and returns JSON data
2. If you add a new domain file, import it in `operations/index.ts`.
3. Call it from the UI with `mutate("group.verb", input, projectId)`.
4. Add coverage to `tests/platform.test.mjs`.
5. Do not add a second CLI or MCP command list; both read the manifest.

CLI commands are generated from the server's `/api/operations` response, so a
deployed server immediately exposes new operations to agents. Interactive-only
operations are hidden from CLI/MCP token surfaces.

## Conventions

- No secrets in commits. `.env*` is ignored; use `.env.example` for placeholders.
- Access control is server-enforced. Hiding a button is not a security boundary.
- Keep the open-source posture: no fake SOC 2/ISO/GDPR/residency claims.
- Prefer small, focused PRs. Use the PR template.

## Releases

Maintainers tag `v*` — `release.yml` creates a GitHub Release with generated notes. `docker.yml` publishes `ghcr.io/karthikmprakash/betaray:<tag>` and `latest`.

## Security

Do not open public issues for vulnerabilities. See `SECURITY.md`.
