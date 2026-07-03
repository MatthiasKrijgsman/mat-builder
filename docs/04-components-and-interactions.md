# 04 — Components & Interactions

Every editor surface is an independent component. The host app composes them inside `<BuilderProvider>` — the package ships no fixed layout:

```tsx
<BuilderProvider blocks={emailBlocks} value={doc} onChange={setDoc}>
  <div className="grid h-full grid-cols-[280px_1fr_320px] grid-rows-[auto_1fr]">
    <Toolbar className="col-span-3" />
    <aside><Palette /><LayersPanel /></aside>
    <Canvas />
    <Inspector />
  </div>
</BuilderProvider>
```

Any of them can be omitted (e.g. a minimal builder without a layers panel), duplicated, or replaced with a custom implementation built on the public hooks.

## Component inventory

```
BuilderProvider                    context, store, keyboard shortcuts, DnD monitor
├── Canvas                         scroll container + root block render
│   └── BlockFrame (internal)      per-block wrapper: selection/hover chrome, drag source,
│       │                          drop target, toolbar affordances
│       ├── <block.editRender>     the application's component
│       └── ContainerSlot (internal) per-container drop region, layout, empty placeholder,
│                                    drop indicators
├── Palette                        searchable, categorized block library
│   └── PaletteItem                icon + label, drag source (create-new)
├── Inspector                      binds to selection, hosts <block.inspector>
│   └── Fields.*                   TextField, NumberField, SelectField, ColorField,
│                                  ToggleField, SegmentedField, IconRadioField, …
├── LayersPanel                    hierarchy tree
│   └── LayerRow                   icon + label, expand caret, drag source + drop target
└── Toolbar                        undo/redo, zoom/device width, preview toggle, custom slots
```

### Canvas

- A scroll container (auto-scroll attached — see 05) with a centered "artboard" whose width is configurable (email: 600 px; plus device-width presets from the Toolbar).
- Renders the root block, which recursively renders children through `BlockFrame` + `ContainerSlot`.
- Click on empty canvas area → deselect. `Escape` → select parent, then deselect at root.
- **Canvas is `editRender` only** (D2). A separate **preview mode** (Toolbar toggle) swaps the artboard for the real output — for email, an `<iframe srcDoc>` of the rendered HTML (see 06). Preview is read-only; no DnD or selection.

### BlockFrame (the per-block chrome)

Internal wrapper the package controls fully — this is where "we control how the editor looks" concentrates:

