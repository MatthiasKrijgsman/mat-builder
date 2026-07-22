# mat-builder — Architecture & Plan

Research and architecture design for `@matthiaskrijgsman/mat-builder`: a drag-and-drop block builder library (email builder first, form builder next), consumed by projects across multiple companies.

**Stack:** React 19 + Tailwind v4, mat-ui for UI primitives, DnD via Atlassian's Pragmatic drag and drop, email output via react-email.

## Documents

1. [Goals & requirements](01-goals-and-requirements.md) — what we're building, decisions already made
2. [Prior art](02-prior-art.md) — Puck, Craft.js, Waypoint, easy-email, Unlayer, @react-email/editor — what to copy, what to avoid
3. [Architecture](03-architecture.md) — document model, block definition API, editor state, undo/redo, repository layout
4. [Components & interactions](04-components-and-interactions.md) — canvas, inspector, palette, layers tree; selection, keyboard, user flows
5. [Drag and drop](05-drag-and-drop.md) — Pragmatic drag and drop integration: palette → canvas, reordering, reparenting, tree panel
6. [Email builder](06-email-builder.md) — the `./email` preset: block set, editor vs output rendering, export pipeline

## Key decisions

| Decision | Choice |
|---|---|
| Inspector config forms | Custom React component per block + shared field-helper components (wrapping mat-ui inputs) |
| Shared style groups | Reusable collapsible property sets (Size/Background/Border/Spacing/Effects/Layout/Typography): nested per-group props (`props.border = {…}`) + pure `toCss` converters in `src/style-props/` consumed by both renders (03 §Style props, 06) |
| Canvas rendering | Separate **editor render** (divs/Tailwind) and **output render** (react-email) per block |
| Packaging | **Standalone repo, published npm package** — same model as mat-ui; the in-repo `site/` playground (the email builder, auto-deployed to [GitHub Pages](https://matthiaskrijgsman.github.io/mat-builder/) on push to `main`) is the primary dev surface. (Supersedes the earlier internal-workspace-package choice — multiple companies' projects will consume the builder.) |
| Package shape | Single package with subpath exports: `.` (editor), `./email` (block preset), `./email/render` (server-safe renderer), `./style` |
| UI primitives | `@matthiaskrijgsman/mat-ui` (peer dependency); editor chrome themable via `--mat-builder-*` CSS tokens |
| v1 scope | Undo/redo **in** v1; multi-select and copy/paste deferred |
| DnD engine | Atlassian Pragmatic drag and drop |

Decisions agreed 2026-07-03; docs seeded from the claude-research exploration the same day. These are living documents — update them in the same change when implementation deviates.

## Open questions

- **Inline text editing on canvas** — v1 edits text via the inspector; when do we want contentEditable (or mat-ui's Lexical input) inside the Text block's edit render? (See 06.)
- **Keyboard-only block moving** — native DnD isn't keyboard-accessible; a "Move up/down/into" menu is cheap to add on top of `moveBlock`. v1 or v1.5?
- **Release automation** — versioning is manual `0.x` bumps like mat-ui for now; adopt changesets + CI publish-on-merge once release frequency makes manual bumps annoying.
- **Template features** — saved/reusable block presets ("saved sections") are a likely email-builder ask; the document model supports it (serialize a subtree), but it's unscoped.

## Build order

1. **Core** (`src/core/`): document model + commands + history, with vitest tests (no UI). The type contract in `src/core/types.ts` is already seeded.
2. **Provider + minimal UI**: store, hooks, a dumb canvas (render only, click-to-select) + inspector with 2–3 field helpers — developed against a kitchen-sink page in `site/` (since removed; the email builder is now the site's only page).
3. **DnD**: palette → canvas insert, then sibling reorder, then reparent; layers panel last (reuses everything).
4. **Email preset** (`src/email/`): root/container/text/button blocks + export pipeline + preview mode.
5. **First consumer**: publish `0.x`, pilot the email builder in the Fuga backoffice; feed API friction back into the docs.
6. Remaining blocks, polish (landing feedback, announcements, empty states), keyboard shortcuts.
