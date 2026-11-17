import { z } from "zod"
import { failure, idSchema, jsonBody, sameOrigin } from "@/lib/server/http"
import { resolvePrincipal } from "@/lib/server/session"
import { runOperation } from "@/lib/server/operations"
import { readPlatform } from "@/lib/server/platform"

/** The web app's read model. API tokens receive a project-confined view. */
export async function GET(request: Request) {
  try {
    const { user, token } = await resolvePrincipal(request)
    const projectId =
      new URL(request.url).searchParams.get("projectId") ||
      token?.projectId ||
      null
    if (token && projectId !== token.projectId)
      return Response.json(
        { error: "This API token is scoped to another project." },
        { status: 403 },
      )
    return Response.json(await readPlatform(user, projectId, !!token), {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    return failure(error)
  }
}

/** The web app's mutations: `{ action, projectId?, organizationId?, input }`. */
export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const body = z
      .object({
        action: z.string().max(80),
        projectId: idSchema.optional(),
        organizationId: idSchema.optional(),
        input: z.unknown().default({}),
      })
      .parse(await jsonBody(request))
    const principal = await resolvePrincipal(request)
    return Response.json(
      {
        result: await runOperation(principal, {
          operation: body.action,
          projectId: body.projectId,
          organizationId: body.organizationId,
          input: body.input,
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    return failure(error)
  }
}
