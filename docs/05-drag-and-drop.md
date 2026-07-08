# 05 — Drag and Drop (Pragmatic drag and drop)

Verified against the library as of 2026-07 (core `@atlaskit/pragmatic-drag-and-drop` 2.0.1). Pragmatic DnD is a good fit: headless (zero rendering — all visuals stay ours), tiny core (~4.7 kB), framework-agnostic, built on native HTML5 DnD, battle-tested in Trello/Jira/Confluence.

## Packages

| Package | Use |
|---|---|
| `@atlaskit/pragmatic-drag-and-drop` | core: `draggable`, `dropTargetForElements`, `monitorForElements`, `combine` |
| `@atlaskit/pragmatic-drag-and-drop-hitbox` | drop-position math: `closest-edge` (lists/grids), `list-item` (tree rows — the current recommendation; the older `tree-item` instruction API is legacy) |
| `@atlaskit/pragmatic-drag-and-drop-react-drop-indicator` | indicator components (`box`, `list-item`, `group`, `border`) — we'll likely restyle/re-implement these to match our theme, they're small |
| `@atlaskit/pragmatic-drag-and-drop-auto-scroll` | edge auto-scrolling for canvas + layers panel |
| `@atlaskit/pragmatic-drag-and-drop-live-region` | screen-reader announcements |
| `@atlaskit/pragmatic-drag-and-drop-unit-testing` | jsdom drag simulation for tests |

Everything binds in `useEffect` with `combine(...)` cleanups; per-file imports keep the bundle minimal.

## 1. Scoping & source data

Multiple builder instances can coexist on a page (and other DnD features may too), so every piece of drag data is branded with a per-provider `instanceId` (a `Symbol` created in `BuilderProvider`):

```ts
type DragPayload =
  | { instanceId: symbol; kind: "new-block";  blockType: string }   // palette
  | { instanceId: symbol; kind: "move-block"; blockId: BlockId };   // canvas or layers
```

- The move payload carries only the `blockId` — the source location is recomputed at drop time (`findLocation`), so mid-drag document changes can't corrupt a drop.
- Palette items: `draggable({ getInitialData: () => ({ instanceId, kind: "new-block", blockType }) })`. The palette item itself never moves — a new node is created on drop.
- Canvas blocks: the whole `BlockFrame` element is the `draggable`. Inline text editing (see 06) is protected by a live `canDrag` check — while a block is the active editing target (`store.editing`), its draggable refuses to start, so dragging across text selects text instead of moving the block; it is draggable again the moment the session ends. `canDrag` also honors the definition's `canDrag` and always blocks the root.
- Layer rows: a second `draggable` for the same block id — identical payload, so drops resolve uniformly.

Type-guard helpers (`isBuilderDrag(data, instanceId)`) gate every `canDrop`/`canMonitor`.

## 2. Drop targets — two kinds

### a) Sibling targets (each rendered block)

Every `BlockFrame` is a drop target that resolves to "insert **before or after me** in my parent container", using the `closest-edge` hitbox. The parent container's `layout` picks the edges:

```ts
dropTargetForElements({
  element: frameEl,
  canDrop: ({ source }) => isBuilderDrag(source.data, instanceId)
    && wouldAccept(source.data, parentLocation)     // accepts-rule + cycle check, see §3
  getIsSticky: () => true,                          // hold selection across gaps between blocks
  getData: ({ input, element }) =>
    attachClosestEdge({ targetKind: "sibling", blockId, parentId, container, index },
      { input, element, allowedEdges }),
  // vertical container → ['top','bottom']; horizontal → ['left','right']; grid → all four
  onDrag/onDragEnter: ({ self }) => setEdge(extractClosestEdge(self.data)),  // local state → indicator
  onDragLeave/onDrop: () => setEdge(null),
});
```

### b) Container targets (each `ContainerSlot`)

Every container slot is a drop target that resolves to "insert **into me**" (at the end, or as the only child when empty). This is what makes empty containers droppable and gives a forgiving "drop anywhere in the padding" behavior:

```ts
dropTargetForElements({
  element: slotEl,
  canDrop: ({ source }) => isBuilderDrag(source.data, instanceId)
    && wouldAccept(source.data, { parentId: blockId, container: name }),
  getIsSticky: () => false,                         // per Atlassian's tree example — avoids stale container highlights
  getData: () => ({ targetKind: "container", parentId: blockId, container: name }),
});
```

Drop targets nest naturally (block → column slot → section frame → root slot …); Pragmatic reports them innermost-first, which is exactly the priority we want: a precise edge hit on a block beats its surrounding container.

**Layers panel rows** use the `list-item` hitbox instead (Atlassian's current recommendation for trees — the legacy `tree-item` instruction API still ships but is de-emphasized). It gives `reorder-before` / `reorder-after` / `combine` zones per row; `combine` = "make child of this row" (only offered when the row's block has a container that accepts the dragged type — pick its first accepting container, or its single container in the common case). Group targets on each row's children region handle "drop into this subtree" like the official tree example.

## 3. Validation (`wouldAccept`)

One pure core function used by every `canDrop` and re-checked by `moveBlock`/`insertBlock` (commands are the source of truth; `canDrop` is UX):

