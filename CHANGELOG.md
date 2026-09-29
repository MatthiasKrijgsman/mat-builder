# Changelog

Breaking changes are allowed while on `0.x` and are listed here per release.

## Unreleased

Outlook for Windows and Gmail-app fixes, found with the new client-support check (`/email-check`, `pnpm email:check`). No breaking changes for documents. A custom `EmailRenderer` now receives `ctx: EmailBlockContext` (a superset of `BlockContext`).

- **Content width**: an Outlook-only fixed-width ghost table around the root's content column. Word ignores `max-width`, so the email used to stretch to the window.
- **Images**: every sized image carries a px `width` attribute derived from its column (`ctx.availableWidth`, `emailChildWidths`), and fixed widths are capped at the column. Images narrower than their column align through a cell `align` attribute instead of `margin: auto`.
- **Gaps**: vertical gaps are spacer-row tables instead of padded divs, which Outlook collapsed.
- **96 DPI**: the head gains the Office settings block, and `<html>` the VML/Office namespaces.
- **Hybrid columns**: stacking rows render inline-block columns with a px `max-width` that wrap on narrow screens without a media query, so they now stack in the Gmail apps with non-Gmail accounts too. Outlook gets a ghost table of fixed cells. Output markup of horizontal containers changes: cells are divs, not `td`s. `stackOnMobile: false` rows keep the table row.
- **Rounded/gradient buttons**: a VML `v:roundrect` for Outlook, with the anchor hidden from it.
- **Gradient/image container backgrounds**: a VML `v:rect` fill for Outlook, padding moved into its inset. Direction per the Maizzle convention (VML = CSS − 90); unverified in a real Outlook.
- **Auto rows (Figma-style)**: a horizontal container's new `columns: "auto" | "equal"` prop. In an auto row each child's width claims its column: Fill shares the rest, Fixed and Percent take their size, and Hug fits its content. The row's horizontal alignment places the group, on the canvas and in the output (including Outlook). New containers are created with `"auto"`. Stored containers without the prop read as `"equal"`, the old behaviour, so existing documents render unchanged. There is an inspector control ("Columns: Auto / Equal") for horizontal containers. The core gains `ContainerDef.getChildLayout`, and the output walk hands renderers `ctx.childNodes`.
- **Canvas fix**: horizontal containers laid their cells out at content width, packed left, instead of in equal columns like the email output. The slot's layout classes had lost their `mat:` prefix in 0.2.0, so they compiled to nothing, and flex only worked in hosts whose own Tailwind generated `flex`. A source scan (`src/styles/prefix.test.ts`) now catches unprefixed utilities, which the built-CSS check cannot see.
- `msoOnly`, `hideFromMso` and `vmlGradientAngle` are exported from `/email/render` for custom renderers.

## 0.3.0 — 2026-09-11

The feature half of the first external integration's feedback.

- **Responsive output** — horizontal containers stack on phones. Each cell carries `class="mb-stack"` (plus a gap class) and the root emits one `<style>` media query below 600px, derived from the document and omitted when nothing stacks. `stackOnMobile: false` per container opts out (inspector toggle on horizontal containers); older documents stack by default. Outlook on Windows ignores `<style>` and keeps the columns.
- **Conditional emission adapter** — `renderEmail(doc, { conditionals: { wrap(html, rule, block) } })` emits conditional blocks in the host's template syntax (Liquid, Handlebars, `*|IF:|*`…) instead of resolving them: every block renders, each one with rules reaches `wrap` as its complete markup, and the return value replaces it. Wrapping runs after `pretty` and before substitution; the plain-text variant is untouched. `applyConditionals` is exported for hosts rendering the tree themselves.
- **Keyboard block moving** — `Alt+↑/↓` swap with a sibling, `Alt+←` moves out after the parent, `Alt+→` moves into the previous sibling's first container; gated by the same `canDropAt` as drag and drop, on both surfaces.
- **Labels** — every English string in the editor chrome comes from one `labels` dictionary (`DEFAULT_LABELS`), overridable per key through the `labels` prop on the provider, shell and `<EmailBuilder>`; preset block labels and categories included.

## 0.2.0 — 2026-09-11

