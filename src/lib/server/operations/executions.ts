import { z } from "zod"
import { executionStatus } from "@/lib/execution"
import { assert, idSchema, nameSchema } from "../http"
import { projectOp, type ProjectContext } from "./core"
import {
  nextKey,
  pageSchema,
  refSchema,
  runStatuses,
  testIdsForKeys,
  validTestIds,
} from "./shared"

const tally = (runs: { status: string }[]) =>
  runs.reduce<Record<string, number>>((counts, run) => {
    counts[run.status] = (counts[run.status] || 0) + 1
    return counts
  }, {})

async function findExecution(
  { db, projectId }: ProjectContext,
  ref: { id?: string; key?: string },
) {
  assert(ref.id || ref.key, 400, "Provide an execution id or key.")
  const execution = await db.testExecution.findFirst({
    where: { projectId, ...(ref.id ? { id: ref.id } : { key: ref.key }) },
  })
  assert(execution, 404, "Execution not found in this project.")
  return execution
}

/** Recompute the execution's roll-up status after its runs changed. */
async function refreshStatus(
  { db }: ProjectContext,
  id: string,
  bumpRevision = false,
) {
  const runs = await db.testRun.findMany({ where: { executionId: id } })
  return db.testExecution.update({
    where: { id },
    data: {
      status: executionStatus(runs),
      ...(bumpRevision ? { revision: { increment: 1 } } : {}),
    },
  })
}