1. Target container's `accepts` allows the dragged block type (for `new-block`: the palette type; for `move-block`: the node's type).
2. `maxChildren` not exceeded (moving within the same container doesn't count against it).
3. No cycles: a block cannot drop into itself or any of its descendants (`isDescendant(doc, dragged, targetParent)`).

Two Pragmatic-specific notes:
- A child target returning `canDrop: false` does **not** shield its parent — the search continues upward. That's the behavior we want: if a Text block can't accept the drag, its column still can.
- Invalid-but-visible feedback (warning-tinted indicator instead of nothing) is done by *allowing* the drop target but attaching `{ blocked: true }` in `getData` and ignoring blocked drops in the monitor — used sparingly (e.g. `maxChildren` reached) since fully invalid targets should just not light up.

## 4. Drop resolution — one monitor

A single `monitorForElements` in `BuilderProvider` owns all mutations (drop targets only render indicators — they never mutate):

```ts
monitorForElements({
  canMonitor: ({ source }) => isBuilderDrag(source.data, instanceId), // checked once at drag start
  onDragStart: ({ source }) => store.setDrag(source.data),
  onDrop: ({ source, location }) => {
    store.setDrag(null);
    const target = location.current.dropTargets[0];    // innermost
    if (!target) return;                               // dropped nowhere → native cancel animation
    const to = resolveLocation(target.data);           // sibling+edge → { parentId, container, index±0/1 }
                                                       // container   → { parentId, container, length }
                                                       // list-item instruction → before/after/combine
    if (source.data.kind === "new-block") editor.insertBlock(source.data.blockType, to);
    else editor.moveBlock(source.data.blockId, to);    // index adjusted for same-container moves
    triggerPostMoveFlash(getElement(to));
    announce(`${label} moved to ${describe(to)}`);
  },
});
```

`resolveDropLocation` (src/dnd/resolve.ts) does **not** need `getReorderDestinationIndex`: it emits pre-move indexes (edge top/left → target's index, bottom/right → index + 1, both measured with the dragged block still in place — exactly what the hitboxes see), and `moveBlock` itself owns the same-container removal adjustment (docs/03 §3). One index convention end to end, one place that adjusts it.

## 5. Indicators & previews

- **Between siblings**: 2 px accent line on the extracted edge, offset by half the container gap (`box` indicator's `gap` prop does exactly this). Orientation follows the container axis.
- **Into container**: ring/tint highlight of the slot (like the `group` indicator). The ring shows whenever the slot is the innermost *container* target: full-strength when the slot itself is the drop ("into me"), softer (`--mat-builder-color-drop-parent`) while a child sibling edge line is the precise target — so the drop's parent container is always visible during a drag.
- **Layers rows**: line before/after with indent, ring for `combine`.
- Indicators mount only while an edge/instruction is present (library performance guidance).
- **Drag preview**: `setCustomNativeDragPreview` rendering a small chip (block icon + label) via `createPortal`, `pointerOutsideOfPreview` offset. Same preview for palette and canvas drags → consistent feel, and avoids photographing large blocks. Known platform limits: previews are centered under the pointer on iOS/Android; avoid CSS `transform` on previews/draggables (WebKit bugs).
- Source block during drag: **lift-in-place** (docs/04 §BlockFrame) — grabbing selects the block, then `data-drag-source` scales it to 1.03 with the deep accent shadow drawn by the chrome overlay; it springs back with overshoot on drop/cancel. Dimming is off by default but restorable via `--mat-builder-drag-source-opacity`. The lift transform is safe against the WebKit preview caveat above: it's applied via the store's `drag` state, which Pragmatic sets *after* the native drag preview has been generated. Drop-target chrome stays suppressed on the source itself and its descendants.

## 6. Auto-scroll

`autoScrollForElements` on the canvas scroll container and the layers panel scroll container (bound alongside their drop targets with `combine`). Long documents + dragging to off-screen positions is the #1 reason DnD feels broken without this.

## 7. Edge cases

| Case | Handling |
|---|---|
| Drop on nothing / `Escape` | no dropTargets → no-op; native cancel animation plays. (Platform can't distinguish cancel vs drop-outside — both are no-ops for us.) |
| Sticky stale edges | sibling targets are sticky (nice between-block gaps); container targets are not (per Atlassian tree example). `isActiveDueToStickiness` available if needed. |
| Dragging a parent over its own children | filtered by the cycle check in `canDrop` → children never light up; the outer valid ancestors still do. |
| Same-position drop | `moveBlock` no-ops (no history entry) when source location == destination. |
| Scroll/virtualized layers panel | Pragmatic supports targets mounting/unmounting mid-drag; fine if we later virtualize. |
| Keyboard-only moving | native DnD isn't keyboard-accessible; Atlassian's own guidance is menu-based alternatives. `moveBlock` is a plain command, so a "Move up/down/into" action menu on `BlockFrame`/`LayerRow` is cheap — v1.5. |
| jsdom tests | `pragmatic-drag-and-drop-unit-testing` polyfills `DragEvent`/`DataTransfer`. |

## 8. Iframe note (future)

We deliberately avoid an iframe canvas (D2), so all DnD is same-window element-adapter — the simple path. If a future builder needs an iframe canvas (e.g. pixel-perfect page builder with isolated CSS): Pragmatic supports parent↔iframe drags via its **external adapter** (`getInitialDataForExternal` with a custom media type on the source; `dropTargetForExternal` inside the iframe), but **only same-origin** in Chrome/Safari, data readable only on drop, and Android quirks. Feasible, documented (official `iframe-board` example), just meaningfully more work — keep canvases same-window unless something forces the issue.
