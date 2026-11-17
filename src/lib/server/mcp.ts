/**
 * Model Context Protocol server, stateless Streamable HTTP flavour.
 *
 * Tools are not declared here: every registered operation the caller may use
 * is exposed as a tool, with the operation's schema as its input schema.
 */
import { z } from "zod"
import { HttpError } from "./http"
import {
  describeOperations,
  runOperation,
  type Principal,
} from "./operations"
import packageJson from "../../../package.json"

const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"]

type Message = {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: Record<string, unknown>
}

// MCP tool names may not contain dots: test.create <-> test_create.
const toolName = (operation: string) => operation.replace(".", "_")
const operationName = (tool: string) => tool.replace("_", ".")

function describeError(error: unknown) {
  if (error instanceof HttpError) return error.message
  if (error instanceof z.ZodError)
    return (
      "Invalid arguments: " +
      error.issues
        .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
        .join("; ")
    )
  console.error("MCP tool call failed", error)
  return "The operation failed unexpectedly."
}

async function dispatch(principal: Principal, message: Message) {
  const params = message.params || {}
  switch (message.method) {
    case "initialize": {
      const requested = String(params.protocolVersion || "")
      return {
        protocolVersion: PROTOCOL_VERSIONS.includes(requested)
          ? requested
          : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "betaray", version: packageJson.version },
        instructions:
          "Betaray test management. This connection is bound to one project by its API token. Call project_get first, then *_list tools to find records. Tests, executions and requirements can be addressed by key (e.g. MAIN-412). Updates use optimistic locking: pass the revision you last read.",
      }
    }
    case "ping":
      return {}
    case "tools/list":
      return {
        tools: describeOperations(principal).map((operation) => ({
          name: toolName(operation.name),
          description: operation.summary,
          inputSchema: operation.inputSchema,
          annotations: {
            readOnlyHint: operation.access === "read",
            destructiveHint: false,
            openWorldHint: false,
          },
        })),
      }
    case "tools/call": {
      const name = String(params.name || "")
      try {
        const result = await runOperation(principal, {
          operation: operationName(name),
          input: params.arguments ?? {},
        })
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        }
      } catch (error) {
        // Tool failures are results the model can read and correct, not protocol errors.
        return {
          content: [{ type: "text", text: describeError(error) }],
          isError: true,
        }
      }
    }
    default:
      throw new HttpError(404, `Method not found: ${message.method}`)
  }
}

/** Handle one JSON-RPC message. Returns null for notifications, which get no reply. */
export async function handleMcpMessage(principal: Principal, message: Message) {
  if (message?.jsonrpc !== "2.0" || typeof message.method !== "string")
    return {
      jsonrpc: "2.0",
      id: message?.id ?? null,
      error: { code: -32600, message: "Invalid JSON-RPC request." },
    }
  if (message.id === undefined || message.id === null) return null
  try {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: await dispatch(principal, message),
    }
  } catch (error) {
    const missing = error instanceof HttpError && error.status === 404
    if (!missing) console.error("MCP request failed", error)
    return {
      jsonrpc: "2.0",
      id: message.id,
      error: {
        code: missing ? -32601 : -32603,
        message: missing ? (error as Error).message : "Internal error.",
      },
    }
  }
}
