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
│       │                          (code: BlockView + BlockChrome in components/canvas/)
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

- A centered, rounded "artboard" (react-email-preview style) with a fixed, user-resizable size: rounded bars on each edge drag-resize it symmetrically per axis (`artboardWidth`/`artboardHeight` props set the initial size; email default 600 px wide). Content taller than the artboard scrolls *inside* it — the inner scroll container (which is also the DnD auto-scroll target, see 05) is clipped by the rounded frame so corners stay round.
- The frame + dotted work surface is the exported `Artboard` component — shared with preview surfaces (`EmailPreview` renders its iframe in the same frame) and available to hosts for custom surfaces.
- Renders the root block, which recursively renders children through `BlockFrame` + `ContainerSlot`.
- Click on empty canvas area → deselect. `Escape` → select parent, then deselect at root.
- **Canvas is `editRender` only** (D2). A separate **preview mode** (Toolbar toggle) swaps the artboard for the real output — for email, an `<iframe srcDoc>` of the rendered HTML (see 06). Preview is read-only; no DnD or selection.

### BlockFrame (the per-block chrome)

Internal wrapper the package controls fully — this is where "we control how the editor looks" concentrates:

- **Idle**: nothing rendered around the block.
- **Hovered**: light outline + name tag (`ring-1` style overlay, absolutely positioned so it never affects layout — the chrome must not change the block's box or the edit render drifts from reality).
- **Selected**: strong outline + floating action bar (name, duplicate, delete — implemented; the whole frame is the drag surface until inline text editing needs a dedicated handle, see 05 §1).
- **Dragging**: source block dims (`opacity-40`); custom drag preview shows icon + label chip rather than a screenshot of the block (cheap, and consistent between palette and canvas drags).
- Chrome is layered via an absolutely-positioned overlay sibling of `editRender`, not by wrapping styles onto the block's own element.
- **Clipping rules** (the artboard scroller is a rounded `overflow-hidden` frame): the root's chrome is drawn by the Canvas on the artboard frame itself (ring outside the clipping context, name tag in the canvas gutter) — selecting the root *is* selecting the artboard. Non-root tags flip inside the block's corner when the block sits within tag-height of the scroll-content top (a static layout fact, measured per chrome render). If per-block chrome needs keep growing, the escalation path is a dedicated overlay layer: a portal above the artboard drawing all chrome from measured rects (Figma-style), fully outside any clipping context — costs rect-syncing on scroll/resize/content change, so only when justified.
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
- **Field helpers** are thin wrappers around mat-ui inputs (label + control, builder-flavored layout) so application inspectors are mostly declarative one-liners; anything bespoke is just JSX composed from mat-ui directly. Shipped: `TextField`, `TextAreaField`, `RichTextField`, `NumberField`, `SelectField`, `SegmentedField` (mat-ui `TabButtons` as a segmented control), `ColorField`, `ToggleField`, `FontFamilyField` (searchable select over the email-safe stacks in `style-props/typography.ts`; clear = inherit).
- **`InspectorGroup`** — a named, collapsible section (hand-rolled header + chevron; mat-ui has no accordion). Collapse state is local, so it resets when the selection changes — accepted for now.
- **Style groups** (`StyleGroups.*`) — reusable property sets built on `InspectorGroup`: `SizeGroup`, `BackgroundGroup`, `BorderGroup`, `SpacingGroup`, `EffectsGroup`, `LayoutGroup`, `TypographyGroup`. Each edits one object-valued prop and always emits the complete next object (see 03 §Style props). Groups with natural subsets take a `fields` filter (e.g. `<SpacingGroup fields={["margin"]} />`).
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

### Keyboard (active when focus is inside the builder)

Implemented as a shared `onKeyDown` handler (`useBuilderKeyboard`, internal) that focusable builder surfaces attach — the Canvas today, the LayersPanel when it lands. The Canvas is `tabIndex={-1}` so clicking it (or any block) focuses it natively. Editable targets (inspector inputs) are skipped entirely: `Cmd/Ctrl+Z` inside a field stays the field's own text undo.

| Key | Action |
|---|---|
| `Cmd/Ctrl+Z` / `Shift+Cmd/Ctrl+Z` | undo / redo |
| `Delete` / `Backspace` | remove selected block (respects `canDelete`) |
| `Cmd/Ctrl+D` | duplicate selected |
| `Escape` | select parent / clear selection |
| `↑` / `↓` | previous / next sibling (no selection: selects the root) |
| `←` / `→` | collapse / expand the selected block (layers panel surface only) |

All of the above are implemented in `useBuilderKeyboard` (internal).

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
