import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { assert } from "./http"

const derive = (password: string, salt: string, options: ScryptOptions = {}) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCallback(password, salt, 64, options, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  )
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex")
export const newToken = () => randomBytes(32).toString("base64url")
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex")
  const derived = await derive(password, salt, {
    N: 32768,
    r: 8,
    p: 3,
    maxmem: 64 * 1024 * 1024,
  })
  return `scrypt$32768$8$3$${salt}$${derived.toString("hex")}`
}
export async function passwordMatches(
  password: string,
  encoded: string | null,
) {
  const normalized =
    encoded || `scrypt$32768$8$3$${"0".repeat(32)}$${"0".repeat(128)}`
  const modern = normalized.startsWith("scrypt$")
  const parts = modern ? normalized.split("$") : []
  const [salt, expected] = modern ? [parts[4], parts[5]] : normalized.split(":")
  const derived = modern
    ? await derive(password, salt, {
        N: 32768,
        r: 8,
        p: 3,
        maxmem: 64 * 1024 * 1024,
      })
    : await derive(password, salt)
  const target = Buffer.from(expected, "hex")
  return (
    target.length === derived.length &&
    timingSafeEqual(target, derived) &&
    !!encoded
  )
}
export async function createSession(userId: string) {
  const token = newToken()
  const expires = new Date(Date.now() + 7 * 86400_000)
  await prisma.session.create({
    data: { id: hashToken(token), userId, expiresAt: expires },
  })
  ;(await cookies()).set("betaray_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  })
}
export async function requireUser() {
  const token = (await cookies()).get("betaray_session")?.value
  assert(token, 401, "Sign in to access your organization.")
  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  })
  assert(
    session && session.expiresAt > new Date(),
    401,
    "Your session has expired. Sign in again.",
  )
  return session.user
}
export async function logout() {
  const store = await cookies()
  const token = store.get("betaray_session")?.value
  if (token)
    await prisma.session.deleteMany({ where: { id: hashToken(token) } })
  store.delete("betaray_session")
}
export async function throttle(key: string) {
  const id = hashToken(key)
  const now = new Date()
  const record = await prisma.authAttempt.upsert({
    where: { id },
    create: { id, count: 1, windowAt: now },
    update: { count: { increment: 1 } },
  })
  if (now.getTime() - record.windowAt.getTime() > 15 * 60_000) {
    await prisma.authAttempt.update({
      where: { id },
      data: { count: 1, windowAt: now },
    })
    return
  }
  assert(
    record.count <= 10,
    429,
    "Too many attempts. Wait 15 minutes before trying again.",
  )
}

export async function principalForProject(
  request: Request,
  projectId: string,
  write = false,
) {
  const authorization = request.headers.get("authorization")
  if (!authorization) return requireUser()
  assert(authorization.startsWith("Bearer "), 401, "Use a valid bearer token.")
  const token = await prisma.apiKey.findUnique({
    where: { token: hashToken(authorization.slice(7)) },
  })
  assert(
    token &&
      !token.revokedAt &&
      token.expiresAt &&
      token.expiresAt > new Date() &&
      token.projectId === projectId &&
      token.userId,
    401,
    "The API token is invalid, expired, revoked, or scoped to another project.",
  )
  if (write)
    assert(token.scope === "write", 403, "This API token is read-only.")
  const user = await prisma.user.findUnique({ where: { id: token.userId } })
  assert(user, 401, "The token owner is no longer available.")
  const { projectAccess } = await import("./permissions")
  await projectAccess(user.id, projectId, write)
  await prisma.apiKey.update({
    where: { id: token.id },
    data: { lastUsedAt: new Date() },
  })
  return user
}
