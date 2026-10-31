"use client"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function SignIn({
  allowDemo,
  invitation = false,
}: {
  allowDemo: boolean
  invitation?: boolean
}) {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    organization: "",
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function submit(action: string) {
    setBusy(true)
    setError("")
    try {
      const returnTo = new URL(window.location.href).searchParams.get(
        "returnTo",
      )
      const invitationToken = returnTo?.startsWith("/invite?")
        ? new URL(returnTo, window.location.origin).searchParams.get("token")
        : null
      const response = await fetch(`/api/auth/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          invitationToken: invitationToken || undefined,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      if (body.projectId)
        localStorage.setItem("betaray:selected-project", body.projectId)
      router.replace(
        body.joinedInvitation
          ? "/app"
          : returnTo?.startsWith("/invite?")
            ? returnTo
            : "/app",
      )
      router.refresh()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Sign-in failed. Try again.",
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="auth-screen app-shell">
      <div className="auth-panel">
        <Link href="/" className="brand-link" aria-label="Betaray home">
          <img
            src="/brand/betaray/betaray-mark-mono.svg"
            alt=""
            width={36}
            height={36}
            className="brand-mark-image"
          />
          <span className="brand-name">Betaray</span>
        </Link>
        <h1>
          {mode === "login"
            ? "Sign in to your organization"
            : invitation
              ? "Create your account"
              : "Create an organization"}
        </h1>
        <p>One place for your workspaces, projects, and tests.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit(mode)
          }}
          className="form-grid"
        >
          {mode === "signup" && (
            <>
              <label className="full-width">
                Your name
                <input
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </label>
              {!invitation && (
                <label className="full-width">
                  Organization name
                  <input
                    required
                    value={form.organization}
                    onChange={(event) =>
                      setForm({ ...form, organization: event.target.value })
                    }
                  />
                </label>
              )}
            </>
          )}
          <label className="full-width">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
          </label>
          <label className="full-width">
            Password
            <input
              type="password"
              minLength={12}
              maxLength={256}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
            />
            <span className="form-hint">At least 12 characters.</span>
          </label>
          {error && (
            <p className="form-error full-width" role="alert">
              {error}
            </p>
          )}
          <button className="primary-action full-width" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : invitation
                  ? "Create account & join"
                  : "Create organization"}
          </button>
        </form>
        <button
          className="text-action auth-toggle"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login")
            setError("")
          }}
        >
          {mode === "login"
            ? invitation
              ? "Create an account to join"
              : "Create a new organization"
            : "Already have an account? Sign in"}
        </button>
        {allowDemo && (
          <div className="auth-demo">
            <p>Explore with sample data on this local development server.</p>
            <button
              className="secondary-action"
              disabled={busy}
              onClick={() => void submit("demo")}
            >
              Open local demo
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