- **Idle**: nothing rendered around the block.
- **Hovered**: light outline + name tag (`ring-1` style overlay, absolutely positioned so it never affects layout — the chrome must not change the block's box or the edit render drifts from reality).
- **Selected**: strong outline + floating action bar (drag handle, name, duplicate, delete). The drag handle is the `dragHandle` element for Pragmatic DnD, so text inside blocks stays selectable/editable.
- **Dragging**: source block dims (`opacity-40`); custom drag preview shows icon + label chip rather than a screenshot of the block (cheap, and consistent between palette and canvas drags).
- Chrome is layered via an absolutely-positioned overlay sibling of `editRender`, not by wrapping styles onto the block's own element.
- All chrome pieces are themable: a `components`/`classNames` prop on the provider (shadcn-style slot overrides) lets the host replace the name tag, action bar, outline styles, and indicators without forking.

### ContainerSlot

Renders one named container of a block:

- Applies the container's layout (`vertical` → flex-col, `horizontal` → flex-row, `grid` → grid with `grid.columns`) *in editor space*. The block's `editRender` decides where the slot sits; the slot decides how children stack.
- **Empty state**: a dashed placeholder with the container's `placeholder` text (e.g. "Drop content here") — also a full-surface drop target, so empty containers are easy targets.
- Renders drop indicators (line between children, or container highlight for "drop into") during drags.

### Palette

- Grouped by `category`, fuzzy search over `label` + `keywords`, icon + label per item.
- Each `PaletteItem` is a Pragmatic `draggable` carrying `{ kind: "new-block", blockType }`.
- **Click-to-add** as a complement to drag: clicking inserts into the current selection's nearest accepting container (or root) — good for accessibility and speed.
- Items whose type is accepted nowhere in the current document state could be dimmed (v2 polish).

### Inspector

- Subscribes to `selectedId`. Empty state when nothing is selected (or shows the root/document settings — root is a block, so this is free).
- Header: block icon, label, breadcrumb of ancestors (each clickable → reselect), delete button.
- Body: mounts the definition's `inspector` component with `{ id, props, update }`. `update` shallow-merges and coalesces history (03 §3).
- **Field helpers** are thin wrappers around mat-ui inputs (label + control, builder-flavored layout) so application inspectors are mostly declarative one-liners; anything bespoke is just JSX composed from mat-ui directly.
- Keyed by `selectedId` so switching blocks remounts the form (no stale local state).

### LayersPanel

- Tree of `LayerRow`s: expand caret (children present), block icon, label (definition label, or a block-provided `getDisplayName(props)` for nicer labels like the text content's first words), visibility of container names when a block has multiple containers (children grouped under subtle "left / right" headings).
- Selection and hover are **bidirectionally synced** with the canvas (`selectedId` / `hoveredId` in the store; hover in the layers panel outlines the canvas block and vice versa).
- Selecting a row auto-scrolls the canvas to the block; selecting on canvas expands + scrolls the tree.
- Rows are draggable/droppable for reorder + reparent (see 05 §4).
- Expand state (`expanded: Set<BlockId>`) lives in the store; newly created parents auto-expand.

### Toolbar

Thin bar of independent, individually usable controls: `<UndoRedoButtons />`, `<DeviceWidthSwitch />`, `<PreviewToggle />`, plus a children slot for app-specific actions (Save, Send test email). Ships as a convenience assembly; hosts can build their own from `useEditor()`.

## Interaction model

### Selection

- Click a block on canvas → select (innermost block under the pointer; clicks don't bubble-select parents).
- `Escape` walks up: child → parent → … → root → none. Breadcrumb in the inspector covers the same need with the mouse.
- Selection survives prop edits and is restored by undo (history entries store `selectedId`).

### Keyboard (provider-level, active when focus is inside the builder)

| Key | Action |
|---|---|
| `Cmd/Ctrl+Z` / `Shift+Cmd/Ctrl+Z` | undo / redo |
| `Delete` / `Backspace` | remove selected block (respects `canDelete`) |
| `Cmd/Ctrl+D` | duplicate selected |
| `Escape` | select parent / clear selection |
| `↑` / `↓` | previous / next sibling; `←`/`→` collapse/expand in layers panel |

(A full keyboard-only *move* mode — Atlassian recommends menu-based alternatives to DnD for accessibility — is a v2 item; the primitives (`moveBlock`) already exist, so it's UI work only.)

### Core user flows

1. **Add a block**: drag from palette → indicators show valid insert positions → drop → block created with `defaultProps`, selected, inspector opens → post-drop flash on the new block.
2. **Configure**: select block → inspector shows its form → edits apply live to the canvas (single undo step per burst).
3. **Restructure**: drag a block by its handle (canvas) or its row (layers panel) → move/reparent → flash at destination.
4. **Navigate deep trees**: layers panel + breadcrumb + `Escape`-to-parent cover the "select the section, not the text inside it" problem.
5. **Preview & export**: toolbar toggle → real rendered output; export handled by the application layer (06).

### Feedback details worth specifying up front

- Drop indicators: 2 px accent line between siblings (with the container's gap respected), ring highlight for "into this container", warning tint when hovering an invalid target (blocked rather than hidden — users learn the rules).
- `triggerPostMoveFlash` (Pragmatic's flourish package) after insert/move; screen-reader announcements via its live-region package ("Heading moved into Left column, position 2 of 3").
- Invalid drops simply animate the drag preview back; the document never enters an invalid state because validation happens in `canDrop`/command layer, not after.
