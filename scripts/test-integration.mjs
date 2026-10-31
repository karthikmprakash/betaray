import { mkdtemp, open, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawn } from "node:child_process"
import { createServer } from "node:net"
import { once } from "node:events"

const root = process.cwd()
const directory = await mkdtemp(join(tmpdir(), "betaray-tests-"))
const database = join(directory, "test.db")
await (await open(database, "a")).close()
const portServer = createServer()
portServer.listen(0, "127.0.0.1")
await once(portServer, "listening")
const port = portServer.address().port
await new Promise((resolve) => portServer.close(resolve))
const env = {
  ...process.env,
  DATABASE_URL: `file:${database}`,
  NEXT_DIST_DIR: ".next-qa",
  ALLOW_LOCAL_DEMO: "false",
  APP_URL: `http://127.0.0.1:${port}`,
  OPENAI_API_KEY: "",
  OPENAI_MODEL: "",
}
function run(args, extraEnv = env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: extraEnv,
      stdio: "inherit",
    })
    child.once("error", reject)
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Command exited with ${code}`)),
    )
  })
}
let server
let log = ""
try {
  await run(["node_modules/prisma/build/index.js", "migrate", "deploy"])
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--port",
      String(port),
      "--hostname",
      "127.0.0.1",
    ],
    {
      cwd: root,
      env,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    },
  )
  for (const stream of [server.stdout, server.stderr])
    stream.on("data", (chunk) => {
      log = (log + chunk.toString()).slice(-12000)
    })
  const base = `http://127.0.0.1:${port}`
  let ready = false
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null)
      throw new Error("Test server exited before becoming ready.")
    try {
      const response = await fetch(base + "/api/health", {
        signal: AbortSignal.timeout(1000),
      })
      if (response.ok) {
        ready = true
        break
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  if (!ready) throw new Error("Test server did not become ready.")
  await run(["--test", "--test-concurrency=1", "tests/platform.test.mjs"], {
    ...env,
    TEST_BASE_URL: base,
  })
} catch (error) {
  console.error(error.message)
  console.error(log)
  process.exitCode = 1
} finally {
  if (server && server.exitCode === null) {
    const exited = once(server, "exit")
    try {
      process.kill(
        process.platform === "win32" ? server.pid : -server.pid,
        "SIGTERM",
      )
    } catch {}
    await Promise.race([
      exited,
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ])
    if (server.exitCode === null) {
      try {
        process.kill(
          process.platform === "win32" ? server.pid : -server.pid,
          "SIGKILL",
        )
      } catch {}
    }
  }
  await rm(directory, { recursive: true, force: true })
}
