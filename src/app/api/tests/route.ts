import { assert, failure, jsonBody, sameOrigin } from "@/lib/server/http"
import { resolvePrincipal } from "@/lib/server/session"
import { runOperation } from "@/lib/server/operations"

// Stable REST aliases for CI scripts. Both delegate to the operation registry.
export async function GET(request: Request) {
  try {
    const projectId = new URL(request.url).searchParams.get("projectId")
    assert(projectId, 400, "A projectId is required.")
    const principal = await resolvePrincipal(request)
    assert(
      !principal.token || principal.token.projectId === projectId,
      401,
      "The API token is invalid, expired, revoked, or scoped to another project.",
    )
    const tests: unknown[] = []
    for (;;) {
      const page = (await runOperation(principal, {
        operation: "test.list",
        projectId,
        input: { detail: true, limit: 200, offset: tests.length },
      })) as { total: number; items: unknown[] }
      tests.push(...page.items)
      if (!page.items.length || tests.length >= page.total) break
    }
    return Response.json(
      { count: tests.length, tests },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    return failure(error)
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const body = await jsonBody(request)
    assert(typeof body?.projectId === "string", 400, "A projectId is required.")
    return Response.json(
      await runOperation(await resolvePrincipal(request), {
        operation: "test.create",
        projectId: body.projectId,
        input: body,
      }),
      { status: 201 },
    )
  } catch (error) {
    return failure(error)
  }
}
