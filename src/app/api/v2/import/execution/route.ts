import { z } from "zod"
import { failure, jsonBody, sameOrigin } from "@/lib/server/http"
import { resolvePrincipal } from "@/lib/server/session"
import { runOperation } from "@/lib/server/operations"

// Stable REST alias for CI result reporting; delegates to `execution.import`.
export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const data = z
      .object({
        projectId: z.string().min(1),
        testExecutionKey: z.string().min(1),
        tests: z.array(z.unknown()).min(1).max(500),
      })
      .parse(await jsonBody(request))
    return Response.json(
      await runOperation(await resolvePrincipal(request), {
        operation: "execution.import",
        projectId: data.projectId,
        input: { key: data.testExecutionKey, results: data.tests },
      }),
    )
  } catch (error) {
    return failure(error)
  }
}
export async function GET() {
  return Response.json({
    authentication: "Bearer API token with write scope, or a signed-in session",
    method: "POST",
    body: {
      projectId: "Project ID",
      testExecutionKey: "Execution key",
      tests: [
        { testKey: "Test key", status: "PASS", comment: "Optional notes" },
      ],
    },
  })
}
