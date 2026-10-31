# Betaray CLI

CLI for [Betaray](https://github.com/...) — automate tests, executions, requirements, drafts and imports from your terminal or AI agents.

## Installation

```bash
# From npm (once published)
npm install -g betaray-cli
# or one-off
npx betaray-cli --help

# Local development
cd cli
npm install
npm run build
npm link        # makes `betaray` available globally
# or run directly
npx tsx src/index.ts --help
node dist/index.js --help
```

Requires Node.js >= 20.

## Quick start

```bash
# Authenticate (saves to ~/.betaray/config.json)
betaray login --url https://betaray.example.com --token btr_xxx --project proj_123

# Verify
betaray status
betaray whoami --json

# Projects
betaray project list
betaray project list --json

# Tests
betaray test list --project proj_123 --limit 20
betaray test list --json
betaray test get PROJ-1
betaray test create --summary "Login flow" --type Manual --priority High
betaray test create --summary "Checkout" --labels smokes,regression --folder Payments

# Piping / AI agents
echo '{"summary":"API test","type":"Generic"}' | betaray test create --stdin
betaray test create --file payload.json
cat payload.json | betaray test create --file - --project proj_123

# Executions
betaray execution list
betaray execution create --name "Sprint 1" --tests PROJ-1,PROJ-2 --env Staging --version v1.2
betaray execution import --execution PROJ-5 --file results.json
# results.json: [{"testKey":"PROJ-1","status":"PASS"},{"testKey":"PROJ-2","status":"FAIL","comment":"..."}]

# Requirements
betaray requirement list --json
betaray requirement create --summary "As a user I want..." --type Story

# Drafts (AI-generated)
betaray draft list
betaray draft generate --source "Requirements text..." --type Manual --mode template
betaray draft approve --id <draftId> --payload '{"summary":"...","steps":[...],"gherkin":""}'

# Bulk import
betaray import --file export.json --project proj_123
# export.json: {"tests":[{"summary":"Test A","type":"Manual"}]}

# Config
betaray config get
betaray config get url
betaray config set project proj_456
betaray config set format json
betaray config path
betaray config reset
betaray logout
```

## Global flags

Every command respects these global options and env vars:

| Flag | Env var | Description |
|------|---------|-------------|
| `--url <url>` | `BETARAY_URL` | Base URL |
| `--token <token>` | `BETARAY_TOKEN` | Bearer token |
| `--project <id>` | `BETARAY_PROJECT` | Default project ID |
| `--json` | — | JSON output (for agents/piping) |
| `--verbose` | — | Log HTTP requests |

Precedence: CLI flag > env var > config file (`~/.betaray/config.json`).

- `BETARAY_CONFIG` overrides the config file path.
- `XDG_CONFIG_HOME` is respected: `$XDG_CONFIG_HOME/betaray/config.json`.

## API

The CLI talks to your Betaray instance over HTTP. It normalizes the base URL and sends `Authorization: Bearer <token>`.

- `GET /api/tests?projectId=` — list tests
- `POST /api/tests` — create test
- `GET /api/platform?projectId=` — list executions/requirements/drafts/projects
- `POST /api/platform` with `{action, projectId, input}` — mutate (test.import, execution.create, etc.)
- `POST /api/v2/import/execution` — import execution results
- Tokens are created in the Betaray UI per-project (`token.create`); use a `write` scope for mutations.

## Exit codes

- `0` success
- `1` error (auth, validation, network, etc.)

## Development

```bash
cd cli
npm install
npm run build
npx tsx src/index.ts --help
```
