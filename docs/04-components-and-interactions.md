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
│   └── Fields.*                   TextField, NumberField, SliderField, SelectField, ColorField,
│                                  ToggleField, SegmentedField, IconRadioField, …
├── LayersPanel                    hierarchy tree
│   └── LayerRow                   icon + label, expand caret, drag source + drop target
└── Toolbar                        undo/redo, zoom/device width, preview toggle, custom slots
```

### Canvas

- A centered, rounded "artboard" (react-email-preview style) with a fixed, user-resizable size: rounded bars on each edge drag-resize it symmetrically per axis (`artboardWidth`/`artboardHeight` props set the initial size; email default 600 px wide; `"fill"` sizes it to 80% of the surface — and keeps tracking it on window resize — until the user drags a size). The user-dragged size persists in the store (`artboardSize` + `setArtboardSize`), read at mount by every artboard surface — so swapping Canvas ⇄ EmailPreview keeps the frame; `Artboard` itself stays store-free via its `size`/`onSizeChange` props. Content taller than the artboard scrolls *inside* it — the inner scroll container (which is also the DnD auto-scroll target, see 05) is clipped by the rounded frame so corners stay round.
- The frame + dotted work surface is the exported `Artboard` component — shared with preview surfaces (`EmailPreview` renders its iframe in the same frame) and available to hosts for custom surfaces.
- Renders the root block, which recursively renders children through `BlockFrame` + `ContainerSlot`.
- Click on empty canvas area → deselect. `Escape` → select parent, then deselect at root.
- **Canvas is `editRender` only** (D2). A separate **preview mode** (Toolbar toggle) swaps the artboard for the real output — for email, an `<iframe srcDoc>` of the rendered HTML (see 06). Preview is read-only; no DnD or selection.

### BlockFrame (the per-block chrome)

Internal wrapper the package controls fully — this is where "we control how the editor looks" concentrates. The interaction states follow the "Bold Mono" motion spec: a ring floating `--mat-builder-chrome-ring-offset` outside the block (0px — flush, Figma-style), spring-eased shadows (`--mat-builder-ease-spring`, an overshooting `cubic-bezier(0.34, 1.6, 0.5, 1)`), and a lift-in-place drag treatment. Only ring **color** and shadows transition; the ring width step (1.5px ↔ 2px) and all rect placement switch instantly — crisp, not mushy. All values are tokens in `tokens.css`; the state CSS lives in `styles/chrome.css`.

- **Idle**: nothing rendered around the block.
- **Hovered**: 1.5px ring at `--mat-builder-color-hover` (accent @ 60%) + faint ambient shadow. Deliberately flat — no lift, no scale, no name tag.
- **Selected**: flat Figma-style frame — 2px full-accent ring (the selected shadow token is a zero shadow), four white corner handles centered on the ring's corners (decorative, `--mat-builder-chrome-handle-*` tokens; always mounted, CSS-faded so the hover ⇄ selected morph transitions them), `cursor: grab`, and the label pill (block icon + name — a chip whose type and icon match a layer/palette row: `text-sm`, medium, `size-4` icon, all in rem so it tracks the panels through a root font-size change) popping in above the ring with a 0.25s overshoot spring. Duplicate/delete actions live in the keyboard (`Cmd/Ctrl+D`, `Delete`) and the inspector header, not on the pill. The whole frame is the drag surface, gated off while that block is inline-editing, see 05 §1.
- **Inline editing** (implemented): double-clicking a text area inside a block starts an editing session — `store.editing = { blockId, field }` (`field` scopes it to one prop, so blocks can host several independently editable texts). `startEditing` also selects the block; selecting anything else, starting a drag, removing the block, undo/redo and document loads all clear it (a mounted inline editor must never go stale against the document). While editing, the selection ring stays but the label pill hides — the floating toolbar (mat-ui) takes over, anchored to the live selection's line — following the cursor vertically, centered on the field horizontally (rich text) — or pinned to the label (plain `InlineText`). `editRender` receives `isEditing` and an `update(patch)` (same contract as the inspector's) so blocks wire up `InlineRichText`/`InlineText` declaratively. When the provider has `mergeTags`, both toolbars grow a merge-tag insert menu (chips in rich text, plain token text in `InlineText` — 06 §merge tags). Exit: Escape, or click any other block/empty canvas; builder shortcuts are inert during the session because focus sits in a contentEditable (editable-target guard in the keyboard handler).
- **Dragging** (lift-in-place): grabbing a block **selects it** (native drag never fires click, and the spec's release state is "stays selected"). The source block scales to `--mat-builder-chrome-lift-scale` (1.03) in place with the deep "floating" shadow + 2px ring — the native HTML5 drag means the real block can't follow the pointer, so the pointer is tracked by the custom drag preview (icon + label chip rather than a screenshot — cheap, and consistent between palette and canvas drags). On drop (or cancel) the block springs back to scale 1 over 0.55s with overshoot — the signature landing motion, which replaced the old post-move flash. Dimming is off by default (`--mat-builder-drag-source-opacity: 1`); hosts can restore it via the token.
- **Chrome layering — the dedicated overlay layer (formerly the "escalation path", now implemented)**: all non-root ring/shadow/pill chrome is drawn by `ChromeOverlay`, mounted in the artboard frame's relative wrapper (the Artboard `decoration` slot) — *outside* the rounded `overflow-hidden` scroller, so offset rings and outer shadows never clip, Figma-style. Each chrome frame tracks its block's measured rect via a per-frame rAF loop (`chrome-geometry.ts` is the pure, tested math) writing placement directly to the DOM — one mechanism covers scroll, auto-scroll, artboard resize, content reflow, and the drag lift scale (a transform, invisible to ResizeObserver). Placement is instant; only colors/shadows (CSS transitions) and the pill (`motion/react` `AnimatePresence`) animate. Every frame carries an always-on four-sided `clip-path` bounding its painting to the artboard viewport plus a ring allowance (derived from the live `outline-offset` token): glows never bleed onto the work surface, and the ring of a block scrolled past the fold dies exactly at the sheet boundary instead of dangling as open rails over the frame border. The block wrapper itself only exposes `data-selected`/`data-drag-source` attributes for the lift/cursor CSS — never ring styles, so chrome can't change the block's box and the edit render never drifts from reality. At most two frames exist at once (selected + hovered), so the per-frame measurement is negligible. Frames stack by state — hover, then selected, then dragging (`z-index` on the frame, not on the pill: writing the rect as a `transform` makes every frame its own stacking context, so a pill or handle can never lift above a sibling frame on its own). Otherwise hovering the parent of a selected block draws that parent's ring straight across the child's name tag and handles.
- **Root chrome** stays on the artboard frame itself, drawn by the Canvas (ring + glow with the same spring transition, name tag in the canvas gutter) — selecting the root *is* selecting the artboard. The pill of a non-root block flips inside the block's corner when the block top is within pill-clearance of the *visible* frame top (re-measured every frame, so scrolling a selected block to the top flips its pill live; this also keeps it clear of the frame's top resize handle).
- The chrome radius (`--mat-builder-chrome-radius`, 10px) applies to the chrome frame only — never forced onto the block's own element, since `editRender` is arbitrary consumer content and the canvas must mirror the email output.
- All chrome pieces are themable via the `--mat-builder-*` tokens (ring widths/offset, radius, shadows, easing, durations); a `components`/`classNames` prop on the provider (shadcn-style slot overrides) for replacing the pill/indicators wholesale remains future work. Panels also compress mat-ui's `sm` control scale (32px tall, menu-item radius) so fields match the layer rows; `.mat-builder-compact-controls` (style.css) exposes that same scope as an opt-in class, so host chrome built around exported controls — an app bar with `<UndoRedoButtons>` and its own `TabButtons`, as in the playground — sits flush with the panels instead of a size larger.

### ContainerSlot

Renders one named container of a block:

- Applies the container's layout (`vertical` → flex-col, `horizontal` → flex-row with equal-width `*:flex-1` cells, `grid` → grid with `grid.columns`) *in editor space*. The layout can be resolved per instance from the block's props via `ContainerDef.getLayout` (e.g. the email container's direction toggle), and `ContainerDef.getSlotStyle` can add props-derived styles to the slot (e.g. flex alignment). The block's `editRender` decides where the slot sits; the slot decides how children stack.
- **Empty state**: a dashed placeholder with the container's `placeholder` text (e.g. "Drop content here") — also a full-surface drop target, so empty containers are easy targets.
- Renders drop indicators (line between children, or container highlight for "drop into") during drags.

### Panel anatomy (Palette / LayersPanel / Inspector)

All three panels share the same anatomy so they read as one family: any pinned rows (the Palette's search input, the Inspector's block header) sit above a body that scrolls *internally* (`min-h-0 flex-1 overflow-y-auto`), so pinned content never scrolls away. Panels carry no titled headers of their own — their placement makes their role obvious. Panels also ship without background/border/shadow — the host's `className` decides the chrome (the playground docks them edge-to-edge: white, square-cornered, a single border on the canvas side, palette and layers stacked half-height in one left column).

### Palette

- Pinned search input (sized like the inspector fields); the categorized list scrolls below it.
- Grouped by `category`, fuzzy search over `label` + `keywords`. Items render as list rows styled like the layer tree (32px, menu-item radius, hover background) — tinted icon, label, and a muted grip affordance on the right; category headers are small uppercase muted labels. Each category gets a tint cycled from the `--mat-builder-palette-tint-*` token sets in registry order (icon color only, shared with the layer tree), so colors are consumer-rethemable and stable while searching.
- Each `PaletteItem` is a Pragmatic `draggable` carrying `{ kind: "new-block", blockType }`.
- **Click-to-add** as a complement to drag: clicking inserts into the current selection's nearest accepting container (or root) — good for accessibility and speed.
- Items whose type is accepted nowhere in the current document state could be dimmed (v2 polish).

### Inspector

- Subscribes to `selectedId`. Empty state when nothing is selected (or shows the root/document settings — root is a block, so this is free).
- Header: pinned row with the block icon (colored by its category tint, matching the palette and layer tree), label, and duplicate + delete buttons, closed off by a `Divider`. (An earlier ancestor breadcrumb was dropped — the layers panel and `Escape`-to-parent cover upward navigation.)
- Body: mounts the definition's `inspector` component with `{ id, props, update }` in the scrolling body. `update` shallow-merges and coalesces history (03 §3).
- **Field helpers** are thin wrappers around mat-ui inputs (label + control, builder-flavored layout) so application inspectors are mostly declarative one-liners; anything bespoke is just JSX composed from mat-ui directly. Shipped: `TextField`, `MergeTagTextField` (TextField plus a merge-tag insert menu in the input's button tray — degrades to a plain TextField when the provider has no `mergeTags`; see 06 §merge tags), `TextAreaField`, `RichTextField`, `NumberField` (arrow keys step ±1, Shift+arrow ±10, typed values clamp to min/max; opacity uses this capped 0–100 rather than a slider), `SliderField` (mat-ui `InputRange` with the current value shown at the track end; pass `formatValue` to append units, e.g. `%`/`px`), `SidesField`/`UniformSidesField`/`CornersField` (Figma-style linked side inputs: padding/margin show a left+right and a top+bottom input, border width one input for all sides, radius one input for all corners — each with an expand toggle to per-side/per-corner inputs; linked inputs show "Mix" when their sides differ, and `BorderValue.radius` accepts `number | CornerValues`), `SelectField`, `SegmentedField` (mat-ui `TabButtons` as a segmented control; each option may carry an `Icon` to render icon-only, used for the alignment/fill-type/shadow controls), `ColorField`, `ToggleField`, `FontFamilyField` (searchable select over the email-safe stacks in `style-props/typography.ts`; clear = inherit).
- **`InspectorGroup`** — a named, collapsible section (custom header styled like the palette's category labels: small uppercase muted text with a rotating chevron). Collapse state is local, so it resets when the selection changes — accepted for now. Inspectors separate groups with mat-ui `Divider`s; loose (ungrouped) fields sit in a padded `flex flex-col gap-4 px-3 pb-4` wrapper above the first divider.
- **Style groups** (`StyleGroups.*`) — reusable property sets built on `InspectorGroup`: `SizeGroup`, `BackgroundGroup`, `BorderGroup`, `SpacingGroup`, `EffectsGroup`, `LayoutGroup`, `TypographyGroup`. Each edits one object-valued prop and always emits the complete next object (see 03 §Style props). Groups with natural subsets take a `fields` filter (e.g. `<SpacingGroup fields={["margin"]} />`).
- Keyed by `selectedId` so switching blocks remounts the form (no stale local state).

### LayersPanel

- The tree scrolls internally (the scroller is the focus/keyboard + DnD auto-scroll target).
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
- `Escape` walks up: child → parent → … → root → none. The layers panel covers the same need with the mouse.
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

1. **Add a block**: drag from palette → indicators show valid insert positions → drop → block created with `defaultProps`, selected, inspector opens → selected chrome + pill pop in at the new block.
2. **Configure**: select block → inspector shows its form → edits apply live to the canvas (single undo step per burst).
3. **Restructure**: grab a block on canvas (selects + lifts it) or drag its row (layers panel) → move/reparent → spring-settle at the destination with the selected chrome reattached.
4. **Navigate deep trees**: layers panel + `Escape`-to-parent cover the "select the section, not the text inside it" problem.
5. **Preview & export**: toolbar toggle → real rendered output; export handled by the application layer (06).

### Feedback details worth specifying up front

- Drop indicators: 2 px accent line between siblings (with the container's gap respected), ring highlight for "into this container", warning tint when hovering an invalid target (blocked rather than hidden — users learn the rules).
- Landing feedback after insert/move is the lift spring-back + selected chrome/pill entrance (the old `triggerPostMoveFlash` was removed with it — double feedback fought the accent chrome); screen-reader announcements via Pragmatic's live-region package ("Heading moved into Left column, position 2 of 3").
- Invalid drops simply animate the drag preview back; the document never enters an invalid state because validation happens in `canDrop`/command layer, not after.
