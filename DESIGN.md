# Betaray workspace design

This document records the existing product's refined workspace system. The `/app` routes are an operational test management tool: finding tests, recording execution results, and checking requirement coverage should be quick and predictable.

## Visual system

- Preserve the warm neutral palette and restrained violet accent. Use the semantic variables in `src/app/globals.css`; avoid introducing page-specific color palettes.
- Use the system sans family inside the workspace for small labels, controls, and data. The public product page retains its existing typeface.
- Workspace headings: 26px / 1.3, weight 600; 24px on phones. Section headings: 16px, weight 600. Content and navigation: 15–16px. Supporting labels: 13–14px with readable contrast; never shrink operational text below 13px.
- Use a white work surface and a warm neutral navigation surface. The content area is flat; do not wrap the entire application in a floating card.
- Use 6px control radii and 8–12px section radii. Borders define data tables. Reserve shadows for overlays.
- Use 8–12px within rows, 16–20px between related groups, and 24px page gutters. Larger type must not automatically mean larger empty containers. Keep issue keys and names in separate table columns for compact, readable rows.
- Accent denotes a primary action, active navigation, or link. Green, amber, and red communicate results and are accompanied by text or icons.
- Use Lucide icons with consistent stroke weight. Do not add decorative icon tiles, generic illustration, live-status pulses, or repeated promotional panels to the workspace.

## Interaction and content

- Each task page has a clear heading, a short explanation, and one primary action when needed. Keep header-to-toolbar spacing tight. The overview puts requirement coverage beside recent executions, with aggregate run results grouped beneath executions. Compact summary values sit beside their context. Reflow according to the content container width.
- Keep navigation visible on desktop and use a native modal navigation drawer below 1024px. Highlight parent navigation on detail routes and expose `aria-current`.
- Search opens a native dialog with focus containment, Escape dismissal, and Cmd/Ctrl K access. Results come from current records; never present invented recent items.
- Create forms open inline, have persistent visible labels and field-specific guidance, retain drafts when closed, and show validation close to the form.
- Search matches the fields advertised in the placeholder. Provide a count, empty state, and a way to clear filters.
- Use semantic tables. Keep tables scrollable within a labeled, keyboard-focusable region on narrow screens; do not allow whole-page horizontal overflow.
- Honor reduced motion. Transitions communicate changes in state; do not animate page entry or move buttons on hover.
- Share workspace data through the app layout provider, loaded from authenticated server APIs. Use browser storage only for the selected project and the explicit legacy-import prompt. Organization roles define default access; project Tester/Viewer overrides refine it. Recheck permissions inside write transactions.

## Product truth

The workspace persists organizations and project records in the database. The optional local demo explicitly seeds sample records. Identify server persistence in the footer. Dashboard and reports must derive their values from those records. Do not imply a live Jira sync, historical trend, uptime feed, or external compliance verification without a corresponding source.

Coverage is the percentage of requirements with at least one linked test. Pass rate is passed runs divided by passed plus failed runs. Execution completion uses the same completed-run definition. Empty denominators display an appropriate empty value. Coverage does not imply successful execution.

A CSV export must download the current records. A control must perform its labeled task; a success toast alone is not an implementation.

## Responsive workflows

AI Studio uses a container-driven grid with `minmax(0, …)` tracks; it becomes one column below 900px of content width. Inputs, code, long issue names, and draft history must stay within that column. Draft mode and provider availability must be explicit; a template scaffold must never be labeled live AI output. Reviewers must replace placeholders and approve a draft before it becomes a ready test.

Environment creation is an inline form with visible labels, validation, a pending state, and persisted results. Archived environments retain historical execution links. Administrative changes and imports must report actual results, never a toast without a saved mutation.
