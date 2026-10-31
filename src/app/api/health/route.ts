import { prisma } from "@/lib/db"
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json(
      { status: "ok", service: "betaray" },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch {
    return Response.json(
      { status: "unavailable", service: "betaray" },
      { status: 503 },
    )
  }
}
