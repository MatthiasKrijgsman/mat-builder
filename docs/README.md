# mat-builder — Architecture & Plan

Research and architecture design for `@matthiaskrijgsman/mat-builder`: a drag-and-drop block builder library (email builder first, form builder next), consumed by projects across multiple companies.

**Stack:** React 19 + Tailwind v4, mat-ui for UI primitives, DnD via Atlassian's Pragmatic drag and drop, email output via react-email.

## Documents

1. [Goals & requirements](01-goals-and-requirements.md) — what we're building, decisions already made
2. [Prior art](02-prior-art.md) — Puck, Craft.js, Waypoint, easy-email, Unlayer, @react-email/editor — what to copy, what to avoid
3. [Architecture](03-architecture.md) — document model, block definition API, editor state, undo/redo, repository layout
4. [Components & interactions](04-components-and-interactions.md) — canvas, inspector, palette, layers tree; selection, keyboard, user flows
5. [Drag and drop](05-drag-and-drop.md) — Pragmatic drag and drop integration: palette → canvas, reordering, reparenting, tree panel
6. [Email builder](06-email-builder.md) — the `./email` preset: block set, editor vs output rendering, export pipeline, merge tags & conditional visibility
7. [Production readiness](07-production-readiness.md) — what's left before external consumers install it: publishing, packaging, the control seams, output QA
8. [Composed blocks](08-composed-blocks.md) — custom blocks defined as trees of preset blocks (`compose`), inline bindings, patterns

### Guides (written for consumers, not for us)

- [Getting started](guides/getting-started.md) — install, the stylesheet, first builder, documents, saving, rendering to email, personalization
- [Custom blocks — a cookbook](guides/custom-blocks.md) — patterns, composed blocks and primitives end to end, the field/style-group/style-props toolkit, extending preset blocks, troubleshooting

## Key decisions

| Decision | Choice |
|---|---|
| Inspector config forms | Custom React component per block + shared field-helper components (wrapping mat-ui inputs) |
| Shared style groups | Reusable collapsible property sets (Size/Background/Border/Spacing/Effects/Layout/Typography): nested per-group props (`props.border = {…}`) + pure `toCss` converters in `src/style-props/` consumed by both renders (03 §Style props, 06) |
| Canvas rendering | Separate **editor render** (divs/Tailwind) and **output render** (react-email) per block |
| Packaging | **Standalone repo, published npm package** — same model as mat-ui; the in-repo `site/` playground (the email builder, auto-deployed to [GitHub Pages](https://matthiaskrijgsman.github.io/mat-builder/) on push to `main`) is the primary dev surface. (Supersedes the earlier internal-workspace-package choice — multiple companies' projects will consume the builder.) |
| Package shape | Single package with subpath exports: `.` (editor), `./email` (block preset), `./email/render` (server-safe renderer), `./style` |
| Consumer entry point | Two layers: `<BuilderShell>` (`.`) is the assembled editor — provider, docked layout, panels, saving; `<EmailBuilder>` (`./email`) is that plus the preset, preview mode and the Edit/Preview toggle. Every part stays individually exported, so custom layouts keep composing `<BuilderProvider>` (04 §Shell) |
| UI primitives | `@matthiaskrijgsman/mat-ui` (peer dependency); editor chrome themable via `--mat-builder-*` CSS tokens |
| v1 scope | Undo/redo **in** v1; multi-select and copy/paste deferred |
| Conditional blocks | Rules live on `BlockNode.visibility` (a node field, so every block has it); resolved **at render time** — `renderEmail(doc, { values })` omits blocks whose rules fail. Emitting ESP template conditionals (`{{#if}}`/Liquid) is deliberately not built; it needs a consumer-supplied syntax adapter (06 §Conditional visibility) |
| DnD engine | Atlassian Pragmatic drag and drop |

Decisions agreed 2026-07-03; docs seeded from the claude-research exploration the same day. These are living documents — update them in the same change when implementation deviates.

## Open questions

- **Inline text editing on canvas** — v1 edits text via the inspector; when do we want contentEditable (or mat-ui's Lexical input) inside the Text block's edit render? (See 06.)
- **Keyboard-only block moving** — native DnD isn't keyboard-accessible; a "Move up/down/into" menu is cheap to add on top of `moveBlock`. v1 or v1.5?
- **Release automation** — versioning is manual `0.x` bumps like mat-ui for now; adopt changesets + CI publish-on-merge once release frequency makes manual bumps annoying.
- **Template features** — saved/reusable block presets ("saved sections") are a likely email-builder ask; the document model supports it (serialize a subtree), but it's unscoped.
- **ESP-side conditionals** — visibility rules resolve at render time today. A host that uploads the template and lets the ESP personalize needs the rules emitted as `{{#if}}`/Liquid/`*|IF:|*` wrappers instead: a consumer-supplied conditional-syntax adapter plus a sentinel/string-replace pass around `render()` (React escapes quotes in text children). The rule model already fits; nobody has needed it yet.

## Build order

1. **Core** (`src/core/`): document model + commands + history, with vitest tests (no UI). The type contract in `src/core/types.ts` is already seeded.
2. **Provider + minimal UI**: store, hooks, a dumb canvas (render only, click-to-select) + inspector with 2–3 field helpers — developed against a kitchen-sink page in `site/` (since removed; the email builder is now the site's only page).
3. **DnD**: palette → canvas insert, then sibling reorder, then reparent; layers panel last (reuses everything).
4. **Email preset** (`src/email/`): root/container/text/button blocks + export pipeline + preview mode.
5. **First consumer**: publish `0.x`, pilot the email builder in the Fuga backoffice; feed API friction back into the docs.
6. Remaining blocks, polish (landing feedback, announcements, empty states), keyboard shortcuts.
