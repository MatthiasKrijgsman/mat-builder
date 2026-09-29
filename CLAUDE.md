# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mat-builder (`@matthiaskrijgsman/mat-builder`) is a headless-first React drag-and-drop **block builder** library published to npm — the engine behind visual builders (email builder first, form builder later) across multiple projects and companies. Built with React 19, Tailwind CSS v4, Atlassian's Pragmatic drag and drop, zustand + immer, and `@matthiaskrijgsman/mat-ui` for UI primitives.

## The plan — read it first

**`docs/` contains the full architecture and build plan. Before implementing or changing builder behavior, read `docs/README.md` (decisions + build order) and the numbered doc for the area you're touching:**

- `docs/01-goals-and-requirements.md` — requirements, agreed decisions and their rationale
- `docs/02-prior-art.md` — Puck/Craft.js/Waypoint patterns we adopted or rejected
- `docs/03-architecture.md` — document model, block definition API, commands, history, store
- `docs/04-components-and-interactions.md` — Canvas/Palette/Inspector/LayersPanel, selection, keyboard
- `docs/05-drag-and-drop.md` — Pragmatic drag and drop integration (hitboxes, monitor, indicators)
- `docs/06-email-builder.md` — email block set, dual renders, export pipeline

The docs are living documents: when an implementation decision deviates from them, update the doc in the same change.

## Repository layout

`site/` is the primary development surface — most iteration happens here, not in consuming projects. The playground **is** the email builder (root page, `site/app/page.tsx`).

## Commands

- **Watch build:** `pnpm dev:watch` (rebuilds `dist/` on change — run alongside `pnpm site`, since the site consumes `dist/`)
- **Email client-support check:** `pnpm email:check <file.html|file.json> [--clients=major|outlook|gmail|all|<glob,…>] [--json] [--out=file.html]` — renders a document/template JSON (or takes HTML) and reports caniemail support via doiuse-email. Needs a fresh `pnpm build` (renders with `dist/`). The same report is the playground page `/email-check` (template menu → "Check client support"; click a finding to outline its elements). Use it before and after changing any email renderer/`styles.ts`. To check the built-in samples, dump them first: `site/app/samples` uses extensionless imports, so load it with `node_modules/.bin/jiti` and write `EMAIL_SAMPLES.map(s => ({ name: s.name, document: s.document }))` to a JSON file. Data is a 2023 caniemail snapshot, documented support only — see docs/06 §Playground host.

## Architecture

### Library build & entry points

- All `dependencies` and `peerDependencies` (including subpaths) are externalized — never bundle them. Pragmatic drag and drop keeps module-level registries; duplicating it breaks drags.
- `./email/render` is **server-safe** — it must never import editor code, mat-ui, or anything client-only, and the build omits its `"use client"` banner.
- `./style` must be imported by consumers for editor styles, next to `@matthiaskrijgsman/mat-ui/style` (mat-ui's components carry their own classes; neither stylesheet includes the other). It ships Tailwind's theme + utilities and a reset **scoped to the builder's own roots** (`src/styles/preflight.css`) — never the global preflight, which would restyle the host app.
- **Every Tailwind utility is authored with the `mat:` prefix** (`mat:flex`, `mat:hover:bg-x`, `mat:-translate-y-1/2`); an unprefixed utility compiles to nothing, and `scripts/check-css.mjs` fails the build on one. Authored classes (`mat-builder-*`, `.input-label`, …) are not utilities. mat-ui uses the same prefix, so a selector here can name a mat-ui utility (`.mat\:h-px`).
- `./style-flat` is derived from `./style` at build time (`scripts/build-style-flat.mjs`): layers flattened, every rule scoped to the roots in `preflight.css`. It is the entry for a host not on Tailwind v4; never hand-edit it, and keep the roots list in step with `preflight.css`.
- `react-email` and `@react-email/render` are **optional peer dependencies** — required by `./email/render`, lazy-loaded by the preview so `./email` never imports them statically; only consumers using the email preset install them (`scripts/smoke-test.mjs` asserts they are skippable). Core (`.`) must never import them.
- The pragmatic-drag-and-drop addon packages require core `^3.1.0`; keep the five `@atlaskit/pragmatic-drag-and-drop*` ranges aligned or a fresh consumer install gets two core copies and auto-scroll registers in the wrong one.

### Source organization (follows docs/03 §5)

- `src/core/` — document model, block definitions/registry, commands, history, traversal. **Pure and server-safe: no React DOM, no browser APIs.** All document mutations go through the command layer.

### UI primitives & styling

- Editor chrome (inspector fields, buttons, panels) is built from **mat-ui components** — don't hand-roll primitives mat-ui already has.
- All editor-chrome colors/structure use CSS custom properties in `src/styles/tokens.css` (prefix `--mat-builder-*`), so consuming projects can retheme without forking. Same philosophy as mat-ui's tokens.

### Key design invariants

- The document is a **flat id-keyed map**; children grouped per named container (`children: { left: [...], right: [...] }`). Never introduce nested-tree state.
- A stored document is untrusted input: it goes through `loadDocument` (migrate → `repairDocument` → validate) on the way in and reports repairs via `onDocumentIssues`; every href/src goes through `safeUrl` and every stored style string through `src/style-props/sanitize.ts` on the way out. A consumer block that throws is caught per block (`BlockErrorBoundary`, reported via `onBlockError`).
- Blocks are defined by consumers via `defineBlock({ type, label, icon, defaultProps, containers, editRender, inspector })` — the library never hardcodes block types (the email preset is just a consumer that ships in-repo).
- Undo/redo = snapshot history over the immutable document; `updateProps` coalesces (~800 ms) so typing is one undo step.
- One `monitorForElements` per provider performs all DnD mutations; drop targets only render indicators. All drag data is branded with a per-instance `instanceId` symbol.
- Editor and output rendering are separate per block (`editRender` vs the email renderer), sharing a `styles.ts` per block for visual parity.

## Publishing

Published to npm as `@matthiaskrijgsman/mat-builder` (public). `prepublishOnly` runs the build. Versioning is currently manual `0.x` bumps in the root `package.json` (the playground reads the version at build time via `next.config.ts` — never hardcode it). Breaking changes are allowed while on `0.x`; note them in the changelog section of the release commit.
