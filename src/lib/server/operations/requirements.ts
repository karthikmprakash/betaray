import { z } from "zod"
import { assert, nameSchema } from "../http"
import { projectOp } from "./core"
import { nextKey, pageSchema, priorities, refSchema } from "./shared"

const issueTypes = z.enum(["Story", "Bug", "Task"])

projectOp({
  name: "requirement.list",
  summary: "List requirements and defects, with the tests linked to each.",
  access: "read",
  input: z.object({
    type: z.enum(["Story", "Bug", "Task", "Epic"]).optional(),
    query: z.string().max(200).optional().describe("Matches summary or key."),
    ...pageSchema,
  }),
  async handler({ db, projectId }, { limit, offset, type, query }) {
    const where = {
      projectId,
      type,
      ...(query
        ? { OR: [{ summary: { contains: query } }, { key: { contains: query } }] }
        : {}),
    }
    const [total, issues] = await Promise.all([
      db.issue.count({ where }),
      db.issue.findMany({
        where,
        include: { testLinks: { include: { test: { select: { key: true } } } } },
        orderBy: { key: "asc" },
        take: limit,
        skip: offset,
      }),
    ])
    return {
      total,
      offset,
      items: issues.map(({ testLinks, ...issue }) => ({
        id: issue.id,
        key: issue.key,
        type: issue.type,
        summary: issue.summary,
        status: issue.status,
        priority: issue.priority,
        tests: testLinks.map((link) => link.test.key),
      })),
    }
  },
})

projectOp({
  name: "requirement.coverage",
  summary:
    "Report coverage per requirement: linked tests and each test's most recent run result.",
  access: "read",
  input: z.object({}),
  async handler({ db, projectId }) {
    const issues = await db.issue.findMany({
      where: { projectId, type: { not: "Bug" } },
      orderBy: { key: "asc" },
      include: {
        testLinks: {
          include: {
            test: {
              select: {
                key: true,
                archivedAt: true,
                testRuns: {
                  where: { executedAt: { not: null } },
                  orderBy: { executedAt: "desc" },
                  take: 1,
                  select: { status: true },
                },
              },
            },
          },
        },
      },
    })
    const items = issues.map((issue) => {
      const tests = issue.testLinks
        .filter((link) => !link.test.archivedAt)
        .map((link) => ({
          key: link.test.key,
          latest: link.test.testRuns[0]?.status || "NOT_RUN",
        }))
      const latest = tests.map((test) => test.latest)
      return {
        key: issue.key,
        summary: issue.summary,
        status: !tests.length
          ? "UNCOVERED"
          : latest.includes("FAIL")
            ? "FAILING"
            : latest.every((status) => status === "PASS")
              ? "PASSING"
              : "NOT_RUN",
        tests,
      }
    })
    const count = (status: string) =>
      items.filter((item) => item.status === status).length
    return {
      requirements: items.length,
      uncovered: count("UNCOVERED"),
      failing: count("FAILING"),
      passing: count("PASSING"),
      notRun: count("NOT_RUN"),
      items,
    }
  },
})

projectOp({
  name: "requirement.create",
  summary: "Create a requirement, task or defect.",
  access: "write",
  input: z.object({
    summary: nameSchema,
    type: issueTypes.default("Story"),
    priority: priorities.default("Medium"),
    description: z.string().max(20000).optional(),
  }),
  async handler({ db, projectId, audit }, data) {
    const issue = await db.issue.create({
      data: { ...data, projectId, key: await nextKey(db, projectId) },
    })
    audit.entityId = issue.id
    return issue
  },
})

projectOp({
  name: "requirement.update",
  summary: "Edit a requirement's summary, description, status, type or priority.",
  access: "write",
  input: z.object({
    ...refSchema,
    summary: nameSchema.optional(),
    description: z.string().max(20000).optional(),
    type: issueTypes.optional(),
    priority: priorities.optional(),
    status: z.enum(["To Do", "In Progress", "Done"]).optional(),
  }),
  async handler({ db, projectId, audit }, { id, key, ...changes }) {
    assert(id || key, 400, "Provide a requirement id or key.")
    const issue = await db.issue.findFirst({
      where: { projectId, ...(id ? { id } : { key }) },
      include: { jiraLinks: { select: { id: true } } },
    })
    assert(issue, 404, "Requirement not found.")
    assert(
      !issue.jiraLinks.length,
      409,
      "This requirement is synced from Jira. Edit it in Jira.",
    )
    audit.entityId = issue.id
    return db.issue.update({ where: { id: issue.id }, data: changes })
  },
})
