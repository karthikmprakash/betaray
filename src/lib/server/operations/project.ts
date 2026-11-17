import { z } from "zod"
import { executionStatus } from "@/lib/execution"
import { generateDraft } from "../drafts"
import { assert, idSchema, nameSchema } from "../http"
import { hashToken, newToken } from "../session"
import { projectOp, type ProjectContext } from "./core"
import {
  nextKey,
  pageSchema,
  runStatuses,
  saveTest,
  stepSchema,
  testSchema,
  testTypes,
} from "./shared"

projectOp({
  name: "project.get",
  summary:
    "Describe the current project and what the caller may do in it. A good first call for an agent.",
  access: "read",
  input: z.object({}),
  async handler({ db, project, projectId, principal }) {
    const [tests, executions, requirements] = await Promise.all([
      db.test.count({ where: { projectId, archivedAt: null } }),
      db.testExecution.count({ where: { projectId } }),
      db.issue.count({ where: { projectId } }),
    ])
    return {
      id: project.id,
      key: project.key,
      name: project.name,
      description: project.description,
      archived: !!project.archivedAt,
      access: principal.token ? `${principal.token.scope} token` : "session",
      counts: { tests, executions, requirements },
    }
  },
})

projectOp({
  name: "audit.list",
  summary: "Read the project's audit log, newest first.",
  access: "admin",
  input: z.object({
    action: z.string().max(80).optional().describe("e.g. test.update"),
    ...pageSchema,
  }),
  async handler({ db, projectId }, { action, limit, offset }) {
    const entries = await db.auditLog.findMany({
      where: { projectId, action },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    })
    return entries.map(({ user, ...entry }) => ({
      id: entry.id,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      detail: entry.detail,
      actor: user?.name || "System",
      createdAt: entry.createdAt,
    }))
  },
})

projectOp({
  name: "token.create",
  summary: "Mint a project API token. The secret is returned once.",
  access: "admin",
  interactiveOnly: true,
  input: z.object({
    name: nameSchema,
    scope: z.enum(["read", "write"]),
    days: z.number().int().min(1).max(90),
  }),
  async handler({ db, projectId, user, audit }, data) {
    const token = `btr_${newToken()}`
    const created = await db.apiKey.create({
      data: {
        projectId,
        userId: user.id,
        name: data.name,
        scope: data.scope,
        prefix: token.slice(0, 12),
        token: hashToken(token),
        expiresAt: new Date(Date.now() + data.days * 86400_000),
      },
    })
    audit.entityId = created.id
    return { id: created.id, token }
  },
})

projectOp({
  name: "token.revoke",
  summary: "Revoke a project API token.",
  access: "admin",
  interactiveOnly: true,
  input: z.object({ id: idSchema }),
  async handler({ db, projectId, audit }, { id }) {
    assert(
      await db.apiKey.findFirst({ where: { id, projectId } }),
      404,
      "Token not found.",
    )
    await db.apiKey.update({ where: { id }, data: { revokedAt: new Date() } })
    audit.entityId = id
    return { id }
  },
})

type Note = { id: string; text: string; createdAt: string; defectKey?: string }
const explorationChange = z.object({
  id: idSchema,
  revision: z.number().int().positive(),
  status: z.enum(["Running", "Paused", "Finished"]).optional(),
  note: z.string().trim().min(1).max(8000).optional(),
})

projectOp({
  name: "exploration.list",
  summary: "List exploratory testing sessions with their observations.",
  access: "read",
  input: z.object({}),
  async handler({ db, projectId }) {
    const sessions = await db.exploratorySession.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    })
    return sessions.map((session) => ({
      ...session,
      notes: JSON.parse(session.notes) as Note[],
    }))
  },
})

projectOp({
  name: "exploration.create",
  summary: "Start an exploratory testing session with a charter.",
  access: "write",
  input: z.object({
    title: nameSchema,
    charter: z.string().trim().min(10).max(8000),
  }),
  async handler({ db, projectId, user, audit }, data) {
    const session = await db.exploratorySession.create({
      data: {
        ...data,
        projectId,
        createdBy: user.name,
        lastStartedAt: new Date(),
      },
    })
    audit.entityId = session.id
    return session
  },
})

