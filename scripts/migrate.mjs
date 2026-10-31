import { mkdir, open } from "node:fs/promises"
import { resolve, dirname } from "node:path"
import { spawn } from "node:child_process"
const url = process.env.DATABASE_URL || "file:./dev.db"
if (url.startsWith("file:")) {
  const path = resolve("prisma", url.slice(5))
  await mkdir(dirname(path), { recursive: true })
  await (await open(path, "a")).close()
}
const child = spawn(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } },
)
child.on("error", (error) => {
  console.error(error.message)
  process.exitCode = 1
})
child.on("exit", (code) => {
  process.exitCode = code || 0
})
