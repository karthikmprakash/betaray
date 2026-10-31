"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Plus, Download, Pause, Play, Square, Bug } from "lucide-react"
import { useAppData } from "@/lib/appData"
import { downloadText } from "@/lib/utils"

export default function ExploratoryPage() {
  const { explorations, mutate, canWrite, busy } = useAppData()
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ title: "", charter: "" })
  const [selectedId, setSelectedId] = useState("")
  const [note, setNote] = useState("")
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const session =
    explorations.find((item) => item.id === selectedId) || explorations[0]
  const elapsed = session
    ? session.durationSeconds +
      (session.status === "Running" && session.lastStartedAt
        ? Math.max(
            0,
            Math.floor(
              (now - new Date(session.lastStartedAt).getTime()) / 1000,
            ),
          )
        : 0)
    : 0
  const time = `${Math.floor(elapsed / 3600)
    .toString()
    .padStart(2, "0")}:${Math.floor(elapsed / 60) % 60}`
  const formatted = session
    ? `${String(Math.floor(elapsed / 3600)).padStart(2, "0")}:${String(Math.floor(elapsed / 60) % 60).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`
    : time
  async function update(status: string) {
    if (session)
      await mutate("exploration.update", {
        id: session.id,
        revision: session.revision,
        status,
      })
  }
  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Exploratory testing</h1>
          <p>
            Run a focused charter, record observations, and turn findings into
            project defects.
          </p>
        </div>
        {canWrite && (
          <button
            className="primary-action"
            onClick={() => setShowNew(!showNew)}
          >
            <Plus size={15} />
            New session
          </button>
        )}
      </div>
      {showNew && (
        <form
          className="test-create-form"
          onSubmit={async (event) => {
            event.preventDefault()
            const created = await mutate<{ id: string }>(
              "exploration.create",
              form,
            )
            if (created) {
              setSelectedId(created.id)
              setShowNew(false)
              setForm({ title: "", charter: "" })
            }
          }}
        >
          <div className="form-grid">
            <label className="full-width">
              Session title
              <input
                required
                value={form.title}
                maxLength={200}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
            </label>
            <label className="full-width">
              Charter
              <textarea
                minLength={10}
                required
                value={form.charter}
                onChange={(event) =>
                  setForm({ ...form, charter: event.target.value })
                }
                placeholder="What will you explore, and what risks will you investigate?"
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary-action" disabled={busy}>
              Start session
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={() => setShowNew(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="exploratory-layout">
        <nav className="session-navigation" aria-label="Exploratory sessions">
          {explorations.map((item) => (
            <button
              key={item.id}
              aria-pressed={item.id === session?.id}
              onClick={() => {
                setSelectedId(item.id)
                setNote("")
              }}
            >
              <strong>{item.title}</strong>
              <span>
                {item.status} · {item.createdBy}
              </span>
            </button>
          ))}
        </nav>
        <section>
          {session ? (
            <>
              <div className="section-heading">
                <div>
                  <h2>{session.title}</h2>
                  <p>{session.charter}</p>
                </div>
                <button
                  className="icon-button"
                  aria-label="Export session notes"
                  onClick={() =>
                    downloadText(
                      `exploratory-${session.id}.json`,
                      JSON.stringify(
                        { ...session, elapsedSeconds: elapsed },
                        null,
                        2,
                      ),
                      "application/json",
                    )
                  }
                >
                  <Download size={17} />
                </button>
              </div>
              <div className="session-controls">
                <span className="session-timer">{formatted}</span>
                <span className="type-label">{session.status}</span>
                {canWrite && session.status !== "Finished" && (
                  <>
                    <button
                      className="secondary-action"
                      disabled={busy}
                      onClick={() =>
                        void update(
                          session.status === "Running" ? "Paused" : "Running",
                        )
                      }
                    >
                      {session.status === "Running" ? (
                        <Pause size={15} />
                      ) : (
                        <Play size={15} />
                      )}
                      {session.status === "Running" ? "Pause" : "Resume"}
                    </button>
                    <button
                      className="secondary-action"
                      disabled={busy}
                      onClick={() => void update("Finished")}
                    >
                      <Square size={15} />
                      Finish session
                    </button>
                  </>
                )}
              </div>
              {canWrite && session.status !== "Finished" && (
                <form
                  className="test-create-form"
                  onSubmit={async (event) => {
                    event.preventDefault()
                    if (
                      await mutate("exploration.update", {
                        id: session.id,
                        revision: session.revision,
                        note,
                      })
                    )
                      setNote("")
                  }}
                >
                  <div className="form-grid">
                    <label className="full-width">
                      Observation, defect, or evidence link
                      <textarea
                        required
                        maxLength={8000}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Record what happened, reproduction steps, and an evidence URL if available."
                      />
                    </label>
                  </div>
                  <div className="form-actions">
                    <button
                      className="primary-action"
                      disabled={busy || !note.trim()}
                    >
                      Save observation
                    </button>
                  </div>
                </form>
              )}
              <div className="comment-list">
                {session.notes.map((item) => (
                  <article key={item.id}>
                    <div>
                      <time dateTime={item.createdAt}>
                        {new Date(item.createdAt).toLocaleString()}
                      </time>
                      {item.defectKey ? (
                        <Link href="/app/requirements" className="text-action">
                          Defect {item.defectKey}
                        </Link>
                      ) : (
                        canWrite &&
                        session.status !== "Finished" && (
                          <button
                            className="text-action"
                            disabled={busy}
                            onClick={() =>
                              void mutate("exploration.defect", {
                                id: session.id,
                                revision: session.revision,
                                noteId: item.id,
                              })
                            }
                          >
                            <Bug size={14} />
                            Create defect
                          </button>
                        )
                      )}
                    </div>
                    <p>{item.text}</p>
                  </article>
                ))}
                {session.notes.length === 0 && (
                  <p className="page-footnote">No observations recorded yet.</p>
                )}
              </div>
            </>
          ) : (
            <div className="tests-empty">
              <h2>No exploratory sessions yet</h2>
              <p>
                Start a session with a focused charter. Notes, pause state, and
                elapsed time are saved on the server.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
