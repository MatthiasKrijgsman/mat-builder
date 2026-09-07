# Changelog

Breaking changes are allowed while on `0.x` and are listed here per release.

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
