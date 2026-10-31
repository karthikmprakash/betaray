"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

type SelectMenuProps = {
  id?: string
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  describedBy?: string
  disabled?: boolean
  className?: string
  variant?: "field" | "toolbar"
  align?: "left" | "right"
}

export function SelectMenu({
  id,
  options,
  value,
  defaultValue = "",
  onChange,
  placeholder = "Select…",
  ariaLabel,
  describedBy,
  disabled = false,
  className = "",
  variant = "field",
  align = "left",
}: SelectMenuProps) {
  const generatedId = useId()
  const controlId = id || `select-${generatedId.replace(/:/g, "")}`
  const [open, setOpen] = useState(false)
  const [internal, setInternal] = useState(defaultValue)
  const current = value !== undefined ? value : internal
  const selected = options.find((option) => option.value === current)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointer)
    const frame = window.setTimeout(() => {
      const choice =
        panel.current?.querySelector<HTMLButtonElement>(
          '[role="option"][aria-selected="true"]:not(:disabled)',
        ) ||
        panel.current?.querySelector<HTMLButtonElement>(
          '[role="option"]:not(:disabled)',
        )
      choice?.focus()
    }, 20)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      window.clearTimeout(frame)
    }
  }, [open])

  function close(refocus = true) {
    setOpen(false)
    if (refocus) trigger.current?.focus()
  }

  function choose(option: SelectOption) {
    if (option.disabled) return
    if (value === undefined) setInternal(option.value)
    onChange?.(option.value)
    close()
  }

  function onPanelKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      close()
      return
    }
    if (event.key === "Tab") {
      setOpen(false)
      return
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
    const choices = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="option"]:not(:disabled)',
      ),
    )
    if (!choices.length) return
    event.preventDefault()
    const index = choices.indexOf(document.activeElement as HTMLButtonElement)
    let next = 0
    if (event.key === "End") next = choices.length - 1
    else if (event.key === "ArrowDown")
      next = index < 0 ? 0 : (index + 1) % choices.length
    else if (event.key === "ArrowUp")
      next = index < 0 ? choices.length - 1 : (index - 1 + choices.length) % choices.length
    choices[next]?.focus()
  }

  return (
    <div
      ref={root}
      className={`select-menu ${className}`}
      data-variant={variant}
      data-align={align}
    >
      <button
        ref={trigger}
        id={controlId}
        type="button"
        className="select-menu-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${controlId}-panel`}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => setOpen((previous) => !previous)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <span className={`select-menu-value ${selected ? "" : "is-placeholder"}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`select-menu-chevron ${open ? "is-open" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          ref={panel}
          id={`${controlId}-panel`}
          className="select-menu-panel"
          role="listbox"
          aria-label={ariaLabel || placeholder}
          onKeyDown={onPanelKey}
        >
          {options.length === 0 && (
            <div className="select-menu-empty">No options available</div>
          )}
          {options.map((option) => {
            const active = option.value === current
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                disabled={option.disabled}
                className={`select-menu-option ${active ? "is-selected" : ""}`}
                onClick={() => choose(option)}
              >
                <span>{option.label}</span>
                {active && <Check size={14} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