CSS packaging for hosts that are not on Tailwind v4. Requires `@matthiaskrijgsman/mat-ui@0.0.68`.

- **Breaking: every Tailwind utility in the editor is now prefixed.** `dist/style.css` ships `.mat\:flex` instead of `.flex` and `--mat-*` theme variables instead of Tailwind's defaults, so no class of ours can collide with a host's own Tailwind (v3 or v4). A host that targeted the editor's utility classes in its own CSS must update those selectors; tokens and the `.mat-builder-*` roots are unchanged. mat-ui 0.0.68 makes the same change with the same prefix.
- **New entry `./style-flat`** (and mat-ui's): the same rules with the cascade layers flattened and every selector scoped to the builder's roots plus Floating UI's portal, at zero extra specificity. For a Tailwind v3 or no-Tailwind host, whose unlayered CSS would otherwise beat every layered rule and whose PostCSS pipeline cannot import bare `@layer` blocks. The builder's roots carry mat-ui's `mat-ui` scope class, so a host wraps nothing.
- **Build** — `scripts/build-style-flat.mjs` derives the flat entry from the layered one; `scripts/check-css.mjs` fails the build on an unprefixed utility or an unscoped flat rule. `pnpm test:pack` asserts the new entry ships.

## 0.1.1 — 2026-09-11

From the first external integration (a Tailwind 3 host compiling once and personalising with Liquid). No breaking changes.

- **Output** — `renderEmail` takes `pretty: false` (the prettifier could break a line inside a merge-tag token) and `strict: true` (throw on an unknown block type instead of rendering it as nothing).
- **Server** — `loadDocument`, `validateDocument`, `repairDocument`, `migrateDocument` and `DOCUMENT_VERSION` are exported from `/email/render`. Their `registry` argument is now optional: without it, the structural invariants are checked and the definition-dependent ones skipped, so a backend validates without importing the editor.
- **Editor** — `features={{ visibility: false }}` (provider, shell, `<EmailBuilder>`) hides the conditional-visibility UI for a host whose pipeline cannot honour rules; `useBuilderFeatures()` reads it. `minWidth` (768 by default) and `smallScreenNotice` on the shell replace a squeezed layout with a notice.
- **Theming** — new tokens `artboard-radius`, `font-family-eyebrow` and `palette-icon-fg` (one colour over the seven category tints). The selected layer row is now a 12% wash of the selection colour with the panel text over it, rather than a filled bar; `color-layer-row-selected-fg` derives from `color-panel-fg` and no longer has dark/light values of its own. theming.md §4 lists which tokens the shell re-declares and how to override those from CSS.
- **Packaging** — `./package.json` is exported. The docs no longer call `react-email` and `@react-email/render` optional for anyone importing `/email`: a bundler resolves the preview's dynamic import at build time.

## 0.1.0 — 2026-09-07

First published release.

- **Editor** — `<EmailBuilder>` (email preset, preview mode) and `<BuilderShell>` (block-set agnostic), both assembled from individually exported parts: `BuilderProvider`, `Canvas`, `Palette`, `Inspector`, `LayersPanel`, `ShellTopBar`, `useDocumentSave`.
- **Blocks** — `defineBlock` primitives, composed blocks (`compose`), palette patterns (`definePattern`); the email preset ships root, container, text (rich text with merge tags), button, image, divider, spacer and table.
- **Documents** — flat id-keyed model, undo/redo with coalescing, migrations, conditional visibility. Stored documents are repaired on load (`loadDocument`, reported through `onDocumentIssues`) instead of refusing to open.
- **Output** — `./email/render` is server-safe; every href/src is scheme-checked and every stored style value guarded, the preview iframe is sandboxed.
- **Resilience** — a block that throws is contained to that block (`onBlockError`); the shell has its own boundary (`onRenderError`).
- **Top bar** — named slots (`topBarSlots`) and `useShellSave()` for hosts adding, replacing or hiding parts of the bar.
- **Theming** — `--mat-builder-*` tokens, a dark scheme, and per-instance `theme`/`colorScheme` props. `./style` ships no global preflight.
- **Packaging** — `react-email` and `@react-email/render` are optional peers, needed only by `./email/render` and the preview; a clean-room smoke test (`pnpm test:pack`) runs in CI.
