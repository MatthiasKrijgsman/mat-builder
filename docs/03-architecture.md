# 03 — Architecture

## Overview

Three layers, strictly ordered — each layer only knows about the ones below it:

```
┌─────────────────────────────────────────────────────────┐
│ 3. Applications (backoffice)                            │
│    email block defs + react-email renderer,             │
│    form block defs + form runtime, editor page layouts  │
├─────────────────────────────────────────────────────────┤
│ 2. Editor UI  (@matthiaskrijgsman/mat-builder — React components)        │
│    Canvas, Palette, Inspector, LayersPanel, Toolbar,    │
│    field helpers, DnD integration                       │
├─────────────────────────────────────────────────────────┤
│ 1. Core       (@matthiaskrijgsman/mat-builder — headless)                │
│    document model, block definitions/registry,          │
│    commands, history, store, traversal utilities        │
└─────────────────────────────────────────────────────────┘
```

The core layer has no DOM dependencies — it can run on the server (validation, migration, rendering pipelines). Application renderers (e.g. email → HTML) depend only on the core layer.

## 1. Document model

A **flat, id-keyed map** (see [02-prior-art.md](02-prior-art.md) for why). Children are grouped per named **container**, which is what lets a block expose multiple drop regions:

```ts
type BlockId = string; // nanoid

interface BlockNode {
  id: BlockId;
  type: string;                          // key into the block registry
  props: Record<string, unknown>;        // block-specific, shaped by the block's definition
  children: Record<string, BlockId[]>;   // container name → ordered child ids
}

interface BuilderDocument {
  version: number;                       // schema version, for migrations
  rootId: BlockId;
  blocks: Record<BlockId, BlockNode>;
}
```

Example (email): a two-column section holding a text block and a button —

```jsonc
{
  "version": 1,
  "rootId": "root",
  "blocks": {
    "root":  { "id": "root", "type": "email-root", "props": { "backgroundColor": "#ffffff" },
               "children": { "main": ["sec1"] } },
    "sec1":  { "id": "sec1", "type": "columns", "props": { "gap": 16, "ratio": "50/50" },
               "children": { "left": ["txt1"], "right": ["btn1"] } },
    "txt1":  { "id": "txt1", "type": "text", "props": { "text": "## Hello" }, "children": {} },
    "btn1":  { "id": "btn1", "type": "button", "props": { "label": "Buy", "href": "…" }, "children": {} }
  }
}
```

Notes:

- **The root is a block like any other** (marked `hidden` so it never appears in the palette). Document-level settings (email background, content width) are just the root block's props, edited through the same inspector mechanism.
- **A "location"** — the universal address used by insert/move commands and DnD — is `{ parentId: BlockId, container: string, index: number }`.
- **Integrity invariants** (enforced by the command layer, checked by a `validateDocument()` dev helper): every non-root block appears in exactly one parent's child list; every referenced id exists; every container name exists on the parent's definition; `accepts` rules hold.
- **Versioning**: `version` + a `migrate(doc)` chain in core, run on load. Cheap now, indispensable in a year.

## 2. Block definitions & registry

One declarative object per block type, created through a `defineBlock` helper for type inference. This is the whole per-application API surface:

```tsx
import { defineBlock } from "@matthiaskrijgsman/mat-builder";

interface ColumnsProps { gap: number; ratio: "50/50" | "33/67" | "67/33" }

export const columnsBlock = defineBlock<ColumnsProps>({
  type: "columns",
  label: "Columns",
  icon: ColumnsIcon,                       // ComponentType — palette & layers render it
  category: "Layout",
  keywords: ["grid", "split"],             // palette search
  defaultProps: { gap: 16, ratio: "50/50" },
  schema: columnsPropsSchema,              // optional zod schema — validates on load/paste (not yet implemented; lands with the email preset so zod isn't a dependency until it pays for itself)

  // Named containers = the block's internal drop regions
  containers: [
    { name: "left",  layout: "vertical" },
    { name: "right", layout: "vertical" },
  ],

  // Canvas rendering (D2: separate from output rendering).
  // `containers.left` etc. are pre-rendered elements the block places in its layout —
  // the package owns drop-target behavior inside them; the block owns their placement.
  editRender: ({ props, containers }) => (
    <div className="flex" style={{ gap: props.gap }}>
      <div className={ratioClass(props.ratio, 0)}>{containers.left}</div>
      <div className={ratioClass(props.ratio, 1)}>{containers.right}</div>
    </div>
  ),

  // Inspector form (D1: custom component composed from shipped field helpers)
  inspector: ({ props, update }) => (
    <>
      <SelectField label="Ratio" value={props.ratio} onChange={(ratio) => update({ ratio })}
                   options={["50/50", "33/67", "67/33"]} />
      <NumberField label="Gap" value={props.gap} onChange={(gap) => update({ gap })} min={0} max={64} />
    </>
  ),
});
```

