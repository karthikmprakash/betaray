import { Prisma } from "@prisma/client"
import { z } from "zod"

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}
export function assert(
  condition: unknown,
  status: number,
  message: string,
): asserts condition {
  if (!condition) throw new HttpError(status, message)
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  const expected = process.env.APP_URL
    ? new URL(process.env.APP_URL).origin
    : new URL(request.url).origin
  assert(
    !origin || origin === expected,
    403,
    "This request is not from this application.",
  )
  assert(
    request.headers.get("sec-fetch-site") !== "cross-site",
    403,
    "Cross-site requests are not allowed.",
  )
}
export async function jsonBody(request: Request) {
  assert(
    Number(request.headers.get("content-length") || 0) <= 512_000,
    413,
    "Request is too large.",
  )
  const text = await request.text()
  assert(text.length <= 512_000, 413, "Request is too large.")
  try {
    return JSON.parse(text)
  } catch {
    throw new HttpError(400, "Send a valid JSON request.")
  }
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status })
  if (error instanceof z.ZodError)
    return Response.json(
      { error: error.issues[0]?.message || "Check the form fields." },
      { status: 400 },
    )
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    return Response.json(
      { error: "That key, name, or email is already in use in this scope." },
      { status: 409 },
    )
  console.error("Platform request failed", error)
  return Response.json(
    { error: "The change could not be saved. Try again." },
    { status: 500 },
  )
}
export const nameSchema = z.string().trim().min(1, "Enter a name.").max(200)
export const idSchema = z.string().min(1).max(150)
