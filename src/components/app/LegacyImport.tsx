"use client"
import { useEffect, useState } from "react"
import { useAppData } from "@/lib/appData"
import { downloadText } from "@/lib/utils"
export function LegacyImport() {
  const { mutate, project, user, busy, canAdmin } = useAppData()
  const [legacy, setLegacy] = useState<{
    tests: unknown[]
    executions: unknown[]
  } | null>(null)
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        if (localStorage.getItem("betaray:legacy-reviewed")) return
        const raw = localStorage.getItem("betaray:v1")
        if (raw) {
          const data = JSON.parse(raw)
          if (Array.isArray(data.tests) && data.tests.length)
            setLegacy({ tests: data.tests, executions: data.executions || [] })
        }
      } catch {}
    })
  }, [])
  function dismiss() {
    setHidden(true)
    try {
      localStorage.setItem("betaray:legacy-reviewed", "true")
    } catch {}
  }
  if (!legacy || hidden || !canAdmin || user.email !== "demo@betaray.local")
    return null
  return (
    <div className="legacy-import">
      <div>
        <strong>Browser data from the earlier prototype is available.</strong>
        <p>
          {legacy.tests.length} tests and {legacy.executions.length} executions.
          Import copies into {project?.name}; existing server records stay
          intact.
        </p>
      </div>
      <div className="detail-actions">
        <button
          className="secondary-action"
          onClick={() =>
            downloadText(
              "betaray-browser-backup.json",
              JSON.stringify(legacy, null, 2),
              "application/json",
            )
          }
        >
          Download backup
        </button>
        <button
          className="primary-action"
          disabled={busy || !project}
          onClick={async () => {
            if (await mutate("legacy.import", legacy)) dismiss()
          }}
        >
          Import copies
        </button>
        <button className="text-action" onClick={dismiss}>
          Dismiss
        </button>
      </div>
    </div>
  )
}