/** Shared by update and defect: apply notes, timer and status under optimistic locking. */
async function changeExploration(
  { db, projectId, audit }: ProjectContext,
  data: z.output<typeof explorationChange>,
  edit?: (notes: Note[], session: { title: string; charter: string }) => Promise<void>,
) {
  const session = await db.exploratorySession.findFirst({
    where: { id: data.id, projectId },
  })
  assert(session, 404, "Session not found.")
  assert(
    session.status !== "Finished",
    409,
    "This session is finished. Start a new session to continue testing.",
  )
  const notes = JSON.parse(session.notes) as Note[]
  if (data.note) {
    assert(notes.length < 200, 400, "A session can contain up to 200 notes.")
    notes.push({
      id: newToken().slice(0, 16),
      text: data.note,
      createdAt: new Date().toISOString(),
    })
  }
  await edit?.(notes, session)
  const now = new Date()
  let { durationSeconds, lastStartedAt } = session
  if (data.status && data.status !== session.status) {
    if (session.status === "Running" && session.lastStartedAt)
      durationSeconds += Math.floor(
        (now.getTime() - session.lastStartedAt.getTime()) / 1000,
      )
    lastStartedAt = data.status === "Running" ? now : null
  }
  const changed = await db.exploratorySession.updateMany({
    where: { id: session.id, revision: data.revision },
    data: {
      notes: JSON.stringify(notes),
      status: data.status,
      durationSeconds,
      lastStartedAt,
      revision: { increment: 1 },
    },
  })
  assert(
    changed.count === 1,
    409,
    "This exploratory session changed. Refresh before saving.",
  )
  audit.entityId = session.id
  return { id: session.id }
}

projectOp({
  name: "exploration.update",
  summary: "Add an observation to a session, or pause, resume or finish it.",
  access: "write",
  input: explorationChange,
  handler: (context, data) => changeExploration(context, data),
})

projectOp({
  name: "exploration.defect",
  summary: "Raise a defect from one observation in an exploratory session.",
  access: "write",
  input: explorationChange.extend({ noteId: idSchema }),
  handler: (context, data) =>
    changeExploration(context, data, async (notes, session) => {
      const note = notes.find((item) => item.id === data.noteId)
      assert(note, 400, "Select a note from this session.")
      assert(!note.defectKey, 409, "This note is already linked to a defect.")
      const issue = await context.db.issue.create({
        data: {
          projectId: context.projectId,
          key: await nextKey(context.db, context.projectId),
          type: "Bug",
          summary: note.text.slice(0, 200),
          description: `Exploratory session: ${session.title}\n${session.charter}\n\n${note.text}`,
        },
      })
      note.defectKey = issue.key
    }),
})

const draftPayload = z.object({
  summary: nameSchema,
  steps: z.array(stepSchema).max(100),
  gherkin: z.string().max(30000),
})

