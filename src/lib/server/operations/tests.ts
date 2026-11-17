import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { assert, idSchema, nameSchema } from "../http"
import { projectOp, type ProjectContext } from "./core"
import {
  folderId,
  pageSchema,
  priorities,
  refSchema,
  saveTest,
  testDto,
  testInclude,
  testSchema,
  testTypes,
} from "./shared"

async function findTest(
  { db, projectId }: ProjectContext,
  ref: { id?: string; key?: string },
) {
  assert(ref.id || ref.key, 400, "Provide a test id or key.")
  const test = await db.test.findFirst({
    where: { projectId, ...(ref.id ? { id: ref.id } : { key: ref.key }) },
    include: testInclude,
  })
  assert(test, 404, "Test not found.")
  return test
}

projectOp({
  name: "test.list",
  summary: "Search and page through the tests in a project.",
  access: "read",
  input: z.object({
    query: z.string().max(200).optional().describe("Matches summary or key."),
    type: testTypes.optional(),
    priority: priorities.optional(),
    status: z.enum(["TODO", "READY", "REVIEW"]).optional(),
    folder: z.string().max(120).optional(),
    label: z.string().max(80).optional(),
    requirement: z
      .string()
      .max(80)
      .optional()
      .describe("Only tests linked to this requirement key."),
    archived: z.boolean().default(false),
    detail: z
      .boolean()
      .default(false)
      .describe("Return full tests (steps, comments) instead of summaries."),
    ...pageSchema,
  }),
  async handler({ db, projectId, project }, input) {
    const where: Prisma.TestWhereInput = {
      projectId,
      archivedAt: input.archived ? { not: null } : null,
      type: input.type,
      priority: input.priority,
      status: input.status,
      ...(input.query
        ? {
            OR: [
              { summary: { contains: input.query } },
              { key: { contains: input.query } },
            ],
          }
        : {}),
      ...(input.folder ? { folder: { name: input.folder } } : {}),
      ...(input.requirement
        ? { requirementLinks: { some: { issue: { key: input.requirement } } } }
        : {}),
    }
    const summary = (test: ReturnType<typeof testDto>) =>
      input.detail
        ? test
        : {
            id: test.id,
            key: test.key,
            summary: test.summary,
            type: test.type,
            priority: test.priority,
            status: test.status,
            folder: test.folder,
            labels: test.labels,
            linkedRequirements: test.linkedRequirements,
            steps: test.steps.length,
            revision: test.revision,
            archived: !!test.archivedAt,
          }
    // `labels` is a comma-separated column. Prisma cannot express an exact
    // member match, so filter the project's tests in memory rather than
    // paginating before the filter (which would return wrong totals).
    if (input.label) {
      const matching = (
        await db.test.findMany({
          where,
          include: testInclude,
          orderBy: { createdAt: "desc" },
        })
      )
        .map((test) => testDto(test, project.key))
        .filter((test) => test.labels.includes(input.label as string))
      return {
        total: matching.length,
        offset: input.offset,
        items: matching.slice(input.offset, input.offset + input.limit).map(summary),
      }
    }
    const [total, tests] = await Promise.all([
      db.test.count({ where }),
      db.test.findMany({
        where,
        include: testInclude,
        orderBy: { createdAt: "desc" },
        take: input.limit,
        skip: input.offset,
      }),
    ])
    return {
      total,
      offset: input.offset,
      items: tests.map((test) => summary(testDto(test, project.key))),
    }
  },
})

projectOp({
  name: "test.get",
  summary: "Read one test with its steps, links, comments and revision list.",
  access: "read",
  input: z.object(refSchema),
  handler: async (context, ref) =>
    testDto(await findTest(context, ref), context.project.key),
})

projectOp({
  name: "test.revision",
  summary: "Read the snapshot of a test as it was at an earlier revision.",
  access: "read",
  input: z.object({ ...refSchema, revision: z.number().int().positive() }),
  async handler(context, { revision, ...ref }) {
    const test = await findTest(context, ref)
    const record = await context.db.testRevision.findUnique({
      where: { testId_revision: { testId: test.id, revision } },
    })
    assert(record, 404, "Revision not found.")
    return { revision, snapshot: JSON.parse(record.snapshot) }
  },
})

projectOp({
  name: "test.create",
  summary: "Create a test with steps or Gherkin, labels and requirement links.",
  access: "write",
  input: testSchema,
  async handler({ db, projectId, user, audit }, input) {
    const id = await saveTest(db, projectId, input, user)
    audit.entityId = id
    const { key } = await db.test.findUniqueOrThrow({ where: { id } })
    return { id, key }
  },
})

