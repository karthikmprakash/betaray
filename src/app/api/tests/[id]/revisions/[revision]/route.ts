import { prisma } from "@/lib/db"
import { assert, failure } from "@/lib/server/http"
import { requireUser } from "@/lib/server/session"
import { projectAccess } from "@/lib/server/permissions"
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; revision: string }> },
) {
  try {
    const user = await requireUser()
    const projectId = new URL(request.url).searchParams.get("projectId")
    assert(projectId, 400, "A projectId is required.")
    await projectAccess(user.id, projectId)
    const { id, revision } = await params
    assert(/^\d+$/.test(revision), 400, "Select a valid revision.")
    assert(
      await prisma.test.findFirst({ where: { id, projectId } }),
      404,
      "Test not found.",
    )
    const record = await prisma.testRevision.findUnique({
      where: { testId_revision: { testId: id, revision: Number(revision) } },
    })
    assert(record, 404, "Revision not found.")
    return Response.json(
      { revision: record.revision, snapshot: JSON.parse(record.snapshot) },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    return failure(error)
  }
}
