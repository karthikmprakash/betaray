"use client"
import "../app/workspace.css"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
export default function InvitationPage() {
  const router = useRouter()
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState(false)
  const [signedOut, setSignedOut] = useState(false)
  return (
    <main className="auth-screen app-shell">
      <div className="auth-panel">
        <h1>Join an organization</h1>
        <p>
          Accept this invitation using the account with the invited email
          address.
        </p>
        <button
          className="primary-action"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              const token = new URL(window.location.href).searchParams.get(
                "token",
              )
              const response = await fetch("/api/auth/accept-invitation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
              })
              const body = await response.json()
              if (response.status === 401) setSignedOut(true)
              if (!response.ok) throw new Error(body.error)
              if (body.projectId)
                localStorage.setItem("betaray:selected-project", body.projectId)
              router.replace("/app")
              router.refresh()
            } catch (error) {
              setStatus(
                error instanceof Error
                  ? error.message
                  : "Invitation could not be accepted.",
              )
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? "Accepting…" : "Accept invitation"}
        </button>
        {status && (
          <p role="status" className="form-error">
            {status}
          </p>
        )}
        {signedOut && (
          <Link
            className="text-action"
            href={`/login?returnTo=${typeof window !== "undefined" ? encodeURIComponent(window.location.pathname + window.location.search) : ""}`}
          >
            Sign in to accept
          </Link>
        )}
      </div>
    </main>
  )
}
