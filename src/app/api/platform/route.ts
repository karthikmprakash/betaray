import { failure, jsonBody, sameOrigin } from "@/lib/server/http"
import { principalForProject, requireUser } from "@/lib/server/session"
import { mutatePlatform, readPlatform } from "@/lib/server/platform"

async function resolveUser(request: Request, projectId?: string | null) {
  const auth = request.headers.get("authorization")
  if (auth?.startsWith("Bearer ") && projectId) {
    try {
      return await principalForProject(request, projectId)
    } catch {
      // fall through to session auth for a better error in the caller
    }
  }
  return requireUser()
}

export async function GET(request: Request) {
  try {
    const projectId = new URL(request.url).searchParams.get("projectId")
    const user = await resolveUser(request, projectId)
    return Response.json(
      await readPlatform(user, projectId),
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
    const projectId = (body as { projectId?: string })?.projectId ?? null
    const auth = (request as Request).headers.get("authorization")
    // For token-based mutations the action itself declares write intent;
    // principalForProject enforces scope + project membership.
    const user = auth?.startsWith("Bearer ") && projectId
      ? await principalForProject(request as Request, projectId, true)
      : await requireUser()
    return Response.json(
      { result: await mutatePlatform(user, body) },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    return failure(error)
  }
}