projectOp({
  name: "execution.list",
  summary: "List test executions with a count of runs per status.",
  access: "read",
  input: z.object({
    status: z.enum(["To Do", "In Progress", "Done", "Aborted"]).optional(),
    environment: z.string().max(200).optional(),
    version: z.string().max(120).optional(),
    ...pageSchema,
  }),
  async handler({ db, projectId }, { limit, offset, ...filters }) {
    const where = { projectId, ...filters }
    const [total, executions] = await Promise.all([
      db.testExecution.count({ where }),
      db.testExecution.findMany({
        where,
        include: { runs: { select: { status: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
    ])
    return {
      total,
      offset,
      items: executions.map(({ runs, ...execution }) => ({
        id: execution.id,
        key: execution.key,
        name: execution.name,
        status: execution.status,
        environment: execution.environment,
        version: execution.version,
        revision: execution.revision,
        createdAt: execution.createdAt,
        runs: tally(runs),
      })),
    }
  },
})

projectOp({
  name: "execution.get",
  summary: "Read one execution with the result of every test run in it.",
  access: "read",
  input: z.object(refSchema),
  async handler(context, ref) {
    const execution = await findExecution(context, ref)
    const runs = await context.db.testRun.findMany({
      where: { executionId: execution.id },
      include: { test: { select: { key: true, summary: true } } },
    })
    return {
      ...execution,
      counts: tally(runs),
      runs: runs.map(({ test, ...run }) => ({
        testId: run.testId,
        testKey: test.key,
        summary: test.summary,
        status: run.status,
        comment: run.comment,
        defects: run.defects,
        executedBy: run.executedBy,
        executedAt: run.executedAt,
      })),
    }
  },
})

projectOp({
  name: "execution.create",
  summary:
    "Start a test execution for a set of tests in an environment. Tests may be given by id or key.",
  access: "write",
  input: z.object({
    name: nameSchema,
    testIds: z.array(idSchema).max(500).default([]),
    testKeys: z.array(z.string().max(80)).max(500).default([]),
    env: nameSchema.describe("Name of an active environment in this project."),
    version: z.string().max(120).optional(),
    planId: idSchema.optional(),
  }),
  async handler({ db, projectId, audit }, data) {
    const ids = await validTestIds(db, projectId, [
      ...data.testIds,
      ...(await testIdsForKeys(db, projectId, data.testKeys)),
    ])
    assert(ids.length > 0, 400, "Select at least one test.")
    assert(
      await db.environment.findFirst({
        where: { projectId, name: data.env, archivedAt: null },
      }),
      400,
      "Select an active environment in this project.",
    )
    if (data.planId)
      assert(
        await db.testPlan.findFirst({ where: { id: data.planId, projectId } }),
        400,
        "Plan is outside this project.",
      )
    const execution = await db.testExecution.create({
      data: {
        key: await nextKey(db, projectId),
        projectId,
        name: data.name,
        environment: data.env,
        version: data.version,
        testPlanId: data.planId,
        runs: { create: ids.map((testId) => ({ testId })) },
      },
    })
    audit.entityId = execution.id
    return execution
  },
})

projectOp({
  name: "execution.update",
  summary:
    "Record one run's result, edit execution notes, or pass every run. Requires the revision you last read.",
  access: "write",
  input: z.object({
    id: idSchema,
    revision: z.number().int(),
    testId: idSchema.optional(),
    status: runStatuses.optional(),
    comment: z.string().max(8000).optional(),
    defects: z.string().max(1000).optional(),
    notes: z.string().max(20000).optional(),
    bulkPass: z.boolean().optional(),
  }),
  async handler(context, data) {
    const { db, projectId, user, audit } = context
    const changed = await db.testExecution.updateMany({
      where: { id: data.id, projectId, revision: data.revision },
      data: { revision: { increment: 1 }, notes: data.notes },
    })
    assert(
      changed.count === 1,
      409,
      "This execution changed. Refresh before saving.",
    )
    const executed = { executedBy: user.name, executedAt: new Date() }
    if (data.bulkPass)
      await db.testRun.updateMany({
        where: { executionId: data.id },
        data: { status: "PASS", ...executed },
      })
    assert(
      data.testId || (!data.status && !data.comment && !data.defects),
      400,
      "Choose the test run this result belongs to.",
    )
    if (data.testId) {
      const run = await db.testRun.findUnique({
        where: {
          testId_executionId: { testId: data.testId, executionId: data.id },
        },
      })
      assert(run, 400, "This test is not part of the execution.")
      await db.testRun.update({
        where: { id: run.id },
        data: {
          status: data.status,
          comment: data.comment,
          defects: data.defects,
          ...executed,
        },
      })
    }
    audit.entityId = data.id
    return refreshStatus(context, data.id)
  },
})

projectOp({
  name: "execution.import",
  summary:
    "Report automated results into an execution by test key, atomically. The usual CI entry point.",
  access: "write",
  input: z.object({
    ...refSchema,
    results: z
      .array(
        z.object({
          testKey: z.string().min(1).max(80),
          status: runStatuses,
          comment: z.string().max(8000).optional(),
          defects: z.string().max(1000).optional(),
        }),
      )
      .min(1)
      .max(500),
  }),
  async handler(context, { results, ...ref }) {
    const { db, projectId, user, audit } = context
    const execution = await findExecution(context, ref)
    const ids = await testIdsForKeys(
      db,
      projectId,
      results.map((result) => result.testKey),
    )
    const byKey = new Map(
      [...new Set(results.map((result) => result.testKey))].map(
        (key, index) => [key, ids[index]],
      ),
    )
    for (const result of results) {
      const where = {
        testId_executionId: {
          testId: byKey.get(result.testKey)!,
          executionId: execution.id,
        },
      }
      assert(
        await db.testRun.findUnique({ where }),
        400,
        `Test ${result.testKey} is not part of this execution.`,
      )
      await db.testRun.update({
        where,
        data: {
          status: result.status,
          comment: result.comment,
          defects: result.defects,
          executedBy: user.name,
          executedAt: new Date(),
        },
      })
    }
    audit.entityId = execution.id
    audit.detail = `${results.length} test runs`
    const updated = await refreshStatus(context, execution.id, true)
    return {
      testExecution: execution.key,
      imported: results.length,
      status: updated.status,
    }
  },
})
