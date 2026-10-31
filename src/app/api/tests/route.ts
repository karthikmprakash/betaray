import { assert, failure, jsonBody, sameOrigin } from "@/lib/server/http"
import { principalForProject } from "@/lib/server/session"
import { readPlatform, mutatePlatform } from "@/lib/server/platform"

export async function GET(request: Request) {
  try {
    const projectId = new URL(request.url).searchParams.get("projectId")
    assert(projectId, 400, "A projectId is required.")
    const user = await principalForProject(request, projectId)
    const state = await readPlatform(user, projectId)
    return Response.json(
      { count: state.tests.length, tests: state.tests },
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
    assert(typeof body.projectId === "string", 400, "A projectId is required.")
    const user = await principalForProject(request, body.projectId, true)
    return Response.json(
      await mutatePlatform(user, {
        action: "test.create",
        projectId: body.projectId,
        input: body,
      }),
      { status: 201 },
    )
  } catch (error) {
    return failure(error)
  }
}
