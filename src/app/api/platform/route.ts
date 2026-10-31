import { failure, jsonBody, sameOrigin } from "@/lib/server/http"
import { requireUser } from "@/lib/server/session"
import { mutatePlatform, readPlatform } from "@/lib/server/platform"

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    return Response.json(
      await readPlatform(
        user,
        new URL(request.url).searchParams.get("projectId"),
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    return failure(error)
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const user = await requireUser()
    return Response.json(
      { result: await mutatePlatform(user, await jsonBody(request)) },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    return failure(error)
  }
}
