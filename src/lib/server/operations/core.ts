/**
 * Operation registry.
 *
 * Every capability of the platform is declared once with `projectOp`,
 * `organizationOp` or `userOp`. The declaration carries its name, description,
 * input schema and required access, and from that single definition the
 * platform derives:
 *
 *   - the web app's `/api/platform` mutations
 *   - the `/api/operations` HTTP API and its machine-readable manifest
 *   - the MCP tools served at `/api/mcp`
 *   - the `betaray <group> <verb>` CLI commands (generated from the manifest)
 *
 * Adding a feature therefore means adding one definition in a domain file
 * under this directory. Nothing else needs to be wired.
 */
import type {
  OrganizationMember,
  Prisma,
  Project,
  User,
} from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { assert } from "../http"
import {
  organizationAccess,
  projectAccess,
  transactionWriteAccess,
} from "../permissions"

export type Principal = {
  user: User
  /** Present when the caller authenticated with a project API token. */
  token?: { id: string; projectId: string; scope: "read" | "write" }
}
export type Scope = "user" | "organization" | "project"
export type Access = "read" | "write" | "admin"
/** `PrismaClient` is assignable to this, so reads can pass the shared client. */
export type Db = Prisma.TransactionClient

type Audit = { entityId?: string; detail?: string; organizationId?: string }
type BaseContext = {
  /** A transaction for write operations, the shared client for reads. */
  db: Db
  user: User
  principal: Principal
  operation: string
  /** Handlers set these to describe what the audit entry refers to. */
  audit: Audit
}
export type UserContext = BaseContext
export type OrganizationContext = BaseContext & {
  organizationId: string
  /** The caller's own membership, for owner-only rules. */
  member: OrganizationMember
}
export type ProjectContext = BaseContext & {
  projectId: string
  project: Project
  organizationId: string
}

type Definition<S extends z.ZodType, C, P> = {
  /** `<group>.<verb>`, e.g. `test.create`. Becomes `betaray test create` and the MCP tool `test_create`. */
  name: string
  /** One sentence shown in CLI help, the manifest and MCP tool descriptions. */
  summary: string
  access: Access
  input: S
  /** Requires a signed-in person; API tokens (and therefore agents) are refused. */
  interactiveOnly?: boolean
  /** Slow work (network calls) that must not hold a database transaction open. */
  prepare?: (context: C, input: z.output<S>) => Promise<P>
  handler: (context: C, input: z.output<S>, prepared: P) => Promise<unknown>
}
export type Operation = Definition<z.ZodType, never, unknown> & { scope: Scope }

const registry = new Map<string, Operation>()
function register(scope: Scope, definition: unknown) {
  const operation = { ...(definition as Operation), scope }
  assert(
    /^[a-z]+\.[a-z][a-zA-Z]*$/.test(operation.name),
    500,
    `Operation name "${operation.name}" must look like group.verb.`,
  )
  assert(
    !registry.has(operation.name),
    500,
    `Operation "${operation.name}" is defined twice.`,
  )
  registry.set(operation.name, operation)
}
export const projectOp = <S extends z.ZodType, P = undefined>(
  definition: Definition<S, ProjectContext, P>,
) => register("project", definition)
export const organizationOp = <S extends z.ZodType, P = undefined>(
  definition: Definition<S, OrganizationContext, P>,
) => register("organization", definition)
export const userOp = <S extends z.ZodType, P = undefined>(
  definition: Definition<S, UserContext, P>,
) => register("user", definition)

export const getOperation = (name: string) => registry.get(name)

/** Whether a caller may use an operation at all, before any project lookup. */
export function availableTo(operation: Operation, principal: Principal) {
  if (!principal.token) return true
  if (operation.scope !== "project" || operation.interactiveOnly) return false
  return operation.access === "read" || principal.token.scope === "write"
}

export type OperationDescriptor = {
  name: string
  summary: string
  scope: Scope
  access: Access
  interactiveOnly: boolean
  inputSchema: Record<string, unknown>
}
export function describeOperations(principal?: Principal) {
  return [...registry.values()]
    .filter((operation) => !principal || availableTo(operation, principal))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((operation): OperationDescriptor => {
      const inputSchema = z.toJSONSchema(operation.input, {
        io: "input",
        unrepresentable: "any",
      }) as Record<string, unknown>
      delete inputSchema.$schema
      return {
        name: operation.name,
        summary: operation.summary,
        scope: operation.scope,
        access: operation.access,
        interactiveOnly: !!operation.interactiveOnly,
        inputSchema,
      }
    })
}