projectOp({
  name: "test.update",
  summary:
    "Replace a test's content. Send the full test and the revision you last read; a stale revision is rejected.",
  access: "write",
  input: testSchema.extend({
    ...refSchema,
    revision: z.number().int().positive(),
  }),
  async handler(context, { id, key, revision, ...input }) {
    const { db, projectId, user, audit } = context
    const target = id || (await findTest(context, { key })).id
    audit.entityId = await saveTest(db, projectId, input, user, {
      id: target,
      revision,
    })
    return { id: audit.entityId }
  },
})

projectOp({
  name: "test.restore",
  summary: "Restore a test to an earlier revision, recorded as a new revision.",
  access: "write",
  input: z.object({
    id: idSchema,
    sourceRevision: z.number().int().positive(),
    revision: z
      .number()
      .int()
      .positive()
      .describe("The current revision you last read."),
  }),
  async handler({ db, projectId, user, audit }, data) {
    assert(
      await db.test.findFirst({ where: { id: data.id, projectId } }),
      404,
      "Test not found.",
    )
    const previous = await db.testRevision.findUnique({
      where: {
        testId_revision: { testId: data.id, revision: data.sourceRevision },
      },
    })
    assert(previous, 404, "Revision not found.")
    const snapshot = testSchema.parse(JSON.parse(previous.snapshot))
    // Requirements deleted since the snapshot cannot be re-linked; restore the rest.
    const surviving = await db.issue.findMany({
      where: { projectId, key: { in: snapshot.linkedRequirements } },
      select: { key: true },
    })
    audit.entityId = await saveTest(
      db,
      projectId,
      { ...snapshot, linkedRequirements: surviving.map((issue) => issue.key) },
      user,
      { id: data.id, revision: data.revision },
    )
    return { id: audit.entityId }
  },
})

projectOp({
  name: "test.import",
  summary: "Create up to 200 tests in one atomic request.",
  access: "write",
  input: z.object({ tests: z.array(testSchema).min(1).max(200) }),
  async handler({ db, projectId, user, audit }, { tests }) {
    const ids: string[] = []
    for (const test of tests)
      ids.push(await saveTest(db, projectId, test, user))
    audit.entityId = ids[0]
    audit.detail = `${ids.length} tests`
    return { ids }
  },
})

projectOp({
  name: "test.bulk",
  summary: "Archive, restore, reprioritize or move many tests at once.",
  access: "write",
  input: z.object({
    ids: z.array(idSchema).min(1).max(200),
    archived: z.boolean().optional(),
    priority: priorities.optional(),
    folder: z.string().trim().min(1).max(120).optional(),
  }),
  async handler({ db, projectId, project, user, audit }, data) {
    const existing = await db.test.findMany({
      where: { projectId, id: { in: data.ids } },
      include: testInclude,
    })
    assert(
      existing.length === new Set(data.ids).size,
      400,
      "Select tests from the current project.",
    )
    for (const test of existing)
      await db.testRevision.create({
        data: {
          testId: test.id,
          revision: test.revision,
          snapshot: JSON.stringify(testDto(test, project.key)),
          actor: user.name,
        },
      })
    audit.detail = JSON.stringify(data)
    return db.test.updateMany({
      where: { projectId, id: { in: data.ids } },
      data: {
        ...(data.archived !== undefined
          ? { archivedAt: data.archived ? new Date() : null }
          : {}),
        priority: data.priority,
        folderId: data.folder
          ? await folderId(db, projectId, data.folder)
          : undefined,
        revision: { increment: 1 },
      },
    })
  },
})

projectOp({
  name: "test.comment",
  summary: "Add a comment to a test.",
  access: "write",
  input: z.object({
    ...refSchema,
    body: z.string().trim().min(1).max(8000),
  }),
  async handler(context, { body, ...ref }) {
    const test = await findTest(context, ref)
    context.audit.entityId = test.id
    return context.db.testComment.create({
      data: { testId: test.id, body, actor: context.user.name },
    })
  },
})

projectOp({
  name: "folder.list",
  summary: "List the test folders in a project.",
  access: "read",
  input: z.object({}),
  handler: ({ db, projectId }) =>
    db.folder.findMany({
      where: { projectId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, _count: { select: { tests: true } } },
    }),
})

projectOp({
  name: "folder.create",
  summary: "Create a test folder.",
  access: "write",
  input: z.object({ name: nameSchema }),
  async handler({ db, projectId }, { name }) {
    assert(
      !(await db.folder.findFirst({ where: { projectId, name } })),
      409,
      "A folder with this name already exists.",
    )
    return db.folder.create({ data: { projectId, name } })
  },
})
