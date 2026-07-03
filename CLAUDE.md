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

This is a pnpm workspace (`pnpm-workspace.yaml`) with two packages, mirroring the mat-ui repo:
- **Root** (`@matthiaskrijgsman/mat-builder`) — the published library, built with Vite from `src/`
- **`site/`** (`@matthiaskrijgsman/mat-builder-site`, private) — the Next.js playground app (port 6007), depends on the library via `workspace:*`. This is the primary development surface — most iteration happens here, not in consuming projects.

## Commands

- **Build (library):** `pnpm build` (Vite library build + TypeScript declaration emit)
- **Watch build:** `pnpm dev:watch` (rebuilds `dist/` on change — run alongside `pnpm site`, since the site consumes `dist/`)
- **Test:** `pnpm test` (vitest; `pnpm test:watch` for watch mode)
- **Lint:** `pnpm lint`
- **Playground:** `pnpm site` (Next.js dev server on port 6007)

## Architecture

### Library build & entry points

Three build entries (see `vite.config.ts`), ESM only:

| Export | Source | Notes |
|---|---|---|
| `@matthiaskrijgsman/mat-builder` | `src/index.tsx` | editor: core + provider + UI components (client, `"use client"` banner) |
| `./email` | `src/email/index.tsx` | email block definitions preset (client) |
| `./email/render` | `src/email/render.ts` | **server-safe** — document → email HTML via react-email; imported by backend code. Must never import editor code, mat-ui, or anything client-only. The build omits its `"use client"` banner. |
| `./style` | `src/style.css` | consumers must import this for editor styles |

- All `dependencies` and `peerDependencies` (including subpaths) are externalized — never bundle them. Pragmatic drag and drop keeps module-level registries; duplicating it breaks drags.
- Type declarations are emitted separately via `tsconfig.build.json`.
- `react-email` is an **optional peer dependency** — only consumers using the email preset install it. Core (`.`) must never import it.

### Source organization (follows docs/03 §5)

- `src/core/` — document model, block definitions/registry, commands, history, traversal. **Pure and server-safe: no React DOM, no browser APIs.** All document mutations go through the command layer.
- `src/react/` — `BuilderProvider`, per-instance zustand store, hooks, keyboard handling
- `src/dnd/` — Pragmatic drag and drop integration
- `src/components/` — `canvas/`, `palette/`, `inspector/`, `layers/`, `toolbar/`, `fields/`
- `src/email/` — email block set + server-safe renderer

### UI primitives & styling

- Editor chrome (inspector fields, buttons, panels) is built from **mat-ui components** — don't hand-roll primitives mat-ui already has.
- All editor-chrome colors/structure use CSS custom properties in `src/styles/tokens.css` (prefix `--mat-builder-*`), so consuming projects can retheme without forking. Same philosophy as mat-ui's tokens.
- Tailwind v4 via `@tailwindcss/vite`; path alias `@/` → `src/` (tsconfig + vite config).

### Key design invariants

- The document is a **flat id-keyed map**; children grouped per named container (`children: { left: [...], right: [...] }`). Never introduce nested-tree state.
- Blocks are defined by consumers via `defineBlock({ type, label, icon, defaultProps, containers, editRender, inspector })` — the library never hardcodes block types (the email preset is just a consumer that ships in-repo).
- Undo/redo = snapshot history over the immutable document; `updateProps` coalesces (~800 ms) so typing is one undo step.
- One `monitorForElements` per provider performs all DnD mutations; drop targets only render indicators. All drag data is branded with a per-instance `instanceId` symbol.
- Editor and output rendering are separate per block (`editRender` vs the email renderer), sharing a `styles.ts` per block for visual parity.

## Publishing

Published to npm as `@matthiaskrijgsman/mat-builder` (public). `prepublishOnly` runs the build. Versioning is currently manual `0.x` bumps in the root `package.json` (the playground reads the version at build time via `next.config.ts` — never hardcode it). Breaking changes are allowed while on `0.x`; note them in the changelog section of the release commit.