export type OperationRequest = {
  operation: string
  projectId?: string
  organizationId?: string
  input?: unknown
}

export async function runOperation(
  principal: Principal,
  request: OperationRequest,
) {
  const operation = registry.get(request.operation)
  assert(operation, 400, `Unknown operation "${request.operation}".`)
  const { user, token } = principal
  if (token) {
    assert(
      operation.scope === "project" && !operation.interactiveOnly,
      403,
      "API tokens cannot perform this operation. Sign in to the web app instead.",
    )
    assert(
      !request.projectId || request.projectId === token.projectId,
      403,
      "This API token is scoped to another project.",
    )
    assert(
      operation.access === "read" || token.scope === "write",
      403,
      "This API token is read-only.",
    )
  }
  const write = operation.access !== "read"
  const admin = operation.access === "admin"
  const base = {
    user,
    principal,
    operation: operation.name,
    audit: {} as Audit,
  }
  // Handlers are registered with their own context type; the scope checked
  // below guarantees the matching context is the one constructed.
  const call = operation as unknown as Definition<z.ZodType, unknown, unknown>
  const execute = async (
    context: BaseContext & Record<string, unknown>,
    input: unknown,
    prepared: unknown,
  ) => call.handler(context, input, prepared)

  if (operation.scope === "user") {
    const input = operation.input.parse(request.input ?? {})
    if (!write) return execute({ ...base, db: prisma }, input, undefined)
    return prisma.$transaction(async (tx) => {
      const context = { ...base, db: tx }
      const result = await execute(context, input, undefined)
      if (context.audit.organizationId)
        await tx.auditLog.create({
          data: {
            organizationId: context.audit.organizationId,
            userId: user.id,
            action: operation.name,
            entity: operation.name.split(".")[0],
            entityId: context.audit.entityId || context.audit.organizationId,
            detail: context.audit.detail,
          },
        })
      return result
    })
  }

  if (operation.scope === "organization") {
    const organizationId = request.organizationId
    assert(organizationId, 400, "Choose an organization.")
    const member = await organizationAccess(
      user.id,
      organizationId,
      write,
      admin,
    )
    const input = operation.input.parse(request.input ?? {})
    if (!write)
      return execute(
        { ...base, db: prisma, organizationId, member },
        input,
        undefined,
      )
    return prisma.$transaction(async (tx) => {
      // Recheck inside the transaction so a concurrent demotion cannot slip through.
      const current = await tx.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: user.id } },
      })
      assert(
        current &&
          (admin
            ? ["Owner", "Admin"].includes(current.role)
            : current.role !== "Viewer"),
        403,
        "Your organization administration access has changed.",
      )
      const context = { ...base, db: tx, organizationId, member: current }
      const result = await execute(context, input, undefined)
      await tx.auditLog.create({
        data: {
          organizationId,
          userId: user.id,
          action: operation.name,
          entity: operation.name.split(".")[0],
          entityId: context.audit.entityId || organizationId,
          detail: context.audit.detail,
        },
      })
      return result
    })
  }

  const projectId = request.projectId || token?.projectId
  assert(projectId, 400, "Choose a project.")
  const access = await projectAccess(user.id, projectId, write, admin)
  const input = operation.input.parse(request.input ?? {})
  const scoped = {
    ...base,
    projectId,
    project: access.project,
    organizationId: access.organizationId,
  }
  if (!write) return execute({ ...scoped, db: prisma }, input, undefined)
  const prepared = call.prepare
    ? await call.prepare({ ...scoped, db: prisma }, input)
    : undefined
  return prisma.$transaction(
    async (tx) => {
      // Recheck permissions: `prepare` may have taken a long time.
      await transactionWriteAccess(tx, user.id, projectId, admin)
      const context = { ...scoped, db: tx }
      const result = await execute(context, input, prepared)
      await tx.auditLog.create({
        data: {
          organizationId: access.organizationId,
          projectId,
          userId: user.id,
          action: operation.name,
          entity: operation.name.split(".")[0],
          entityId: context.audit.entityId || projectId,
          detail: [
            context.audit.detail,
            token ? `via API token ${token.id}` : undefined,
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
        },
      })
      return result
    },
    { timeout: 15000 },
  )
}
