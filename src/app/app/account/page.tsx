"use client"
import { useState } from "react"
import { useAppData } from "@/lib/appData"
export default function AccountPage() {
  const { user } = useAppData()
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Your account</h1>
          <p>
            {user.name} · {user.email}
          </p>
        </div>
      </div>
      <form
        className="test-create-form account-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setError("")
          setMessage("")
          if (form.confirm !== form.newPassword) {
            setError("New passwords do not match.")
            return
          }
          setBusy(true)
          try {
            const response = await fetch("/api/auth/password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error)
            setMessage(
              "Password changed. Other browser sessions have been signed out.",
            )
            setForm({ currentPassword: "", newPassword: "", confirm: "" })
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Password could not be changed.",
            )
          } finally {
            setBusy(false)
          }
        }}
      >
        <h2>Change password</h2>
        <div className="form-grid">
          <label className="full-width">
            Current password
            <input
              type="password"
              required
              autoComplete="current-password"
              maxLength={256}
              value={form.currentPassword}
              onChange={(event) =>
                setForm({ ...form, currentPassword: event.target.value })
              }
            />
          </label>
          <label className="full-width">
            New password
            <input
              type="password"
              minLength={12}
              maxLength={256}
              autoComplete="new-password"
              required
              value={form.newPassword}
              onChange={(event) =>
                setForm({ ...form, newPassword: event.target.value })
              }
            />
            <span className="form-hint">Use at least 12 characters.</span>
          </label>
          <label className="full-width">
            Confirm new password
            <input
              type="password"
              minLength={12}
              maxLength={256}
              required
              autoComplete="new-password"
              value={form.confirm}
              onChange={(event) =>
                setForm({ ...form, confirm: event.target.value })
              }
            />
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="page-footnote" role="status">
            {message}
          </p>
        )}
        <div className="form-actions">
          <button className="primary-action" disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>
    </div>
  )
}
