import { z } from "zod"
import { failure, idSchema, jsonBody, sameOrigin } from "@/lib/server/http"
import { resolvePrincipal } from "@/lib/server/session"
import { describeOperations, runOperation } from "@/lib/server/operations"
import packageJson from "../../../../package.json"

/**
 * The operation manifest: every capability with its JSON Schema input.
 * It is documentation, not data, so it is public and cacheable. The CLI builds
 * its commands from it.
 */
export async function GET() {
  return Response.json(
    { version: packageJson.version, operations: describeOperations() },
    { headers: { "Cache-Control": "public, max-age=60" } },
  )
}

/** Invoke any operation: `{ operation, projectId?, organizationId?, input? }`. */
export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const body = z
      .object({
        operation: z.string().max(80),
        projectId: idSchema.optional(),
        organizationId: idSchema.optional(),
        input: z.unknown().optional(),
      })
      .parse(await jsonBody(request))
    const principal = await resolvePrincipal(request)
    return Response.json(
      { result: await runOperation(principal, body) },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    return failure(error)
  }
}
