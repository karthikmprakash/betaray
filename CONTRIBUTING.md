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
- `src/app/api` — API routes, including Jira OAuth, sync, and webhooks
- `prisma/schema.prisma` — SQLite by default; Postgres is a deployment concern
- `docs/` — Jira setup and operational notes
- `scripts/migrate.mjs` — applies committed migrations

## Conventions

- No secrets in commits. `.env*` is ignored; use `.env.example` for placeholders.
- Access control is server-enforced. Hiding a button is not a security boundary.
- Keep the open-source posture: no fake SOC 2/ISO/GDPR/residency claims.
- Prefer small, focused PRs. Use the PR template.

## Releases

Maintainers tag `v*` — `release.yml` creates a GitHub Release with generated notes. `docker.yml` publishes `ghcr.io/karthikmprakash/betaray:<tag>` and `latest`.

## Security

Do not open public issues for vulnerabilities. See `SECURITY.md`.
