import type { Prisma, User } from "@prisma/client"
import { z } from "zod"
import { assert, idSchema, nameSchema } from "../http"
import type { Db } from "./core"

export const priorities = z.enum(["Highest", "High", "Medium", "Low"])
export const testTypes = z.enum(["Manual", "Cucumber", "Generic"])
export const runStatuses = z.enum([
  "TODO",
  "PASS",
  "FAIL",
  "EXECUTING",
  "ABORTED",
  "BLOCKED",
])
export const stepSchema = z.object({
  action: z.string().trim().min(1).max(4000),
  data: z.string().max(4000).optional(),
  expected: z.string().max(4000).optional(),
})
export const testSchema = z.object({
  summary: nameSchema,
  description: z.string().max(20000).optional(),
  type: testTypes.default("Manual"),
  priority: priorities.default("Medium"),
  status: z.enum(["TODO", "READY", "REVIEW"]).default("TODO"),
  folder: z.string().trim().max(120).default("General"),
  precondition: z.string().max(8000).optional(),
  gherkin: z.string().max(30000).optional(),
  labels: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  steps: z.array(stepSchema).max(100).default([]),
  linkedRequirements: z
    .array(z.string().max(80))
    .max(100)
    .default([])
    .describe("Requirement keys in this project, e.g. MAIN-401."),
})
export type TestInput = z.output<typeof testSchema>

/** Pagination shared by every list operation. */
export const pageSchema = {
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
}
/** Records can be addressed by database id or by their human key (MAIN-412). */
export const refSchema = {
  id: idSchema.optional().describe("Record id. Provide this or key."),
  key: z.string().max(80).optional().describe("Record key, e.g. MAIN-412."),
}

export const testInclude = {
  steps: { orderBy: { order: "asc" as const } },
  folder: true,
  requirementLinks: { include: { issue: true } },
  revisions: {
    select: { revision: true, actor: true, createdAt: true },
    orderBy: { revision: "desc" as const },
    take: 20,
  },
  comments: { orderBy: { createdAt: "desc" as const }, take: 100 },
} satisfies Prisma.TestInclude

export function testDto(
  test: Prisma.TestGetPayload<{ include: typeof testInclude }>,
  key: string,
) {
  return {
    ...test,
    steps: test.steps.map((step) => ({
      action: step.action,
      expected: step.expected ?? undefined,
      data: step.data ?? undefined,
    })),
    description: test.description ?? undefined,
    precondition: test.precondition ?? undefined,
    gherkin: test.gherkin ?? undefined,
    status: ["TODO", "READY", "REVIEW"].includes(test.status)
      ? test.status
      : "TODO",
    project: key,
    folder: test.folder?.name || "General",
    labels: test.labels?.split(",").filter(Boolean) || [],
    linkedRequirements: test.requirementLinks.map((link) => link.issue.key),
  }
}

export async function validTestIds(
  db: Db,
  projectId: string,
  ids: string[],
  includeArchived = false,
) {
  const unique = [...new Set(ids)]
  const count = await db.test.count({
    where: {
      projectId,
      id: { in: unique },
      ...(includeArchived ? {} : { archivedAt: null }),
    },
  })
  assert(
    count === unique.length,
    400,
    "Select active tests from the current project.",
  )
  return unique
}

/** Resolve test keys (MAIN-412) to ids, failing loudly on the first unknown key. */
export async function testIdsForKeys(
  db: Db,
  projectId: string,
  keys: string[],
) {
  if (!keys.length) return []
  const unique = [...new Set(keys)]
  const tests = await db.test.findMany({
    where: { projectId, key: { in: unique } },
    select: { id: true, key: true },
  })
  const found = new Map(tests.map((test) => [test.key, test.id]))
  for (const key of unique)
    assert(found.has(key), 400, `Test ${key} is not in this project.`)
  return unique.map((key) => found.get(key)!)
}

export async function nextKey(db: Db, projectId: string) {
  const project = await db.project.update({
    where: { id: projectId },
    data: { nextIssue: { increment: 1 } },
  })
  return `${project.key}-${project.nextIssue}`
}

export async function folderId(db: Db, projectId: string, name: string) {
  return (
    (await db.folder.findFirst({ where: { projectId, name } })) ||
    (await db.folder.create({ data: { projectId, name } }))
  ).id
}

/** Create a test, or update one when `existing` carries its id and the revision the caller last saw. */
export async function saveTest(
  db: Db,
  projectId: string,
  data: TestInput,
  user: User,
  existing?: { id: string; revision: number },
) {
  const issues = await db.issue.findMany({
    where: { projectId, key: { in: data.linkedRequirements } },
  })
  assert(
    issues.length === new Set(data.linkedRequirements).size,
    400,
    "A linked requirement is outside this project.",
  )
  const payload = {
    summary: data.summary,
    description: data.description,
    type: data.type,
    priority: data.priority,
    status: data.status,
    precondition: data.precondition,
    gherkin: data.gherkin,
    labels: data.labels.join(","),
    folderId: await folderId(db, projectId, data.folder || "General"),
  }
  const children = {
    steps: { create: data.steps.map((step, order) => ({ ...step, order })) },
    requirementLinks: {
      create: issues.map((issue) => ({ issueId: issue.id })),
    },
  }
  if (!existing) {
    const created = await db.test.create({
      data: {
        ...payload,
        ...children,
        key: await nextKey(db, projectId),
        projectId,
      },
    })
    return created.id
  }
  const { id, revision } = existing
  const previous = await db.test.findFirst({
    where: { id, projectId },
    include: testInclude,
  })
  assert(previous, 404, "Test not found.")
  assert(!previous.archivedAt, 409, "Restore the test before editing it.")
  const updated = await db.test.updateMany({
    where: { id, projectId, revision },
    data: { ...payload, revision: { increment: 1 } },
  })
  assert(
    updated.count === 1,
    409,
    "This test changed since you opened it. Refresh and review the latest version before saving.",
  )
  await db.testRevision.create({
    data: {
      testId: id,
      revision: previous.revision,
      snapshot: JSON.stringify(testDto(previous, "")),
      actor: user.name,
    },
  })
  await db.testStep.deleteMany({ where: { testId: id } })
  await db.requirementLink.deleteMany({ where: { testId: id } })
  await db.test.update({ where: { id }, data: children })
  return id
}
