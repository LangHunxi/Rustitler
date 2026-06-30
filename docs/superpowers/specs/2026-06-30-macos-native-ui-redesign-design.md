# macOS Native UI Redesign Design

## Context

Rustitler is a desktop batch-processing tool for offline document title recognition and renaming. The current app already supports queue, history, and settings workflows. The supplied UI concept uses a macOS window frame, left navigation, file list, preview/import column, and detail inspector, but it leans on heavy rounded cards, decorative preview space, and low-density visual hierarchy.

The redesign should keep the existing workflows and behavioral surface while changing the layout language to feel more like a native macOS utility.

## Goal

Recompose the app into a restrained macOS-style productivity interface:

- A translucent-feeling left sidebar for product identity, navigation, and service status.
- A compact top toolbar for page title, import actions, and batch cancellation.
- A queue workspace with a file list and right inspector.
- History and settings pages that share the same sidebar and toolbar shell.
- A single system-blue accent, soft neutral surfaces, subtle borders, and minimal shadow.

## Non-Goals

- Add true document preview rendering. The app does not currently expose a preview model, so the redesign will not create a decorative preview column.
- Add new backend behavior, IPC commands, or processing states.
- Replace the existing React/Vite/Tauri stack or introduce a third-party design system.
- Rework scoring, rename, history, or settings logic.

## Information Architecture

The app shell will use three persistent regions:

- `Sidebar`: brand mark/name, Queue, History, Settings navigation, and a service status footer.
- `Toolbar`: current section title, short contextual summary, and section-specific actions.
- `Content`: the active workflow.

Queue content will be a two-column workspace:

- Left: file queue list, import drop area or empty state, and processing status.
- Right: inspector with file facts, candidate titles, duplicate warning, and pending filename editor.

History content will mirror the same master-detail structure:

- Left: compact batch list.
- Right: batch details and undo action.

Settings content will become grouped macOS-style panes:

- Scoring controls in one group.
- Keyword and regex rules in another group.
- Save/import/export/reset in a bottom action bar.

## Visual Direction

Use a native macOS utility tone rather than a marketing or dashboard tone.

- Background: cool light gray app canvas with a slightly distinct sidebar.
- Surfaces: flat white or translucent-looking panels with 1px borders.
- Radius: 10px for panels and controls; status badges may use smaller rounded rectangles.
- Accent: system blue for selected navigation, primary buttons, focus rings, and selected items.
- Typography: system UI stack, compact sizing, no display-scale headings.
- Density: high enough for repeated batch work, with stable row heights and no large hero/landing areas.

## Interaction Details

- Sidebar navigation remains button-based and keyboard reachable.
- File rows remain selectable buttons so current tests and accessibility semantics can stay close to the existing implementation.
- Import file and import folder actions appear in the toolbar and remain available in the queue empty/drop state.
- Candidate selection remains a two-step action: select a candidate, then confirm use of that title.
- Pending file confirmation keeps the stem editor and immutable extension suffix.
- Error, notice, and loading states stay inline in the relevant pane.

## Testing

Update focused UI tests before implementation:

- App shell renders a sidebar navigation and toolbar.
- Queue view exposes toolbar import actions and a two-column queue/inspector workspace.
- Empty queue still uses a composed empty state instead of a table.
- History remains master-detail and keeps compact batch IDs.
- Settings keep content separate from the bottom action bar.

Existing store, IPC, and backend tests should not need changes for this visual redesign.

## Implementation Boundaries

Expected files:

- Modify `src/App.tsx` for shell composition and toolbar/sidebar structure.
- Modify `src/App.css` for macOS-style visual language and responsive layout.
- Modify `src/App.test.tsx` for structural UI assertions.

Keep edits scoped to frontend layout, copy, and styling. Do not touch Rust scoring or backend modules for this redesign.