### Container definition

```ts
interface ContainerDef {
  name: string;                            // unique within the block
  label?: string;                          // shown in layers tree & empty-state placeholder
  layout: "vertical" | "horizontal" | "grid"; // determines drop hitbox axis & indicator orientation
  grid?: { columns: number };
  accepts?: string[] | ((childType: string, ctx: AcceptCtx) => boolean); // omit = accept all
  maxChildren?: number;
  placeholder?: string;                    // empty-container hint text
  getGap?: (props) => number | undefined;  // canvas gap between children, derived from the block's props
  slotAs?: CanvasTag | "none";             // canvas element for the slot (default div); see below
  emptyAs?: CanvasTag;                     // element for the empty-state placeholder (default div)
}
```

`getGap` lets a container's child spacing follow a block prop (the email preset wires it to `props.layout.gap`). The canvas applies it as flex-column gap **only when > 0** (so the default block flow and its margin collapsing survive); the output render is responsible for the same gap in its own idiom (email: table-safe `withVerticalGap` wrappers).

`layout` matters to the *editor*, not just styling: it decides whether DnD uses top/bottom edges (vertical), left/right edges (horizontal), or 2D closest-edge (grid) for drop position detection — see [05-drag-and-drop.md](05-drag-and-drop.md).

### Canvas element overrides (`wrapperAs` / `slotAs`)

The canvas normally wraps every block in a `<div>` (BlockView) and every slot in another `<div>` (ContainerSlot). That is invalid inside HTML table structure — a `<div>` between `<table>` and `<tr>` makes the parser hoist the content clean out of the table — so blocks that **are** table structure name a legal tag instead. `CanvasTag` is a closed union (`div | section | span | tbody | thead | tfoot | tr | td | th`): only these are checked against the chrome overlay and the DnD hitboxes. Introduced by the table's decomposition ([06 §Table](06-email-builder.md#table)); nothing else in the preset uses them.

Three consequences worth knowing before reaching for them:

- **`slotAs: "none"`** renders no slot element at all (nothing may sit between `<tr>` and `<td>`), and therefore registers **no "into me" drop target**: reordering runs entirely off the children's sibling edges, and only the empty-state placeholder is droppable. Borrowing the parent block's wrapper instead is not an option — Pragmatic's drop-target registry is a `WeakMap` keyed by element, so a second registration silently clobbers the block's own sibling target.
- **Row-group tags (`tr`/`tbody`/`thead`/`tfoot`) take no flow content**, so they can host neither the absolutely-positioned drop-edge indicator nor the container highlight ring. Both degrade to an inset `box-shadow` on the element itself, which requires `border-collapse: separate`.
- **Layout classes are skipped** for any non-`div` slot: flex/grid/gap on a `<tbody>` would destroy the table box tree. The browser's table layout arranges those children instead.

### Other definition fields

```ts
interface BlockDefinition<P> {
  // identity & palette
  type: string; label: string; icon?: ComponentType; category?: string;
  keywords?: string[]; hidden?: boolean;   // hidden: registrable but not in palette (root blocks)
  // data
  defaultProps: P; schema?: ZodType<P>;
  containers?: ContainerDef[];
  wrapperAs?: CanvasTag;                   // canvas wrapper element (default div) — see above
  getWrapperProps?: (props: P, ctx: BlockContext) => WrapperProps; // style/colSpan/rowSpan on that wrapper
  // rendering & inspecting
  editRender: ComponentType<EditRenderProps<P>>;
  inspector?: ComponentType<InspectorProps<P>>;
  // behavior policy
  canDelete?: boolean;                     // default true
  canDrag?: boolean;                       // default true (root: false)
  onCreate?: (ctx) => Partial<P> | { children?: SubtreeSpec };
  // e.g. a "columns" block that self-populates, or props derived from drop context
}

interface EditRenderProps<P> {
  id: BlockId;
  props: P;
  containers: Record<string, ReactNode>;   // one entry per ContainerDef
  isSelected: boolean;
}

interface InspectorProps<P> {
  id: BlockId;
  props: P;
  update: (patch: Partial<P>) => void;     // merges + records history (coalesced)
}
```

