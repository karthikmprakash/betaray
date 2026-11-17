# Betaray CLI

Automate Betaray from a terminal, CI, or an AI agent. Commands are generated
from the server's operation manifest, so they always match the capabilities of
the instance you connect to.

## Install

```bash
npm install -g betaray-cli
# or one-off
npx betaray-cli --help

# from this repo
cd cli
npm install
npm run build
npm link          # puts `betaray` on PATH
# or run directly
npx tsx src/index.ts --help
node dist/index.js --help
```

Requires Node.js >= 20.

## Connect

Create a project token in **Integrations & API → Create API token**. A token
already names its project, so `--project` is optional.

```bash
betaray login --url https://betaray.example.com --token btr_xxx
betaray status
betaray whoami --json
```

Config is stored at `~/.betaray/config.json` (mode 600), or
`$XDG_CONFIG_HOME/betaray/config.json`. Override the path with
`BETARAY_CONFIG`.

Precedence: **CLI flag → environment → config file**.

| Flag | Env var | Purpose |
|---|---|---|
| `--url <url>` | `BETARAY_URL` | Betaray origin |
| `--token <token>` | `BETARAY_TOKEN` | Project API token |
| `--project <id>` | `BETARAY_PROJECT` | Only needed with a session-style setup |
| `--organization <id>` | — | Organization-level operations |
| `--json` | — | Compact JSON, including errors |
| `--verbose` | — | Log HTTP requests |

## Generated commands

The CLI fetches `GET /api/operations` and creates one command per operation:
`test.list` → `betaray test list`, `execution.import` →
`betaray execution import`. Every operation's input schema becomes flags.

```bash
betaray ops                     # list every operation
betaray ops --json              # full input schemas
betaray test list --limit 20
betaray test list --query login --label smoke --json
betaray test get --key MAIN-401
betaray test create --summary "Login flow" --type Manual --priority High
betaray test create --summary "Checkout" --steps @steps.json
betaray execution list
betaray execution create --name "Nightly" --test-keys MAIN-401,MAIN-402 --env Staging
betaray execution import --key MAIN-410 --results @results.json
betaray requirement list --json
betaray requirement coverage
```

`--input` supplies the whole JSON payload; individual flags override its
fields. `@file` reads a file, and `-` reads stdin:

```bash
echo '{"summary":"API test","type":"Generic"}' \
  | betaray test create --input -
betaray requirement create --input @requirement.json
```

Use `betaray call <operation> '<json>'` for anything not worth a flag:

```bash
betaray call requirement.coverage
```

Interactive-only operations (creating tokens, approving AI drafts, organization
creation) require a signed-in browser session and are not generated as CLI
commands. `betaray ops` shows them with access `session`.

## MCP for agents

`betaray mcp` starts a stdio MCP server that relays to the instance's
`/api/mcp` endpoint. The tool list is generated from the same operation
registry; it is filtered by the token's project and read/write scope.

```json
{
  "mcpServers": {
    "betaray": {
      "command": "betaray",
      "args": ["mcp"],
      "env": {
        "BETARAY_URL": "https://betaray.example.com",
        "BETARAY_TOKEN": "btr_xxx"
      }
    }
  }
}
```

For a direct HTTP MCP client, POST JSON-RPC to:

```text
POST https://betaray.example.com/api/mcp
Authorization: Bearer btr_xxx
Content-Type: application/json
```

The endpoint is stateless Streamable HTTP. Supported methods include
`initialize`, `ping`, `tools/list` and `tools/call`. A read token receives only
read tools; a write token receives project write tools. Token, member and
organization-administration tools are never exposed to API tokens.

## Exit codes

- `0` success
- `1` authentication, validation, network or command error

## Development

```bash
cd cli
npm install
npm run build
npx tsx src/index.ts --help
```

The command list is cached in `manifest.json` beside the config for five
minutes. Use `betaray ops` to refresh it, or delete the cache to force a fetch.
