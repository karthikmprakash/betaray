import { HttpError, failure, jsonBody } from "@/lib/server/http"
import { handleMcpMessage } from "@/lib/server/mcp"
import { resolvePrincipal } from "@/lib/server/session"

/**
 * MCP endpoint (Streamable HTTP, stateless). Authenticate with a project API
 * token: `Authorization: Bearer btr_…`. Cookie sessions are refused so a web
 * page can never drive tools with a signed-in person's authority.
 */
export async function POST(request: Request) {
  try {
    if (!request.headers.get("authorization"))
      throw new HttpError(401, "Send a project API token as a bearer token.")
    const principal = await resolvePrincipal(request)
    const body = await jsonBody(request)
    const replies = []
    for (const message of Array.isArray(body) ? body : [body]) {
      const reply = await handleMcpMessage(principal, message)
      if (reply) replies.push(reply)
    }
    if (!replies.length) return new Response(null, { status: 202 })
    return Response.json(Array.isArray(body) ? replies : replies[0], {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    const response = failure(error)
    if (response.status === 401)
      response.headers.set("WWW-Authenticate", 'Bearer realm="betaray"')
    return response
  }
}

// No server-initiated stream is offered; the spec allows 405 here.
const notAllowed = () =>
  new Response(null, { status: 405, headers: { Allow: "POST" } })
export const GET = notAllowed
export const DELETE = notAllowed
