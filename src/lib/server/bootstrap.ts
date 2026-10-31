import { prisma } from "@/lib/db"
import { mockTestsSeed, mockIssues } from "@/lib/mockData"

// Only the explicit local-demo sign-in calls this. Never runs for a real signup.
export async function demoUser() {
  const ready = await prisma.user.findUnique({
    where: { email: "demo@betaray.local" },
    include: { memberships: true },
  })
  if (
    ready?.memberships.some(
      (member) => member.organizationId === "demo-organization",
    )
  )
    return ready
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: "demo@betaray.local" },
      create: {
        id: "demo-user",
        email: "demo@betaray.local",
        name: "Demo Administrator",
      },
      update: {},
    })
    const org = await tx.organization.upsert({
      where: { id: "demo-organization" },
      create: { id: "demo-organization", name: "Betaray Demo" },
      update: {},
    })
    await tx.organizationMember.upsert({
      where: {
        organizationId_userId: { organizationId: org.id, userId: user.id },
      },
      create: { organizationId: org.id, userId: user.id, role: "Owner" },
      update: {},
    })
    const workspace = await tx.workspace.upsert({
      where: { id: "demo-workspace" },
      create: {
        id: "demo-workspace",
        name: "Engineering",
        organizationId: org.id,
      },
      update: {},
    })
    // Adopt only legacy, unassigned local projects; preserve their IDs and records.
    await tx.project.updateMany({
      where: { workspaceId: null },
      data: { workspaceId: workspace.id },
    })
    let project = await tx.project.findFirst({
      where: { workspaceId: workspace.id, key: "BET" },
    })
    if (!project)
      project = await tx.project.create({
        data: {
          key: "BET",
          name: "Betaray Platform",
          description: "Checkout and payments",
          workspaceId: workspace.id,
        },
      })
    for (const issue of mockIssues)
      await tx.issue.upsert({
        where: { projectId_key: { projectId: project.id, key: issue.key } },
        create: { ...issue, projectId: project.id },
        update: {},
      })
    for (const [index, test] of mockTestsSeed.entries()) {
      const existing = await tx.test.findUnique({
        where: { projectId_key: { projectId: project.id, key: test.key } },
      })
      const folder = await tx.folder.upsert({
        where: { id: `demo-folder-${index < 3 ? "checkout" : "general"}` },
        create: {
          id: `demo-folder-${index < 3 ? "checkout" : "general"}`,
          name: index < 3 ? "Checkout" : "General",
          projectId: project.id,
        },
        update: {},
      })
      if (!existing)
        await tx.test.create({
          data: {
            key: test.key,
            projectId: project.id,
            summary: test.summary,
            type: test.type,
            priority: test.priority,
            folderId: folder.id,
            gherkin: "gherkin" in test ? test.gherkin : undefined,
            steps: {
              create: ("steps" in test ? test.steps || [] : []).map(
                (step, order) => ({ ...step, order }),
              ),
            },
          },
        })
    }
    const tests = await tx.test.findMany({
      where: { projectId: project.id },
      orderBy: { key: "asc" },
    })
    for (const [index, test] of tests.entries()) {
      const issue = await tx.issue.findUnique({
        where: {
          projectId_key: {
            projectId: project.id,
            key: index % 2 === 0 ? "BET-101" : "BET-102",
          },
        },
      })
      if (issue)
        await tx.requirementLink.upsert({
          where: { testId_issueId: { testId: test.id, issueId: issue.id } },
          create: { testId: test.id, issueId: issue.id },
          update: {},
        })
    }
    for (const name of ["Staging", "Production", "QA", "Dev"])
      await tx.environment.upsert({
        where: { projectId_name: { projectId: project.id, name } },
        create: { projectId: project.id, name },
        update: {},
      })
    for (const name of ["1.4.0", "1.3.9"])
      await tx.releaseVersion.upsert({
        where: { projectId_name: { projectId: project.id, name } },
        create: { projectId: project.id, name },
        update: {},
      })
    for (const [i, name] of [
      "Regression - Sprint 24",
      "Smoke - Prod",
    ].entries())
      await tx.testExecution.upsert({
        where: {
          projectId_key: { projectId: project.id, key: `BET-${301 + i}` },
        },
        create: {
          key: `BET-${301 + i}`,
          projectId: project.id,
          name,
          environment: i ? "Production" : "Staging",
          version: i ? "1.3.9" : "1.4.0",
          status: i ? "To Do" : "In Progress",
          runs: {
            create: tests
              .slice(0, i ? 3 : 5)
              .map((test, index) => ({
                testId: test.id,
                status: i
                  ? "TODO"
                  : index === 0
                    ? "PASS"
                    : index === 1
                      ? "FAIL"
                      : index === 2
                        ? "EXECUTING"
                        : "TODO",
              })),
          },
        },
        update: {},
      })
    return user
  })
}
