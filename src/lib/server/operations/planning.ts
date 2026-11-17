import { z } from "zod"
import { assert, idSchema, nameSchema } from "../http"
import { projectOp, type ProjectContext } from "./core"
import { nextKey, testIdsForKeys, validTestIds } from "./shared"

const collectionSchema = z.object({
  kind: z.enum(["set", "plan"]),
  name: nameSchema,
  testIds: z.array(idSchema).max(500).default([]),
  testKeys: z.array(z.string().max(80)).max(500).default([]),
})

async function createCollection(
  { db, projectId, audit }: ProjectContext,
  data: z.output<typeof collectionSchema>,
  ids: string[],
) {
  const fields = {
    projectId,
    key: await nextKey(db, projectId),
    name: data.name,
    tests: { create: ids.map((testId) => ({ testId })) },
  }
  const created =
    data.kind === "set"
      ? await db.testSet.create({ data: fields })
      : await db.testPlan.create({ data: fields })
  audit.entityId = created.id
  return created
}
const collectionTests = async (
  { db, projectId }: ProjectContext,
  data: z.output<typeof collectionSchema>,
) =>
  validTestIds(
    db,
    projectId,
    [...data.testIds, ...(await testIdsForKeys(db, projectId, data.testKeys))],
    true,
  )

projectOp({
  name: "collection.list",
  summary: "List test sets and test plans with the tests they contain.",
  access: "read",
  input: z.object({ kind: z.enum(["set", "plan"]).optional() }),
  async handler({ db, projectId }, { kind }) {
    const tests = { include: { test: { select: { key: true } } } }
    const [sets, plans] = await Promise.all([
      kind === "plan"
        ? []
        : db.testSet.findMany({ where: { projectId }, include: { tests } }),
      kind === "set"
        ? []
        : db.testPlan.findMany({
            where: { projectId },
            include: { tests, executions: { select: { key: true } } },
          }),
    ])
    return [
      ...sets.map((set) => ({
        kind: "set",
        id: set.id,
        key: set.key,
        name: set.name,
        testKeys: set.tests.map((item) => item.test.key),
      })),
      ...plans.map((plan) => ({
        kind: "plan",
        id: plan.id,
        key: plan.key,
        name: plan.name,
        status: plan.status,
        testKeys: plan.tests.map((item) => item.test.key),
        executionKeys: plan.executions.map((execution) => execution.key),
      })),
    ]
  },
})

projectOp({
  name: "collection.save",
  summary:
    "Create a test set or plan, or replace the name and tests of an existing one by id.",
  access: "write",
  input: collectionSchema.extend({ id: idSchema.optional() }),
  async handler(context, { id, ...data }) {
    const { db, projectId, audit } = context
    const ids = await collectionTests(context, data)
    if (!id) return createCollection(context, data, ids)
    const tests = { create: ids.map((testId) => ({ testId })) }
    audit.entityId = id
    if (data.kind === "set") {
      assert(
        await db.testSet.findFirst({ where: { id, projectId } }),
        404,
        "Set not found.",
      )
      await db.testSetTest.deleteMany({ where: { testSetId: id } })
      return db.testSet.update({
        where: { id },
        data: { name: data.name, tests },
      })
    }
    assert(
      await db.testPlan.findFirst({ where: { id, projectId } }),
      404,
      "Plan not found.",
    )
    await db.testPlanTest.deleteMany({ where: { testPlanId: id } })
    return db.testPlan.update({ where: { id }, data: { name: data.name, tests } })
  },
})

projectOp({
  name: "collection.clone",
  summary: "Create a new test set or plan from a list of tests.",
  access: "write",
  input: collectionSchema,
  handler: async (context, data) =>
    createCollection(context, data, await collectionTests(context, data)),
})

projectOp({
  name: "environment.list",
  summary: "List the environments executions can target.",
  access: "read",
  input: z.object({}),
  handler: ({ db, projectId }) =>
    db.environment.findMany({ where: { projectId }, orderBy: { name: "asc" } }),
})

projectOp({
  name: "environment.save",
  summary: "Create an environment, or update one by id.",
  access: "admin",
  input: z.object({
    id: idSchema.optional(),
    name: nameSchema,
    description: z.string().max(2000).default(""),
    baseUrl: z
      .union([
        z.literal(""),
        z
          .url()
          .refine(
            (url) => ["http:", "https:"].includes(new URL(url).protocol),
            "Use an HTTP or HTTPS URL.",
          ),
      ])
      .default(""),
    region: z.string().max(150).default(""),
  }),
  async handler({ db, projectId, audit }, { id, ...fields }) {
    if (!id) {
      const created = await db.environment.create({
        data: { projectId, ...fields },
      })
      audit.entityId = created.id
      return created
    }
    const previous = await db.environment.findFirst({ where: { id, projectId } })
    assert(previous, 404, "Environment not found.")
    // Executions reference environments by name, so a rename must follow through.
    await db.testExecution.updateMany({
      where: { projectId, environment: previous.name },
      data: { environment: fields.name },
    })
    audit.entityId = id
    return db.environment.update({ where: { id }, data: fields })
  },
})

projectOp({
  name: "environment.archive",
  summary: "Archive or restore an environment.",
  access: "admin",
  input: z.object({ id: idSchema, archived: z.boolean() }),
  async handler({ db, projectId, audit }, { id, archived }) {
    assert(
      await db.environment.findFirst({ where: { id, projectId } }),
      404,
      "Environment not found.",
    )
    audit.entityId = id
    return db.environment.update({
      where: { id },
      data: { archivedAt: archived ? new Date() : null },
    })
  },
})

projectOp({
  name: "version.list",
  summary: "List release versions.",
  access: "read",
  input: z.object({}),
  handler: ({ db, projectId }) =>
    db.releaseVersion.findMany({
      where: { projectId },
      orderBy: { name: "desc" },
    }),
})

projectOp({
  name: "version.save",
  summary: "Create a release version, or update one by id.",
  access: "admin",
  input: z.object({
    id: idSchema.optional(),
    name: nameSchema,
    status: z.enum(["Planned", "In Progress", "Released"]),
    description: z.string().max(2000).optional(),
  }),
  async handler({ db, projectId, audit }, { id, ...fields }) {
    if (!id) {
      const created = await db.releaseVersion.create({
        data: { projectId, ...fields },
      })
      audit.entityId = created.id
      return created
    }
    const previous = await db.releaseVersion.findFirst({
      where: { id, projectId },
    })
    assert(previous, 404, "Version not found.")
    await db.testExecution.updateMany({
      where: { projectId, version: previous.name },
      data: { version: fields.name },
    })
    audit.entityId = id
    return db.releaseVersion.update({ where: { id }, data: fields })
  },
})
