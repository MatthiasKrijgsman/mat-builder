# 01 — Goals & Requirements

## What we're building

A reusable, headless-first **block builder package** that powers multiple visual builders in the backoffice. Each builder instance (email builder, form builder, …) is a *configuration* of the same package: a set of block definitions plus an arrangement of the editor's UI components.

## Functional requirements

1. **Custom block definitions.** Each block defines its own rendering *and* its own configuration form. Definitions live in application code, not inside the package.
2. **Nested blocks via containers.** A block can declare one or more internal "containers" (slots) that accept child blocks. Container layout varies per block: vertical stack, horizontal row, or grid.
3. **Block library.** Blocks are registered in a library with a name, icon, and category; the palette renders from this registry.
4. **Inspector.** Selecting a block opens an inspector panel showing that block's config form. Edits update the block's props live.
5. **Drag and drop.** Blocks can be added from the palette, rearranged, and reparented by dragging — on the canvas *and* in the layers panel. Engine: Pragmatic drag and drop.
6. **Layers / navigation panel.** A collapsible tree view of the block hierarchy. Supports selection, drag-to-reorder, drag-to-reparent, expand/collapse.
7. **Composable, restylable UI.** Every editor surface (canvas, palette, inspector, layers, toolbar) is an independent component the host app arranges and styles. No baked-in fixed layout.
8. **Undo/redo** from v1.

## Non-functional requirements

- **Standalone repo, published npm package** (`@matthiaskrijgsman/mat-builder`, this repo) — same model as mat-ui, because projects across multiple companies will consume it. Development happens against the in-repo playground (`site/`); consuming projects install from npm.
- **Serializable document.** The builder edits a plain JSON document that can be persisted, versioned, and rendered outside the editor.
- **Renderer separate from editor.** Producing output (email HTML, a live form) must not require loading any editor code. Two entry points: `@matthiaskrijgsman/mat-builder` (editor) and a per-application renderer.
- **Type-safe block props.** Block definitions should carry their prop types through to render functions and config forms.

## Agreed decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | **Config forms are custom React components** per block, composed from shared field helpers (`TextField`, `SelectField`, `ColorField`, …) shipped by the package. | Maximum flexibility for bespoke form UX; the field helpers keep simple blocks cheap to write. Contrast: Puck auto-generates forms from a schema — less code but escape hatches get awkward. |
| D2 | **Separate editor render and output render** per block. The canvas renders `editRender` (plain divs + Tailwind, easy to decorate with selection/drop chrome); the export pipeline uses `render` (e.g. react-email components). | Keeps the interactive canvas free of iframe/table-layout complications. Accepted trade-off: two renders can drift; mitigate with visual-parity review and a live preview mode that shows the real output. |
| D3 | **Standalone repo + published npm package** (supersedes the earlier "internal workspace package" choice). | Projects for multiple companies need the builder — same model as mat-ui. The publish-iterate tax is mitigated by the in-repo playground (`site/`) and cheap `0.x` releases. |
| D4 | **Undo/redo in v1** — design the state layer around an immutable document + history stack from day one. Multi-select and copy/paste deferred (but the data model must not preclude them). | Retrofitting history onto mutable state is painful; snapshot history over an immutable document is nearly free. |
| D5 | **Pragmatic drag and drop** for all DnD. | Headless, framework-agnostic, small, built on native HTML5 DnD; used at scale by Atlassian (Trello, Jira, Confluence). Fits the "we control all visuals" requirement — it does behavior only, zero rendering. |
| D6 | **mat-ui (`@matthiaskrijgsman/mat-ui`) supplies the UI primitives** for editor chrome and inspector field helpers (peer dependency). | One UI kit across all our projects; the builder inherits its look, tokens, and dark mode for free. |

## First application: email builder

- Block set mirrors email layout primitives: Section → Columns → leaf blocks (Text, Heading, Button, Image, Divider, Spacer).
- Output rendering converts the document to a react-email component tree; `render()` from `react-email` produces the final HTML (and a plain-text variant).
- See [06-email-builder.md](06-email-builder.md).

## Second application (validation): form builder

Not designed in detail here, but used as a forcing function: every core API must make sense for a form builder too (fieldset/grid containers, input blocks, validation config in the inspector). If a design choice only works for email, it belongs in the email layer, not the core.
