import { executionStatus } from "@/lib/execution"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { assert, failure, jsonBody, sameOrigin } from "@/lib/server/http"
import { projectAccess, transactionWriteAccess } from "@/lib/server/permissions"
import { principalForProject } from "@/lib/server/session"

export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const data = z
      .object({
        projectId: z.string().min(1),
        testExecutionKey: z.string().min(1),
        tests: z
          .array(
            z.object({
              testKey: z.string().min(1),
              status: z.enum([
                "TODO",
                "PASS",
                "FAIL",
                "EXECUTING",
                "ABORTED",
                "BLOCKED",
              ]),
              comment: z.string().max(8000).optional(),
            }),
          )
          .min(1)
          .max(500),
      })
      .parse(await jsonBody(request))
    const user = await principalForProject(request, data.projectId, true)
    const access = await projectAccess(user.id, data.projectId, true)
    const imported = await prisma.$transaction(async (tx) => {
      await transactionWriteAccess(tx, user.id, data.projectId)
      const execution = await tx.testExecution.findUnique({
        where: {
          projectId_key: {
            projectId: data.projectId,
            key: data.testExecutionKey,
          },
        },
      })
      assert(execution, 404, "Execution not found in this project.")
      for (const item of data.tests) {
        const test = await tx.test.findUnique({
          where: {
            projectId_key: { projectId: data.projectId, key: item.testKey },
          },
        })
        assert(test, 400, `Test ${item.testKey} is not in this project.`)
        assert(
          await tx.testRun.findUnique({
            where: {
              testId_executionId: {
                testId: test.id,
                executionId: execution.id,
              },
            },
          }),
          400,
          `Test ${item.testKey} is not part of this execution.`,
        )
        await tx.testRun.update({
          where: {
            testId_executionId: { testId: test.id, executionId: execution.id },
          },
          data: {
            status: item.status,
            comment: item.comment,
            executedBy: user.name,
            executedAt: new Date(),
          },
        })
      }
      const runs = await tx.testRun.findMany({
        where: { executionId: execution.id },
      })
      await tx.testExecution.update({
        where: { id: execution.id },
        data: { revision: { increment: 1 }, status: executionStatus(runs) },
      })
      await tx.auditLog.create({
        data: {
          organizationId: access.organizationId,
          projectId: data.projectId,
          userId: user.id,
          action: "Imported execution results",
          entity: "Execution",
          entityId: execution.id,
          detail: `${data.tests.length} test runs`,
        },
      })
      return data.tests.length
    })
    return Response.json({ testExecution: data.testExecutionKey, imported })
  } catch (error) {
    return failure(error)
  }
}
export async function GET() {
  return Response.json({
    authentication: "Signed-in session required",
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