projectOp({
  name: "draft.list",
  summary: "List generated test drafts awaiting or past review.",
  access: "read",
  input: z.object({ pending: z.boolean().default(false), ...pageSchema }),
  async handler({ db, projectId }, { pending, limit, offset }) {
    const drafts = await db.testDraft.findMany({
      where: { projectId, ...(pending ? { approvedTestId: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    })
    return drafts.map((draft) => ({
      ...draft,
      payload: JSON.parse(draft.payload),
    }))
  },
})

projectOp({
  name: "draft.generate",
  summary:
    "Draft a test from requirement text using a template or the configured AI provider. Drafts need human approval.",
  access: "write",
  input: z.object({
    source: z
      .string()
      .trim()
      .min(20, "Add at least 20 characters of requirements.")
      .max(12000),
    type: testTypes,
    mode: z.enum(["template", "openai"]),
    requirementKey: z.string().max(80).optional(),
  }),
  async prepare({ db, projectId }, data) {
    if (data.requirementKey)
      assert(
        await db.issue.findFirst({
          where: { projectId, key: data.requirementKey },
        }),
        400,
        "Requirement is outside this project.",
      )
    return generateDraft(data)
  },
  async handler({ db, projectId, user, audit }, data, payload) {
    const draft = await db.testDraft.create({
      data: {
        projectId,
        source: data.source,
        type: data.type,
        mode: data.mode,
        requirementKey: data.requirementKey,
        payload: JSON.stringify(payload),
        createdBy: user.name,
      },
    })
    audit.entityId = draft.id
    return draft
  },
})

projectOp({
  name: "draft.approve",
  summary:
    "Approve a reviewed draft, creating a test from it. A person must do this; agents cannot.",
  access: "write",
  interactiveOnly: true,
  input: z.object({
    id: idSchema,
    payload: draftPayload,
    reviewed: z.literal(true),
  }),
  async handler({ db, projectId, user, audit }, data) {
    const draft = await db.testDraft.findFirst({
      where: { id: data.id, projectId },
    })
    assert(draft, 404, "Draft not found.")
    assert(!draft.approvedTestId, 409, "This draft has already been approved.")
    if (draft.type === "Cucumber")
      assert(
        data.payload.gherkin.trim().length >= 20 &&
          !data.payload.gherkin.includes("# Review this scaffold"),
        400,
        "Review the Gherkin scaffold and replace its placeholders before approval.",
      )
    else
      assert(
        data.payload.steps.length > 0 &&
          data.payload.steps.every(
            (step) =>
              step.action.trim() &&
              step.expected?.trim() &&
              !step.expected.startsWith("Define the expected result"),
          ),
        400,
        "Add concrete expected results for every step before approval.",
      )
    const id = await saveTest(
      db,
      projectId,
      testSchema.parse({
        ...data.payload,
        type: draft.type,
        status: "READY",
        folder: "AI Generated",
        linkedRequirements: draft.requirementKey ? [draft.requirementKey] : [],
      }),
      user,
    )
    await db.testDraft.update({
      where: { id: draft.id },
      data: {
        approvedTestId: id,
        approvedBy: user.name,
        payload: JSON.stringify(data.payload),
      },
    })
    audit.entityId = id
    return { id }
  },
})

projectOp({
  name: "legacy.import",
  summary:
    "Import tests and their past executions from a browser-storage export in one atomic request.",
  access: "admin",
  input: z.object({
    tests: z
      .array(testSchema.extend({ id: z.string().optional() }))
      .min(1)
      .max(200),
    executions: z
      .array(
        z.object({
          name: nameSchema,
          env: nameSchema.optional(),
          version: z.string().max(120).optional(),
          runs: z
            .array(
              z.object({
                testId: idSchema,
                status: runStatuses,
                comment: z.string().max(8000).optional(),
                defects: z.string().max(1000).optional(),
              }),
            )
            .max(500),
        }),
      )
      .max(200)
      .default([]),
  }),
  async handler({ db, projectId, user }, data) {
    const ids = new Map<string, string>()
    for (const [index, { id, ...test }] of data.tests.entries())
      ids.set(id || String(index), await saveTest(db, projectId, test, user))
    for (const execution of data.executions) {
      const env = execution.env || "Staging"
      if (!(await db.environment.findFirst({ where: { projectId, name: env } })))
        await db.environment.create({ data: { projectId, name: env } })
      const runs = execution.runs.map((run) => {
        const testId = ids.get(run.testId)
        assert(
          testId,
          400,
          "An execution references a test not included in this import.",
        )
        return { ...run, testId }
      })
      await db.testExecution.create({
        data: {
          projectId,
          key: await nextKey(db, projectId),
          name: execution.name,
          environment: env,
          version: execution.version,
          status: executionStatus(runs),
          runs: { create: runs },
        },
      })
    }
    return { tests: ids.size, executions: data.executions.length }
  },
})
