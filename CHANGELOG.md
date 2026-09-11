# Changelog

Breaking changes are allowed while on `0.x` and are listed here per release.

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