`update` merges **shallowly** (top-level keys replace). Object-valued props — the style-group values below — must therefore always be patched with the *complete* next object, never a nested partial; the shipped style-group components guarantee this.

`getWrapperProps` exists for blocks whose wrapper **is** the styled element (a `<td>`: its fill, padding, width and spans have nowhere else to go — an inner div would not be the table cell). It receives a `BlockContext` (`{ document, location, siblingCount }`) because such a block is usually one part of a composite and needs state from its ancestors and siblings — a cell resolving its table's border mode, its own row/column index, the row count for corner radii. `EmailRenderer` takes the same context as a third argument, threaded down by `buildEmailTree`, so both renders resolve identically. Two caveats: BlockView reads the document from the store **unsubscribed** (correct only because an ancestor change re-renders the subtree top-down — memoizing BlockView would break it), and walking up costs a `findLocation` scan per block.

`onCreate` children are **defaults**: an explicit `NewBlockSpec` from the parent wins, so a block that seeds a whole subtree (a table describing its rows and their cells) does not have those children replaced by each child type's own `onCreate`.

### Style props & style groups

Reusable, named property sets that blocks opt into instead of re-inventing ad-hoc style props:

- **`src/style-props/`** — the pure, server-safe vocabulary: one value type + defaults + `toCss(value?): CSSProperties` converter per set (`SizeValue`, `BackgroundValue`, `BorderValue`, `SpacingValue`, `EffectsValue`, `LayoutValue`, `TypographyValue`). Every converter maps `undefined → {}` so documents predating a group degrade softly. Importable from both the root entry and `./email/render`.
- **`src/components/style-groups/`** — one collapsible inspector component per set (`<BorderGroup value={props.border} onChange={(border) => update({ border })} />`), built on `InspectorGroup` and the field helpers. Blocks store each group's value under a single props key (`props.border`, `props.background`, …).

The **registry** is just the array of definitions handed to the provider; core wraps it in a `Map` and exposes `getDefinition(type)`. Unknown types found in a loaded document render a built-in "missing block" placeholder rather than crashing (protects against removed block types in old documents).

## 3. Editor state & store

Per-instance state (two builders on one page must not share anything) held in a **zustand vanilla store created inside `<BuilderProvider>`** and exposed via context + selector hooks. Zustand over raw context because canvas nodes must subscribe to *slices* (their own block) without tree-wide re-renders.

```ts
interface EditorState {
  document: BuilderDocument;               // immutable — every change replaces it
  selectedId: BlockId | null;
  hoveredId: BlockId | null;               // canvas ↔ layers hover sync
  expanded: Set<BlockId>;                  // layers tree
  drag: DragState | null;                  // live during a drag (source, current drop target)
  history: { past: HistoryEntry[]; future: HistoryEntry[] };
}
interface HistoryEntry { document: BuilderDocument; selectedId: BlockId | null }
```

### Commands

All mutations go through a small command layer — the only code allowed to touch `document`. Each command is a pure function `(doc, payload) → doc` (implemented with immer for structural sharing):

| Command | Notes |
|---|---|
| `insertBlock(type, at: Location)` | creates node from `defaultProps` (+ `onCreate`), inserts id at location |
| `moveBlock(id, to: Location)` | validates `accepts` + no-descendant-cycle, then two array edits; `to.index` uses pre-move coordinates (what hitboxes compute while the block is still in place) |
| `updateProps(id, patch)` | shallow-merge; **history-coalesced** (below) |
| `removeBlock(id)` | removes subtree; selection falls back to parent |
| `duplicateBlock(id)` | deep-clone subtree with fresh ids, insert after source |
| `setDocument(doc)` | load/replace (runs `migrate` + validation) |

Implementation notes (src/core/commands.ts): commands that need definitions take the registry as a final argument; `insertBlock` and `duplicateBlock` return `{ document, blockId }` — callers (store, DnD) need the new id to select it. The shared drop-validity predicate `canDropAt(doc, registry, childType, at, movingId?)` (accepts + maxChildren + container-exists + root/canDrag/cycle rules) is what the DnD layer uses to gate drop targets before a command ever runs.

### Undo/redo

Snapshot history — immer's structural sharing makes snapshots cheap (unchanged blocks are shared references):

