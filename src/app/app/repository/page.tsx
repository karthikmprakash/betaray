"use client"
import Link from "next/link"
import { useState } from "react"
import { Folder, Plus } from "lucide-react"
import { useAppData } from "@/lib/appData"
import { SelectMenu } from "@/components/app/SelectMenu"
import { useToast } from "@/components/ui/toast"

export default function RepositoryPage() {
  const { folders, tests, sets, plans, mutate, canWrite, busy } = useAppData()
  const { toast, ToastEl } = useToast()
  const [active, setActive] = useState("")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [folderName, setFolderName] = useState("")
  const [newFolder, setNewFolder] = useState(false)
  const filtered = tests.filter(
    (test) =>
      (!active || test.folder === active) &&
      `${test.key} ${test.summary}`.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Repository</h1>
          <p>Organize project tests into folders and reusable collections.</p>
        </div>
        {canWrite && (
          <button
            className="primary-action"
            onClick={() => setNewFolder(!newFolder)}
          >
            <Plus size={15} />
            New folder
          </button>
        )}
      </div>
      {newFolder && (
        <form
          className="test-create-form"
          onSubmit={async (event) => {
            event.preventDefault()
            if (await mutate("folder.create", { name: folderName })) {
              setNewFolder(false)
              setActive(folderName)
              setFolderName("")
              toast("Folder created")
            }
          }}
        >
          <div className="inline-edit">
            <input
              aria-label="New folder name"
              required
              value={folderName}
              maxLength={120}
              onChange={(event) => setFolderName(event.target.value)}
            />
            <button className="primary-action" disabled={busy}>
              Create folder
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={() => setNewFolder(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="repository-layout">
        <nav className="folder-navigation" aria-label="Test folders">
          <button
            aria-pressed={!active}
            onClick={() => {
              setActive("")
              setSelected([])
            }}
          >
            <Folder size={16} />
            All tests<span>{tests.length}</span>
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              aria-pressed={active === folder.name}
              onClick={() => {
                setActive(folder.name)
                setSelected([])
              }}
            >
              <Folder size={16} />
              {folder.name}
              <span>
                {tests.filter((test) => test.folder === folder.name).length}
              </span>
            </button>
          ))}
        </nav>
        <section>
          <div className="test-toolbar">
            <div className="test-search">
              <input
                aria-label="Search repository tests"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search test name or key…"
              />
            </div>
            <span className="test-count">{filtered.length} tests</span>
          </div>
          {selected.length > 0 && (
            <div className="bulk-toolbar">
              <strong>{selected.length} selected</strong>
              <button className="text-action" onClick={() => setSelected([])}>
                Clear
              </button>
              {canWrite && (
                <>
                  <SelectMenu
                    ariaLabel="Move selected repository tests"
                    placeholder="Move to folder…"
                    value=""
                    variant="toolbar"
                    disabled={busy}
                    options={folders.map((folder) => ({
                      value: folder.name,
                      label: folder.name,
                    }))}
                    onChange={async (folder) => {
                      if (
                        folder &&
                        (await mutate("test.bulk", { ids: selected, folder }))
                      ) {
                        setSelected([])
                        toast("Tests moved")
                      }
                    }}
                  />
                  <SelectMenu
                    ariaLabel="Add tests to a collection"
                    placeholder="Add to collection…"
                    value=""
                    variant="toolbar"
                    disabled={busy}
                    options={[
                      ...sets.map((set) => ({
                        value: `set:${set.id}`,
                        label: `Set · ${set.name}`,
                      })),
                      ...plans.map((plan) => ({
                        value: `plan:${plan.id}`,
                        label: `Plan · ${plan.name}`,
                      })),
                    ]}
                    onChange={async (value) => {
                      const [kind, id] = value.split(":")
                      const collection = (kind === "set" ? sets : plans).find(
                        (item) => item.id === id,
                      )
                      if (
                        collection &&
                        (await mutate("collection.save", {
                          kind,
                          id,
                          name: collection.name,
                          testIds: [
                            ...new Set([...collection.testIds, ...selected]),
                          ],
                        }))
                      ) {
                        setSelected([])
                        toast("Tests added to collection")
                      }
                    }}
                  />
                </>
              )}
            </div>
          )}
          <div className="repository-tests">
            {filtered.map((test) => (
              <div key={test.id}>
                <input
                  type="checkbox"
                  aria-label={`Select ${test.key}`}
                  checked={selected.includes(test.id)}
                  onChange={(event) =>
                    setSelected(
                      event.target.checked
                        ? [...selected, test.id]
                        : selected.filter((id) => id !== test.id),
                    )
                  }
                />
                <span className="test-key">{test.key}</span>
                <Link className="test-title" href={`/app/tests/${test.id}`}>
                  {test.summary}
                </Link>
                <span className="type-label">{test.type}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="tests-empty">
                <h2>No tests in this view</h2>
                <p>Clear the search or create tests in the test library.</p>
                <Link className="text-action" href="/app/tests">
                  Open test library
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
      <ToastEl />
    </div>
  )
}
