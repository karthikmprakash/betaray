import { assert, failure } from "@/lib/server/http"
import { runOperation } from "@/lib/server/operations"
import { resolvePrincipal } from "@/lib/server/session"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; revision: string }> },
) {
  try {
    const projectId = new URL(request.url).searchParams.get("projectId")
    assert(projectId, 400, "A projectId is required.")
    const { id, revision } = await params
    assert(/^\d+$/.test(revision), 400, "Select a valid revision.")
    return Response.json(
      await runOperation(await resolvePrincipal(request), {
        operation: "test.revision",
        projectId,
        input: { id, revision: Number(revision) },
      }),
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    return failure(error)
  }
}