- Structural commands (insert/move/remove/duplicate) always push a history entry.
- **`updateProps` coalesces**: consecutive updates to the same block within ~800 ms collapse into one entry, so typing in an inspector field is one undo step, not one per keystroke. (Same approach as Craft.js's throttled history.)
- Each entry stores `selectedId` so undo restores what you were looking at.
- Capped (e.g. 100 entries). `Cmd/Ctrl+Z`, `Shift+Cmd/Ctrl+Z` wired by the provider's keyboard handling.

### Controlled component contract

```tsx
<BuilderProvider
  blocks={emailBlocks}
  value={document}                 // controlled; or defaultValue for uncontrolled
  onChange={(doc) => save(doc)}    // called after every committed command (debounce upstream)
  onSelectionChange={...}
  mergeTags={[{ token: "{{first_name}}", label: "First name" }]} // optional; see 06 §merge tags
>
  {/* host app arranges the UI components freely — see 04 */}
</BuilderProvider>
```

`onChange` fires for committed **user commands** only. An external `value` replacement syncs the store without it (`syncExternalDocument`), which is what lets the shell's save controller treat `onChange` as the dirty signal (04 §Shell): a document handed in from the outside is already saved. Saving itself is host state and stays out of the store — `useDocumentSave` owns it.

## 4. Public API sketch

```ts
// core (server-safe)
export { defineBlock, createRegistry, mergeBlockDefinitions, createDocument, validateDocument,
         migrateDocument, walkDocument, findLocation, findAncestors, isDescendant, canDropAt } from "./core";
export type { BuilderDocument, BlockNode, BlockDefinition, BlockRegistry, Location } from "./core";
// createRegistry/BlockRegistry are public because createDocument & validateDocument take a
// registry; the command & history functions stay internal — the provider's store drives them.

// react
export { BuilderProvider } from "./react/provider";
export { useDocumentSave } from "./react/save"; // dirty tracking + save orchestration (04 §Shell)
export { useEditor,        // actions + history: { undo, redo, canUndo, canRedo }
         useSelectedBlock, // { id, node, definition } | null
         useBlockNode,     // (id) => node slice subscription
         useBuilderState,  // selector escape hatch
         useMergeTags      // the provider's mergeTags (empty when unconfigured)
       } from "./react/hooks";
export type { MergeTag } from "./react/merge-tags"; // { token, label } — literal token, no delimiter assumed

// UI components (each independent & restylable — see 04)
export { Canvas, Palette, Inspector, LayersPanel, Toolbar } from "./components";
export { BuilderShell,     // all of the above assembled: provider + docked layout + saving
         ShellTopBar, SaveControls,
         dockedPanel, dottedSurface, transparentSurface } from "./components/shell";
export * as Fields from "./components/fields"; // TextField, MergeTagTextField, NumberField,
                                               // SliderField, SelectField, ColorField, ToggleField, …
```

## 5. Repository layout (standalone repo, mirrors mat-ui)

pnpm workspace: the root is the published package, `site/` is the Next.js playground — the primary development surface.

```
mat-builder/
  src/
    core/                     # document, commands, history, registry, traversal — pure, server-safe
    react/                    # provider, store wiring, hooks, keyboard handling
    dnd/                      # pragmatic-drag-and-drop integration (see 05)
    components/
      canvas/  palette/  inspector/  layers/  toolbar/
      shell/                  # BuilderShell: the assembled editor + docked chrome (see 04)
      fields/                 # shared inspector field helpers (wrapping mat-ui inputs)
    email/                    # email block set + server-safe renderer (see 06)
  site/                       # playground app (the email builder — deployed to GitHub Pages on push to main)
  docs/                       # these documents
```

Build entries / npm exports (ESM, Vite lib mode):

| Export | Contents |
|---|---|
| `.` | core + editor UI (client, `"use client"` banner) |
| `./email` | email block definition preset (client) |
| `./email/render` | server-safe document → email HTML — importable from backend code, never imports editor code |
| `./style` | editor stylesheet |

Consuming projects (e.g. the Fuga backoffice) install from npm and register their own custom blocks; project-specific block sets live in the consuming repos, not here.

Styling: editor chrome uses Tailwind v4 plus design tokens (`--mat-builder-*` CSS custom properties in `src/styles/tokens.css`) and mat-ui primitives for controls, so consuming projects retheme via tokens without forking. Every default component is replaceable wholesale, and the primitive hooks (`useBlockNode`, `useEditor`, DnD attachers) are public, so a fully custom canvas or inspector is possible without forking the package.
