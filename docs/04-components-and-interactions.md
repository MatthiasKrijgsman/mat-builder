# 04 — Components & Interactions

Two ways in, same parts underneath. **`<BuilderShell>`** (and its email flavour `<EmailBuilder>`, 06) is the assembled editor — provider, docked layout, panels, undo/redo and saving in one component; see [§Shell](#shell) below. Everything it is built from stays individually exported, so the composable route below remains first-class.

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

BuilderShell                       all of the above, assembled + docked + saving
├── ShellTopBar                    named slots: identity · leading · actions · undoRedo · save · trailing
│   └── SaveControls               status line ("Unsaved changes" / "Saving…" / …) + Save button
└── (the panels and canvas above, in the docked layout)
```

### Canvas

- A centered, rounded "artboard" (react-email-preview style) with a fixed, user-resizable size: rounded bars on each edge drag-resize it symmetrically per axis (`artboardWidth`/`artboardHeight` props set the initial size; email default 600 px wide; `"fill"` sizes it to 80% of the surface — and keeps tracking it on window resize — until the user drags a size). The user-dragged size persists in the store (`artboardSize` + `setArtboardSize`), read at mount by every artboard surface — so swapping Canvas ⇄ EmailPreview keeps the frame; `Artboard` itself stays store-free via its `size`/`onSizeChange` props. Content taller than the artboard scrolls *inside* it — the inner scroll container (which is also the DnD auto-scroll target, see 05) is clipped by the rounded frame so corners stay round.
- The frame + dotted work surface is the exported `Artboard` component — shared with preview surfaces (`EmailPreview` renders its iframe in the same frame) and available to hosts for custom surfaces.
- **Mount reveal.** The frame's mount size is provisional — the pre-clamp `"fill"` maximum, or a persisted size that may not fit the current surface — and only becomes real when the mount-time `ResizeObserver` fit lands. So the frame (and its handles/decoration) starts hidden and reveals in the same commit that applies the fitted size: the dotted surface paints immediately, the frame never flashes at the wrong size. The reveal is a `motion/react` zoom-in — opacity over 280 ms (`easeOut`) under a 0.97 → 1 scale over 550 ms on the iOS sheet curve (`[0.32, 0.72, 0, 1]`), so the frame is legible early while the geometry keeps decelerating to rest. No overshoot: a spring that reads as playful on a 100 px pill reads as wobble on a surface this large. `useReducedMotion` drops the scale and keeps the fade. Two supporting details: the reveal is on the frame's relative wrapper, so handles and `decoration` scale *with* the frame rather than sliding against it; and the work surface holds `overflow: hidden` until the fit lands, since the provisional frame would otherwise flash scrollbars — and a scrollbar shrinks `clientWidth`/`clientHeight`, fitting the frame to a surface it's about to stop scrolling.
- Because the work surface is what's measured, an artboard mounted while unrendered (a `display:none` host panel) stays hidden until it's shown and the observer reports — nothing to see either way.
- **Resize handles: target ≠ affordance.** The 40×5 bar is what you see; what takes the cursor and the drag is a transparent 64×22 box centred on it (~7× the area, and the thickness — the axis you have to be precise on — goes 5 px → 22 px). The handle's offset is *derived* from the two, so the bar sits at the same `HANDLE_GAP` off the frame whatever the target's size; keep `thickness/2 + gap` under `ARTBOARD_MARGIN` or the target spills off the surface. The target sits entirely outside the frame edge, so it never swallows clicks on content near the top of the sheet.
- The bar answers the pointer: it swells and darkens on hover, then again — into `--mat-builder-color-resize-handle-active` (the selection colour by default) — for as long as the drag runs. Both states animate `width`/`height` rather than a transform, so the pill keeps true stadium ends instead of stretching its corner radius, on a spring with a hint of overshoot (the ChromePill register). Drag state is tracked explicitly rather than via `whileTap`/`:active`: a resize keeps running while the pointer travels far away from the handle, and a tap/active state would drop the moment it left.
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
- **Chrome layering — the dedicated overlay layer (formerly the "escalation path", now implemented)**: all non-root ring/shadow/pill chrome is drawn by `ChromeOverlay`, mounted in the artboard frame's relative wrapper (the Artboard `decoration` slot) — *outside* the rounded `overflow-hidden` scroller, so offset rings and outer shadows never clip, Figma-style. Each chrome frame tracks its block's measured rect via a per-frame rAF loop (`chrome-geometry.ts` is the pure, tested math) writing placement directly to the DOM — one mechanism covers scroll, auto-scroll, artboard resize, content reflow, and the drag lift scale (a transform, invisible to ResizeObserver). Placement is instant; only colors/shadows (CSS transitions) and the pill (`motion/react` `AnimatePresence`) animate. Every frame carries an always-on four-sided `clip-path` bounding its painting to the artboard viewport: glows never bleed onto the work surface, and the ring of a block scrolled past the fold dies exactly at the sheet boundary instead of dangling as open rails over the frame border. The ring allowance (derived from the live `outline-offset` token) widens that bound **per side, and only where the block's own edge is still inside the viewport** — that slack exists for a ring drawn *around* an edge, so an edge-flush block keeps its full ring and handles, while a block running past the fold has no edge there, just content the sheet cuts. Forgiving the allowance on a cut side (as the first implementation did on all four) painted the rails a few px onto the work surface under the sheet — chrome visibly escaping the artboard while scrolling. The block wrapper itself only exposes `data-selected`/`data-drag-source` attributes for the lift/cursor CSS — never ring styles, so chrome can't change the block's box and the edit render never drifts from reality. At most two frames exist at once (selected + hovered), so the per-frame measurement is negligible. Frames stack by state — hover, then selected, then dragging (`z-index` on the frame, not on the pill: writing the rect as a `transform` makes every frame its own stacking context, so a pill or handle can never lift above a sibling frame on its own). Otherwise hovering the parent of a selected block draws that parent's ring straight across the child's name tag and handles.
- **Conditional badge** (`ConditionalMarkers`): a block with visibility rules (06) carries a small badge in its top-right corner — the only chrome that is **persistent** rather than interaction-driven, because its point is scanning a template for conditional parts without clicking through it. It rides the same overlay layer and the same measured-rect discipline as the rings, with two differences forced by there being one badge per conditional block instead of one frame per interaction state: they share a **single** rAF loop (the container rects and artboard scale are read once per frame, not per badge), and the loop measures the component's **own** stretched box rather than the overlay's ref — a parent's ref attaches *after* its children's layout effects run, so reading the overlay ref there finds null on mount. Placement divides the viewport-space delta back out by the artboard's live scale, since `transform` applies in the badge's own pre-scale space and the artboard is mid-scale while it reveals. The badge is inset far enough to clear the selection handles, so a selected conditional block shows both. Only opacity transitions on it — `transform` is the placement channel, and animating it would spring-lag the badge behind its block on every scroll.
- **Root chrome** stays on the artboard frame itself, drawn by the Canvas (ring + glow with the same spring transition, name tag in the canvas gutter) — selecting the root *is* selecting the artboard. The pill of a non-root block flips **below** the block when its top is within pill-clearance of the *visible* frame top (re-measured every frame, so scrolling a selected block to the top flips its pill live; this also keeps it clear of the frame's top resize handle). Below, not inside: on a short block — a one-line heading at the head of the email — an inside pill lands squarely on the text it's naming, while the flipped one stays outside the ring and reads as the same tag, just anchored to the other edge. It only lands *inside* the top-left corner when neither edge has clearance, i.e. the block spans the whole viewport, where there is nowhere outside the block left to put it (`choosePillPlacement`, chrome-geometry.ts). An inside pill is clamped into the visible region rather than pinned to the block: its offset from the frame top (`pillOffset`, written to `--mat-builder-chrome-pill-offset` by the same rAF loop) grows as the block's top scrolls above the fold, so the pill rides just under the visible frame top instead of leaving with the block's own corner and being cut by the clip-path. The pop-in slides toward whichever edge anchors it, so a flipped pill rises out of the block instead of dropping into it.
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
- **Universal groups** — below the definition's own form the Inspector mounts the groups that belong to **every** block regardless of its definition, currently just `VisibilityGroup` (conditional rendering, 06 §Conditional visibility). It reads the node's `visibility` field, not props, so a consumer's blocks inherit it without changing anything; the root is excluded (a document always renders) and the group hides itself when the provider has no `mergeTags` and the block has no rules, matching how every other merge-tag surface disappears when unconfigured.
- **Field helpers** are thin wrappers around mat-ui inputs (label + control, builder-flavored layout) so application inspectors are mostly declarative one-liners; anything bespoke is just JSX composed from mat-ui directly. Shipped: `TextField`, `MergeTagTextField` (TextField plus a merge-tag insert menu in the input's button tray — degrades to a plain TextField when the provider has no `mergeTags`; see 06 §merge tags), `TextAreaField`, `RichTextField`, `NumberField` (arrow keys step ±1, Shift+arrow ±10, typed values clamp to min/max; opacity uses this capped 0–100 rather than a slider), `SliderField` (mat-ui `InputRange` with the current value shown at the track end; pass `formatValue` to append units, e.g. `%`/`px`), `SidesField`/`UniformSidesField`/`CornersField` (Figma-style linked side inputs: padding/margin show a left+right and a top+bottom input, border width one input for all sides, radius one input for all corners — each with an expand toggle to per-side/per-corner inputs; linked inputs show "Mix" when their sides differ, and `BorderValue.radius` accepts `number | CornerValues`), `SelectField`, `SegmentedField` (mat-ui `TabButtons` as a segmented control; each option may carry an `Icon` to render icon-only, used for the alignment/fill-type/shadow controls), `DimensionField` (the width/height control described under Style groups below — requires builder context, since it measures the canvas), `ColorField`, `ToggleField`, `FontFamilyField` (searchable select over the email-safe stacks in `style-props/typography.ts`; clear = inherit).
- **`InspectorGroup`** — a named, collapsible section (custom header styled like the palette's category labels: small uppercase muted text with a rotating chevron, plus an optional `meta` node at the right for a summary that survives collapsing — the visibility group's "2 rules"). Collapse state is local, so it resets when the selection changes — accepted for now. Inspectors separate groups with mat-ui `Divider`s; loose (ungrouped) fields sit in a padded `flex flex-col gap-4 px-3 pb-4` wrapper above the first divider.
- **Style groups** (`StyleGroups.*`) — reusable property sets built on `InspectorGroup`: `SizeGroup`, `BackgroundGroup`, `BorderGroup`, `SpacingGroup`, `EffectsGroup`, `LayoutGroup`, `TypographyGroup`. Each edits one object-valued prop and always emits the complete next object (see 03 §Style props). Groups with natural subsets take a `fields` filter (e.g. `<SpacingGroup fields={["margin"]} />`), and groups whose fields are closed mode sets take a `modes` filter so a block can drop modes it can't honour (`BackgroundGroup`'s `modes`; `SizeGroup`'s per-axis `widthModes`/`heightModes` — the image offers `heightModes={["fixed","hug"]}`, since a "full" `<img>` height is just auto). A stored mode outside the offered set is left alone: its menu row is absent, so nothing shows as checked until the user picks.
- **`SizeGroup` renders Figma's dimension control**, not mode tabs: `DimensionField` per axis, W and H side by side (a lone axis takes the full row). One always-filled number box with a `W`/`H` prefix and the sizing mode behind a chevron menu on its right edge, each row labeled with what it commits — `Fixed width (552)`, `Fill container`, `Percent (50%)`, `Hug contents`. The number is the axis's actual extent in every mode: fixed/percent read the document, the auto modes read the RENDERED size back off the canvas and show it muted (measured, not authored). Typing pins the axis to fixed, and picking `Fixed` freezes the measurement, so its label is literal. The mode is never a hidden state — there is no second input that appears and disappears.
- **`useRenderedBlockSize(id)`** backs that read-back: it polls the block's canvas DOM per frame (like `ChromeOverlay`'s placement) and returns layout px, or null when no `<Canvas>` is mounted — then the box shows an `Auto` placeholder instead of inventing a number. It measures the element marked `SIZE_BOX_CLASS` inside the block, falling back to the block wrapper. Blocks whose own box is narrower than the space they sit in must mark it (the image's `<img>`, the button's label span, the container's `<section>`) — otherwise "hug" would report the available width rather than the block's own.
- Keyed by `selectedId` so switching blocks remounts the form (no stale local state).

### LayersPanel

- The tree scrolls internally (the scroller is the focus/keyboard + DnD auto-scroll target).
- Tree of `LayerRow`s: expand caret (children present), block icon, label (definition label, or a block-provided `getDisplayName(props)` for nicer labels like the text content's first words), visibility of container names when a block has multiple containers (children grouped under subtle "left / right" headings).
- A block carrying conditional visibility rules (06) gets a filter glyph at the end of its row, matching the canvas badge (§BlockFrame) — a conditional block renders exactly like any other while editing, by design, so the mark is what makes "this only reaches some recipients" legible.
- Selection and hover are **bidirectionally synced** with the canvas (`selectedId` / `hoveredId` in the store; hover in the layers panel outlines the canvas block and vice versa).
- Selecting a row (click or ↑/↓) smooth-scrolls the canvas to the block, and only when it is not already framed — a block you can see is never nudged (`react/canvas-scroll.ts`); selecting on canvas expands + scrolls the tree.
- Rows are draggable/droppable for reorder + reparent (see 05 §4).
- Expand state (`expanded: Set<BlockId>`) lives in the store; newly created parents auto-expand. It is also what `↑`/`↓` walk (§Keyboard): the arrows step row by row through what is expanded, so the tree reads the same to the keyboard as it does on screen.

### Toolbar

Thin bar of independent, individually usable controls: `<UndoRedoButtons />`, `<DeviceWidthSwitch />`, `<PreviewToggle />`, plus a children slot for app-specific actions (Save, Send test email). Ships as a convenience assembly; hosts can build their own from `useEditor()`.

### Shell

`<BuilderShell>` is the whole editor as one component — the layout every consumer was otherwise re-deriving from the playground page. It renders the provider itself, so it is the outermost builder element:

```tsx
<BuilderShell
  blocks={blocks} rootType="email-root"      // rootType starts a blank document
  defaultValue={document}                    // or value/onChange for controlled
  onSave={(doc) => api.save(doc)}            // Save button + ⌘S; autoSaveMs to debounce
  documentName="Aura One launch" title="Email builder" icon={IconMail}
  actions={<Button>Send test</Button>}       // extra top-bar controls (= topBarSlots.actions)
  topBarSlots={{ save: <Publish /> }}        // add to / replace / hide parts of the bar (§Top bar)
  panels={{ layers: false }}                 // any panel can be dropped
  features={{ visibility: false }}           // switch a feature's UI off (06 §Conditional visibility)
  minWidth={900}                             // below this the editor shows a notice instead (768 by default)
  canvas={<EmailPreview />}                  // swap the editing surface
  inspector={<MergeTagValuesPanel />}        // …and the right-hand panel
  className="h-screen"                       // the shell fills its container
/>
```

- **Layout**: one continuous dotted surface (`dottedSurface`, exported with `dockedPanel`/`transparentSurface` from the same module) with the top bar in flow above a work area, palette + layers docked left, inspector docked right, canvas between them. Hiding a side panel gives its width back to the canvas; `collapseLeftPanel` does the same as an animation instead — the palette/layers column slides out to the left, still mounted (so its state survives), while the canvas edge follows it (06 §Preview mode). `canvas` and `inspector` each replace their slot's default component — the pair is how `<EmailBuilder>` swaps both surfaces on the mode toggle (06 §Preview mode) while the panels, top bar and saving stay put. `topBar={false}` (or a node) replaces the bar for hosts bringing their own header.
- **Document**: `value`/`defaultValue` exactly as the provider takes them; with neither, `rootType` seeds a blank document through `createDocument` (the root's `onCreate` fills it).
- **Small screens**: the three-panel layout has no usable form below roughly 768px — two 300px columns leave no canvas. Rather than squeeze, the shell measures its own box (a `ResizeObserver` on the root, so an embedded editor is judged by the space it actually has, not the viewport) and below `minWidth` covers the editor with `smallScreenNotice` (a short default message), marking the layout `inert` so it leaves the tab order and the accessibility tree. The editor stays mounted underneath: nothing is lost by resizing across the threshold. `minWidth={0}` disables the guard for a host that has its own.
- **Features**: `features` (also on the provider) switches a feature's UI off without touching documents — today only `visibility` (06 §Conditional visibility). It is provider configuration like `mergeTags`, read through `useBuilderFeatures()`; the store holds it resolved, so every switch reads as a boolean.
- **Labels**: `labels` (also on the provider) is any subset of `DEFAULT_LABELS` — every string in the chrome, grouped by surface — deep-merged over the English and read through `useLabels()` (07 §B3). What `defineBlock` names (block labels, categories, container placeholders) is data, so it is overridden by type and category name and resolved at the display sites. The one string outside the provider, the shell boundary's fallback heading, is resolved from the prop directly.
- **Blocks**: the shell takes a final list. The presets' wrappers (`<EmailBuilder blocks={…}>`) merge host definitions into the preset with `mergeBlockDefinitions` — same `type` replaces in place, new types append — because `createRegistry` throws on duplicates.
- **Top bar** — three levels of control, matching the ladder in 07. The bar is a fixed sequence of named slots, `identity · leading ··· actions · undoRedo · save · trailing` (`ShellTopBarSlots`); `topBarSlots` on the shell (and `<EmailBuilder>`) fills them. *Add:* `topBarSlots={{ trailing: <HelpMenu /> }}` — `leading` and `trailing` are empty by default, `actions` is where `actions` already went. *Replace or hide:* `topBarSlots={{ save: <PublishButton />, undoRedo: false }}` — a slot renders its default when omitted, nothing for `false`/`null`, the node otherwise. *Bring your own:* `topBar={<MyBar />}` replaces the bar; everything the built-in one is made of is exported (`ShellTopBar` itself takes `slots`, `SaveControls`, `UndoRedoButtons`, `dockedPanel`), and **`useShellSave()`** hands any component inside the shell the save controller — status, `dirty`, `save()` — so a replacement bar or a custom Publish button keeps the built-in saving (manual save, ⌘S, autosave, the unload guard) instead of losing it. Order is deliberately not configurable: a host that needs a different order is at level three, where it owns the markup. `<EmailBuilder>` keeps its Edit/Preview toggle at the head of `actions` whichever way the host fills that slot; a host that wants it elsewhere drives `mode` itself and passes `showModeToggle={false}`.
- **Saving** (`useDocumentSave`, exported for custom layouts): host state, deliberately **not** in the editor store, and driven by the provider's `onChange` rather than by watching the document. That is what makes an external `value` replacement land clean: `onChange` fires only for committed user commands, while a document loaded from the server is already saved. `onSave` gets the document; hosts needing HTML call `renderEmail` themselves (`./email/render`) — the shell never renders output on the save path. Manual save is a Save button plus ⌘/Ctrl+S (bound on the window, so it beats the browser's own save dialog from anywhere in the app); `autoSaveMs` adds debounced background saves on top. Status runs `idle → dirty → saving → saved`, a rejected `onSave` shows "Save failed" and leaves the edits pending so the button is the retry, and unsaved edits arm a `beforeunload` guard. Wording is overridable (`saveLabels`) for non-English hosts.

## Interaction model

### Selection

- Click a block on canvas → select (innermost block under the pointer; clicks don't bubble-select parents).
- `Escape` walks up: child → parent → … → root → none. The layers panel covers the same need with the mouse.
- Selection survives prop edits and is restored by undo (history entries store `selectedId`).

**Group selection** (`BlockDefinition.selectsAsGroup`, logic in `src/core/selection.ts`). A composite block whose parts are themselves blocks — the table, whose rows and cells are blocks — breaks the rule above: its parts cover its entire area, so the innermost-wins click means the composite can only be selected in the layers tree, and can never be dragged at all, since the cell's own draggable captures the gesture. A block marked `selectsAsGroup` therefore behaves as ONE unit until entered (Figma's group model):

| | Group not entered | Group entered (selection is the group or inside it) |
|---|---|---|
| Click / hover a descendant | targets the group | targets the actual block under the pointer |
| Drag from a descendant | moves the group | moves that row / cell |
| Drop into a descendant | allowed | allowed |

So anything inside is two clicks away, `Escape` walks back out, and the invariant is "**you can drag exactly what a click would select**" — `groupSelectionTarget` drives the click handler, the hover handler and the draggable registration alike.

Two implementation notes. Drag locking works by **not registering** the descendant draggable, so the browser's own dragstart lookup walks up to the group's wrapper; refusing through Pragmatic's `canDrag` would instead `preventDefault()` the dragstart and cancel the gesture outright. And the group is threaded **down** the render tree (`BlockView` → `ContainerSlot` → `BlockView`) rather than derived by walking up per block, because an ancestor walk is O(document) and would run for every block on every store change — only a group root does that walk, and only to derive the `entered` boolean.

### Keyboard (active when focus is inside the builder)

Implemented as a shared `onKeyDown` handler (`useBuilderKeyboard`, internal) that focusable builder surfaces attach — the Canvas today, the LayersPanel when it lands. The Canvas is `tabIndex={-1}` so clicking it (or any block) focuses it natively. Editable targets (inspector inputs) are skipped entirely: `Cmd/Ctrl+Z` inside a field stays the field's own text undo.

| Key | Action |
|---|---|
| `Cmd/Ctrl+Z` / `Shift+Cmd/Ctrl+Z` | undo / redo |
| `Delete` / `Backspace` | remove selected block (respects `canDelete`) |
| `Cmd/Ctrl+D` | duplicate selected |
| `Escape` | select parent / clear selection |
| `↑` / `↓` | **layers**: previous / next *visible row*; **canvas**: previous / next sibling (no selection, either surface: selects the root) |
| `←` / `→` | collapse / expand the selected block (layers panel surface only) |
| `Alt+↑` / `Alt+↓` | **move** the selected block before its previous / after its next sibling |
| `Alt+←` | move the selected block **out** of its parent — it lands right after the parent |
| `Alt+→` | move the selected block **into** the previous sibling — its first container, last place |

All of the above are implemented in `useBuilderKeyboard` (internal). The four `Alt` moves are the keyboard's drag and drop (`moveTargetFor`, `src/react/keyboard-move.ts`): the same `moveBlock` command the pointer ends in, gated by the same `canDropAt`, so a container that refuses a type by drag refuses it by key too, and a move that does not exist is a no-op rather than a fallthrough to selection. Both surfaces bind them; the selection follows the block.

The two readings of `↑`/`↓` are the two mental models the surfaces actually have. On the canvas, arrows stay at one level (Figma's model — `Escape` is how you go up), because a keypress that silently changed nesting depth would move the selection ring somewhere the eye can't predict. The layers panel is a tree widget, and the row under the cursor is the unit there: `↑`/`↓` step through the rows on screen, crossing in and out of nesting levels and skipping whatever a collapsed row is hiding (`visibleLayerRows` / `adjacentVisibleRow` in `src/react/layer-tree.ts`, ordered by the same `walkDocument` pass `LayerRow` renders with). Sibling-only navigation read as a dead key in the tree: most blocks in a real document are an only child or the last of their group, so ↓ did nothing far more often than it did anything. Neither direction wraps, and a selection whose row is hidden — collapse an ancestor while a descendant is selected — steps from the nearest visible ancestor, the row standing in for it on screen.

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
