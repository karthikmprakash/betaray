import { test, before } from "node:test"
import assert from "node:assert/strict"

const base = process.env.TEST_BASE_URL || "http://localhost:3002"
const suffix = Date.now()
class Client {
  cookie = ""
  async request(path, method = "GET", body, headers = {}) {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const cookie = response.headers.get("set-cookie")
    if (cookie) this.cookie = cookie.split(";")[0]
    return { status: response.status, body: await response.json() }
  }
  async state(projectId) {
    const result = await this.request(
      "/api/platform" + (projectId ? "?projectId=" + projectId : ""),
    )
    assert.equal(result.status, 200, JSON.stringify(result.body))
    return result.body
  }
  async mutate(action, input, projectId, organizationId) {
    return this.request("/api/platform", "POST", {
      action,
      input,
      projectId,
      organizationId,
    })
  }
}
const owner = new Client(),
  other = new Client(),
  viewer = new Client(),
  tester = new Client()
let a, b, projectId, orgId, testId, executionId, environmentId
const createAccount = async (client, label) => {
  const result = await client.request("/api/auth/signup", "POST", {
    email: `${label}-${suffix}@example.test`,
    password: "test-only-long-password-2026",
    name: label,
    organization: `${label} organization`,
  })
  assert.equal(result.status, 200, JSON.stringify(result.body))
  return client.state()
}
before(async () => {
  a = await createAccount(owner, "owner")
  b = await createAccount(other, "other")
  await createAccount(viewer, "viewer")
  await createAccount(tester, "tester")
  projectId = a.projectId
  orgId = a.organizationId
})
test("authentication, CSRF and organization isolation", async () => {
  const anonymous = new Client()
  assert.equal((await anonymous.request("/api/platform")).status, 401)
  assert.equal(
    (await other.request("/api/platform?projectId=" + projectId)).status,
    403,
  )
  assert.equal(
    (await other.mutate("environment.save", { name: "stolen" }, projectId))
      .status,
    403,
  )
  assert.equal(
    (
      await owner.request(
        "/api/platform",
        "POST",
        { action: "environment.save", projectId, input: { name: "csrf" } },
        { Origin: "https://attacker.invalid" },
      )
    ).status,
    403,
  )
  const read = await owner.state()
  assert.equal(read.organizations.length, 1)
  assert(!JSON.stringify(read).includes("passwordHash"))
})
test("organization, workspace and project lifecycle", async () => {
  const workspace = await owner.mutate(
    "workspace.create",
    { name: "Quality Engineering" },
    projectId,
    orgId,
  )
  assert.equal(workspace.status, 200)
  const created = await owner.mutate(
    "project.create",
    { workspaceId: workspace.body.result.id, key: "QA", name: "Payments QA" },
    projectId,
    orgId,
  )
  assert.equal(created.status, 200)
  const id = created.body.result.id
  assert.equal((await owner.state(id)).tests.length, 0)
  assert.equal(
    (
      await owner.mutate(
        "project.create",
        { workspaceId: workspace.body.result.id, key: "QA", name: "Duplicate" },
        projectId,
        orgId,
      )
    ).status,
    409,
  )
  assert.equal(
    (
      await owner.mutate(
        "project.update",
        { id, archived: true },
        projectId,
        orgId,
      )
    ).status,
    200,
  )
  assert.equal(
    (
      await owner.mutate(
        "test.create",
        { summary: "Archived cannot write" },
        id,
      )
    ).status,
    409,
  )
  assert.equal(
    (
      await owner.mutate(
        "project.update",
        { id, archived: false },
        projectId,
        orgId,
      )
    ).status,
    200,
  )
  assert.equal(
    (
      await owner.mutate(
        "workspace.update",
        { id: workspace.body.result.id, name: "QA Platform" },
        projectId,
        orgId,
      )
    ).status,
    200,
  )
})
test("environment create, validation and version management", async () => {
  const created = await owner.mutate(
    "environment.save",
    {
      name: "Staging",
      baseUrl: "https://staging.example.test",
      region: "eu-west-1",
      description: "QA",
    },
    projectId,
  )
  assert.equal(created.status, 200)
  environmentId = created.body.result.id
  assert.equal(
    (await owner.mutate("environment.save", { name: "Staging" }, projectId))
      .status,
    409,
  )
  assert.equal(
    (
      await owner.mutate(
        "environment.save",
        { name: "Unsafe", baseUrl: "javascript:alert(1)" },
        projectId,
      )
    ).status,
    400,
  )
  assert.equal(
    (
      await owner.mutate(
        "version.save",
        { name: "2.0.0", status: "Planned" },
        projectId,
      )
    ).status,
    200,
  )
  const state = await owner.state(projectId)
  assert.equal(
    state.environments.find((env) => env.id === environmentId).region,
    "eu-west-1",
  )
})
test("test creation, editing, revisions, comments and stale-write protection", async () => {
  const requirement = await owner.mutate(
    "requirement.create",
    { summary: "Payment validates address", type: "Story" },
    projectId,
  )
  assert.equal(requirement.status, 200)
  const created = await owner.mutate(
    "test.create",
    {
      summary: "Validate delivery address",
      type: "Manual",
      steps: [{ action: "Enter valid address", expected: "Address accepted" }],
      linkedRequirements: [requirement.body.result.key],
    },
    projectId,
  )
  assert.equal(created.status, 200)
  testId = created.body.result.id
  let state = await owner.state(projectId)
  const test = state.tests.find((test) => test.id === testId)
  assert.equal(test.steps[0].expected, "Address accepted")
  assert.equal(
    (
      await owner.mutate(
        "test.update",
        { ...test, summary: "Updated address test", revision: 1 },
        projectId,
      )
    ).status,
    200,
  )
  assert.equal(
    (
      await owner.mutate(
        "test.update",
        { ...test, summary: "Stale overwrite", revision: 1 },
        projectId,
      )
    ).status,
    409,
  )
  assert.equal(
    (
      await owner.mutate(
        "test.comment",
        { id: testId, body: "Review completed" },
        projectId,
      )
    ).status,
    200,
  )
  state = await owner.state(projectId)
  const updated = state.tests.find((test) => test.id === testId)
  assert.equal(updated.summary, "Updated address test")
  assert.equal(updated.revisions.length, 1)
  assert.equal(updated.comments[0].body, "Review completed")
  assert.equal(
    (
      await other.mutate(
        "test.comment",
        { id: testId, body: "cross project" },
        b.projectId,
      )
    ).status,
    404,
  )
})
test("execution results, metadata, revision protection and atomic imports", async () => {
  const invalid = await owner.mutate(
    "execution.create",
    { name: "Bad run", testIds: [testId, "foreign"], env: "Staging" },
    projectId,
  )
  assert.equal(invalid.status, 400)
  const created = await owner.mutate(
    "execution.create",
    {
      name: "Address regression",
      testIds: [testId],
      env: "Staging",
      version: "2.0.0",
    },
    projectId,
  )
  assert.equal(created.status, 200)
  executionId = created.body.result.id
  assert.equal(
    (
      await owner.mutate(
        "execution.update",
        {
          id: executionId,
          revision: 1,
          testId,
          status: "FAIL",
          comment: "Wrong result",
        },
        projectId,
      )
    ).status,
    200,
  )
  assert.equal(
    (
      await owner.mutate(
        "execution.update",
        { id: executionId, revision: 1, notes: "stale" },
        projectId,
      )
    ).status,
    409,
  )
  let state = await owner.state(projectId)
  let execution = state.executions.find((item) => item.id === executionId)
  const test = state.tests.find((item) => item.id === testId)
  assert.equal(execution.env, "Staging")
  assert.equal(execution.version, "2.0.0")
  assert.equal(execution.runs[0].status, "FAIL")
  const invalidImport = await owner.request(
    "/api/v2/import/execution",
    "POST",
    {
      projectId,
      testExecutionKey: execution.key,
      tests: [
        { testKey: test.key, status: "PASS" },
        { testKey: "OTHER-999", status: "PASS" },
      ],
    },
  )
  assert.equal(invalidImport.status, 400)
  execution = (await owner.state(projectId)).executions.find(
    (item) => item.id === executionId,
  )
  assert.equal(execution.runs[0].status, "FAIL")
  const imported = await owner.request("/api/v2/import/execution", "POST", {
    projectId,
    testExecutionKey: execution.key,
    tests: [{ testKey: test.key, status: "PASS" }],
  })
  assert.equal(imported.status, 200)
  execution = (await owner.state(projectId)).executions.find(
    (item) => item.id === executionId,
  )
  assert.equal(execution.runs[0].status, "PASS")
  assert.equal(execution.status, "Done")
})
test("persistent test sets, plans and linked executions", async () => {
  const set = await owner.mutate(
    "collection.save",
    { kind: "set", name: "Smoke suite", testIds: [testId] },
    projectId,
  )
  assert.equal(set.status, 200)
  const plan = await owner.mutate(
    "collection.save",
    { kind: "plan", name: "Release 2", testIds: [testId] },
    projectId,
  )
  assert.equal(plan.status, 200)
  const execution = await owner.mutate(
    "execution.create",
    {
      name: "Planned run",
      testIds: [testId],
      env: "Staging",
      planId: plan.body.result.id,
    },
    projectId,
  )
  assert.equal(execution.status, 200)
  const state = await owner.state(projectId)
  assert.equal(state.sets[0].testIds[0], testId)
  assert.equal(state.plans[0].executionIds[0], execution.body.result.id)
})
test("drafts use supplied requirements and approval is deliberate and single-use", async () => {
  const draft = await owner.mutate(
    "draft.generate",
    {
      source:
        "A support agent can export a report.\nThe exported report contains only the selected date range.",
      type: "Manual",
      mode: "template",
    },
    projectId,
  )
  assert.equal(draft.status, 200)
  const payload = JSON.parse(draft.body.result.payload)
  assert(payload.summary.includes("support agent"))
  assert(!payload.summary.includes("Apple Pay"))
  assert.equal(
    (
      await owner.mutate(
        "draft.approve",
        { id: draft.body.result.id, payload, reviewed: false },
        projectId,
      )
    ).status,
    400,
  )
  assert.equal(
    (
      await owner.mutate(
        "draft.approve",
        { id: draft.body.result.id, payload, reviewed: true },
        projectId,
      )
    ).status,
    400,
  )
  const reviewedPayload = {
    ...payload,
    steps: payload.steps.map((step) => ({
      ...step,
      expected:
        "The export includes only records within the selected date range.",
    })),
  }
  assert.equal(
    (
      await owner.mutate(
        "draft.approve",
        { id: draft.body.result.id, payload: reviewedPayload, reviewed: true },
        projectId,
      )
    ).status,
    200,
  )
  assert.equal(
    (
      await owner.mutate(
        "draft.approve",
        { id: draft.body.result.id, payload, reviewed: true },
        projectId,
      )
    ).status,
    409,
  )
  const state = await owner.state(projectId)
  assert(
    state.drafts.find((item) => item.id === draft.body.result.id)
      .approvedTestId,
  )
})
test("invitations enforce email matching and roles on the server", async () => {
  const invite = await owner.mutate(
    "invitation.create",
    { email: `viewer-${suffix}@example.test`, role: "Viewer" },
    projectId,
    orgId,
  )
  assert.equal(invite.status, 200)
  assert.equal(
    (
      await other.request("/api/auth/accept-invitation", "POST", {
        token: invite.body.result.token,
      })
    ).status,
    403,
  )
  assert.equal(
    (
      await viewer.request("/api/auth/accept-invitation", "POST", {
        token: invite.body.result.token,
      })
    ).status,
    200,
  )
  assert.equal(
    (
      await viewer.request("/api/auth/accept-invitation", "POST", {
        token: invite.body.result.token,
      })
    ).status,
    400,
  )
  assert((await viewer.state(projectId)).tests.length > 0)
  assert.equal(
    (
      await viewer.mutate(
        "test.create",
        { summary: "Viewer cannot write" },
        projectId,
      )
    ).status,
    403,
  )
  const testerInvite = await owner.mutate(
    "invitation.create",
    { email: `tester-${suffix}@example.test`, role: "Tester" },
    projectId,
    orgId,
  )
  assert.equal(
    (
      await tester.request("/api/auth/accept-invitation", "POST", {
        token: testerInvite.body.result.token,
      })
    ).status,
    200,
  )
  assert.equal(
    (
      await tester.mutate(
        "test.create",
        { summary: "Tester-created test" },
        projectId,
      )
    ).status,
    200,
  )
  assert.equal(
    (
      await tester.mutate(
        "environment.save",
        { name: "Tester cannot administer" },
        projectId,
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await tester.mutate(
        "token.create",
        { name: "Escalation", scope: "write", days: 7 },
        projectId,
      )
    ).status,
    403,
  )
})
test("tokens are hashed, project-scoped, permission-scoped and revocable", async () => {
  const readToken = await owner.mutate(
    "token.create",
    { name: "Read CI", scope: "read", days: 7 },
    projectId,
  )
  assert.equal(readToken.status, 200)
  const anonymous = new Client()
  const headers = { Authorization: "Bearer " + readToken.body.result.token }
  assert.equal(
    (
      await anonymous.request(
        "/api/tests?projectId=" + projectId,
        "GET",
        undefined,
        headers,
      )
    ).status,
    200,
  )
  assert.equal(
    (
      await anonymous.request(
        "/api/tests?projectId=" + b.projectId,
        "GET",
        undefined,
        headers,
      )
    ).status,
    401,
  )
  assert.equal(
    (
      await anonymous.request(
        "/api/tests",
        "POST",
        { projectId, summary: "Denied" },
        headers,
      )
    ).status,
    403,
  )
  const token = await owner.mutate(
    "token.create",
    { name: "Write CI", scope: "write", days: 7 },
    projectId,
  )
  const writable = { Authorization: "Bearer " + token.body.result.token }
  assert.equal(
    (
      await anonymous.request(
        "/api/tests",
        "POST",
        { projectId, summary: "Created by CI" },
        writable,
      )
    ).status,
    201,
  )
  const state = await owner.state(projectId)
  assert(!JSON.stringify(state).includes(token.body.result.token))
  assert(!JSON.stringify(state).includes("tokenHash"))
  assert.equal(
    (
      await owner.mutate(
        "token.revoke",
        { id: token.body.result.id },
        projectId,
      )
    ).status,
    200,
  )
  assert.equal(
    (
      await anonymous.request(
        "/api/tests?projectId=" + projectId,
        "GET",
        undefined,
        writable,
      )
    ).status,
    401,
  )
})
test("archive, restore and folder operations preserve test history", async () => {
  assert.equal(
    (await owner.mutate("folder.create", { name: "Regression" }, projectId))
      .status,
    200,
  )
  assert.equal(
    (
      await owner.mutate(
        "test.bulk",
        { ids: [testId], folder: "Regression", priority: "High" },
        projectId,
      )
    ).status,
    200,
  )
  assert.equal(
    (
      await owner.mutate(
        "test.bulk",
        { ids: [testId], archived: true },
        projectId,
      )
    ).status,
    200,
  )
  let state = await owner.state(projectId)
  assert(state.tests.find((test) => test.id === testId).archivedAt)
  assert.equal(
    (
      await owner.mutate(
        "execution.create",
        { name: "Cannot run archived test", testIds: [testId], env: "Staging" },
        projectId,
      )
    ).status,
    400,
  )
  assert.equal(
    (
      await owner.mutate(
        "test.bulk",
        { ids: [testId], archived: false },
        projectId,
      )
    ).status,
    200,
  )
  state = await owner.state(projectId)
  assert.equal(
    state.tests.find((test) => test.id === testId).folder,
    "Regression",
  )
  assert(state.tests.find((test) => test.id === testId).revisions.length >= 4)
})
test("exploratory sessions persist pause state, observations and defects", async () => {
  const created = await owner.mutate(
    "exploration.create",
    {
      title: "Explore login",
      charter: "Investigate permission boundaries when sessions expire",
    },
    projectId,
  )
  assert.equal(created.status, 200)
  const id = created.body.result.id
  assert.equal(
    (
      await owner.mutate(
        "exploration.update",
        {
          id,
          revision: 1,
          note: "Expired sessions retain an inaccessible form",
        },
        projectId,
      )
    ).status,
    200,
  )
  let session = (await owner.state(projectId)).explorations.find(
    (item) => item.id === id,
  )
  assert.equal(
    (
      await owner.mutate(
        "exploration.defect",
        { id, revision: session.revision, noteId: session.notes[0].id },
        projectId,
      )
    ).status,
    200,
  )
  session = (await owner.state(projectId)).explorations.find(
    (item) => item.id === id,
  )
  assert(session.notes[0].defectKey)
  assert.equal(
    (
      await owner.mutate(
        "exploration.update",
        { id, revision: session.revision, status: "Paused" },
        projectId,
      )
    ).status,
    200,
  )
  session = (await owner.state(projectId)).explorations.find(
    (item) => item.id === id,
  )
  assert.equal(session.status, "Paused")
  assert.equal(session.lastStartedAt, null)
  assert.equal(
    (
      await owner.mutate(
        "exploration.update",
        { id, revision: session.revision, status: "Finished" },
        projectId,
      )
    ).status,
    200,
  )
  session = (await owner.state(projectId)).explorations.find(
    (item) => item.id === id,
  )
  assert.equal(
    (
      await owner.mutate(
        "exploration.update",
        { id, revision: session.revision, note: "Too late" },
        projectId,
      )
    ).status,
    409,
  )
})
test("JSON import is validated and scoped; audit contains genuine changes", async () => {
  const before = (await owner.state(projectId)).tests.length
  assert.equal(
    (
      await owner.mutate(
        "test.import",
        {
          tests: [
            {
              summary: "Imported A",
              steps: [{ action: "Open page", expected: "Page loads" }],
            },
            { summary: "Imported B", type: "Generic" },
          ],
        },
        projectId,
      )
    ).status,
    200,
  )
  assert.equal((await owner.state(projectId)).tests.length, before + 2)
  assert.equal(
    (
      await owner.mutate(
        "test.import",
        { tests: [{ summary: "Should roll back" }, { summary: "" }] },
        projectId,
      )
    ).status,
    400,
  )
  assert.equal((await owner.state(projectId)).tests.length, before + 2)
  const state = await owner.state(projectId)
  assert(state.audit.some((item) => item.action === "environment.save"))
  assert(state.audit.some((item) => item.action === "draft.approve"))
  assert(state.audit.some((item) => item.action === "test.update"))
})

test("password changes rotate sessions and old credentials stop working", async () => {
  const second = new Client()
  const email = `owner-${suffix}@example.test`
  assert.equal(
    (
      await second.request("/api/auth/login", "POST", {
        email,
        password: "test-only-long-password-2026",
      })
    ).status,
    200,
  )
  assert.equal(
    (
      await owner.request("/api/auth/password", "POST", {
        currentPassword: "wrong-password-123",
        newPassword: "new-test-only-password-2026",
      })
    ).status,
    401,
  )
  assert.equal(
    (
      await owner.request("/api/auth/password", "POST", {
        currentPassword: "test-only-long-password-2026",
        newPassword: "new-test-only-password-2026",
      })
    ).status,
    200,
  )
  assert.equal((await second.request("/api/platform")).status, 401)
  const oldLogin = new Client()
  assert.equal(
    (
      await oldLogin.request("/api/auth/login", "POST", {
        email,
        password: "test-only-long-password-2026",
      })
    ).status,
    401,
  )
  const newLogin = new Client()
  assert.equal(
    (
      await newLogin.request("/api/auth/login", "POST", {
        email,
        password: "new-test-only-password-2026",
      })
    ).status,
    200,
  )
  assert.equal((await owner.request("/api/platform")).status, 200)
})

test("project role overrides can grant and restrict access without changing organization roles", async () => {
  const state = await owner.state(projectId)
  const member = state.members.find(
    (item) => item.user.email === `viewer-${suffix}@example.test`,
  )
  assert(member)
  assert.equal(
    (
      await owner.mutate(
        "member.project",
        { userId: member.userId, projectId, role: "Tester" },
        projectId,
        orgId,
      )
    ).status,
    200,
  )
  assert.equal((await viewer.state(projectId)).role, "Tester")
  assert.equal(
    (
      await viewer.mutate(
        "test.create",
        { summary: "Project-authorized test" },
        projectId,
      )
    ).status,
    200,
  )
  assert.equal(
    (
      await viewer.mutate(
        "token.create",
        { name: "still not admin", scope: "write", days: 7 },
        projectId,
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await owner.mutate(
        "member.project",
        { userId: member.userId, projectId, role: "Viewer" },
        projectId,
        orgId,
      )
    ).status,
    200,
  )
  assert.equal(
    (
      await viewer.mutate(
        "test.create",
        { summary: "Now read-only" },
        projectId,
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await owner.mutate(
        "member.project",
        { userId: state.user.id, projectId, role: "Viewer" },
        projectId,
        orgId,
      )
    ).status,
    400,
  )
})
test("test revisions can be inspected and restored as a new revision", async () => {
  const current = (await owner.state(projectId)).tests.find(
    (test) => test.id === testId,
  )
  const previous = await owner.request(
    `/api/tests/${testId}/revisions/1?projectId=${projectId}`,
  )
  assert.equal(previous.status, 200)
  assert.equal(previous.body.snapshot.summary, "Validate delivery address")
  assert.equal(
    (
      await other.request(
        `/api/tests/${testId}/revisions/1?projectId=${projectId}`,
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await owner.mutate(
        "test.restore",
        { id: testId, sourceRevision: 1, revision: current.revision },
        projectId,
      )
    ).status,
    200,
  )
  const restored = (await owner.state(projectId)).tests.find(
    (test) => test.id === testId,
  )
  assert.equal(restored.summary, "Validate delivery address")
  assert.equal(restored.revision, current.revision + 1)
})
test("legacy browser import creates copies and preserves execution links atomically", async () => {
  const source = {
    tests: [
      {
        id: "local-test",
        summary: "Legacy browser test",
        steps: [{ action: "Legacy action", expected: "Legacy result" }],
      },
    ],
    executions: [
      {
        name: "Legacy execution",
        env: "Local QA",
        runs: [
          {
            testId: "local-test",
            status: "FAIL",
            comment: "Legacy observation",
          },
        ],
      },
    ],
  }
  const imported = await owner.mutate("legacy.import", source, projectId)
  assert.equal(imported.status, 200)
  assert.equal(imported.body.result.tests, 1)
  const state = await owner.state(projectId)
  const legacy = state.tests.find(
    (test) => test.summary === "Legacy browser test",
  )
  const run = state.executions.find(
    (execution) => execution.name === "Legacy execution",
  )
  assert.equal(run.runs[0].testId, legacy.id)
  assert.equal(run.runs[0].status, "FAIL")
  const count = state.tests.length
  assert.equal(
    (
      await owner.mutate(
        "legacy.import",
        {
          ...source,
          executions: [
            {
              ...source.executions[0],
              runs: [{ testId: "missing", status: "PASS" }],
            },
          ],
        },
        projectId,
      )
    ).status,
    400,
  )
  assert.equal((await owner.state(projectId)).tests.length, count)
})

test("a new invited member can sign up directly into the organization", async () => {
  const email = `invited-new-${suffix}@example.test`
  const invitation = await owner.mutate(
    "invitation.create",
    { email, role: "Tester" },
    projectId,
    orgId,
  )
  assert.equal(invitation.status, 200)
  const joined = new Client()
  const signup = await joined.request("/api/auth/signup", "POST", {
    email,
    name: "Invited tester",
    password: "invited-only-password-2026",
    invitationToken: invitation.body.result.token,
  })
  assert.equal(signup.status, 200)
  assert.equal(signup.body.joinedInvitation, true)
  assert.equal(signup.body.projectId, projectId)
  const state = await joined.state(projectId)
  assert.equal(state.organizations.length, 1)
  assert.equal(state.organizationId, orgId)
  assert.equal(state.role, "Tester")
})
