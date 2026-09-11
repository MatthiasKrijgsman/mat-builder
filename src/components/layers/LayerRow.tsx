import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  attachInstruction,
  type Availability,
  extractInstruction,
  type Instruction,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item";
import { IconChevronRight, IconFilter } from "@tabler/icons-react";
import { type CSSProperties, Fragment, useEffect, useMemo, useRef, useState } from "react";
import { tintByCategory, tintCssVar } from "../palette/tints.ts";
import { canDropAt } from "../../core/commands.ts";
import type { BlockRegistry } from "../../core/registry.ts";
import type { BlockId, BlockLocation, BuilderDocument } from "../../core/types.ts";
import { hasVisibilityRules } from "../../core/visibility.ts";
import { isBuilderDrag, makeMoveBlockDrag } from "../../dnd/drag-data.ts";
import { setChipDragPreview } from "../../dnd/preview.ts";
import { dragBlockType, type DragLike, resolveCombineLocation } from "../../dnd/resolve.ts";
import { scrollBlockIntoView } from "../../react/canvas-scroll.ts";
import { useBuilderContext } from "../../react/context.ts";
import { useBlockNode, useBuilderFeatures, useBuilderState, useLabels } from "../../react/hooks.ts";

/*
 * LayerRow — one tree row (docs/04 §LayersPanel, docs/05 §2). Uses the
 * list-item hitbox (Atlassian's current recommendation for trees):
 * reorder-before / reorder-after / combine zones per row, where combine
 * means "append to this row's first container". Availability is computed
 * from the live drag via the store, and re-checked by the commands on drop.
 */

/** Per-depth indentation, applied as left padding *inside* the row so the
 *  selection highlight always spans the full panel width. */
const INDENT_PX = 16;
/** Base left padding of a row's content (the row's own gutter). */
const ROW_PAD_LEFT = 8;
/** Chevron / spacer / icon glyph box (size-4). Kept equal so leaf and
 *  parent rows align their icons in one column. */
const GLYPH_PX = 16;
/** Flex gap between chevron, icon and label. */
const GAP_PX = 10;

function computeOperations(
  document: BuilderDocument,
  registry: BlockRegistry,
  drag: DragLike,
  rowId: BlockId,
  location: BlockLocation | undefined,
): Record<"reorder-before" | "reorder-after" | "combine", Availability> {
  const type = dragBlockType(document, drag);
  const movingId = drag.kind === "move-block" ? drag.blockId : undefined;
  if (!type || movingId === rowId) {
    return { "reorder-before": "not-available", "reorder-after": "not-available", combine: "not-available" };
  }

  const reorder: Availability =
    location && canDropAt(document, registry, type, location, movingId) ? "available" : "not-available";
  // Drag-aware: picks the first container that accepts this drag (validated inside)
  const combineAvailable: Availability = resolveCombineLocation(document, registry, rowId, drag)
    ? "available"
    : "not-available";
  return { "reorder-before": reorder, "reorder-after": reorder, combine: combineAvailable };
}

export interface LayerRowProps {
  id: BlockId;
  depth: number;
  /** Absent for the root row (not draggable, not reorderable) */
  location?: BlockLocation;
}

export function LayerRow({ id, depth, location }: LayerRowProps) {
  const { store, registry, instanceId, canvasRef } = useBuilderContext();
  const node = useBlockNode(id);
  const actions = useBuilderState((s) => s.actions);
  const isSelected = useBuilderState((s) => s.selectedId === id);
  const isHovered = useBuilderState((s) => s.hoveredId === id);
  const features = useBuilderFeatures();
  const t = useLabels();
  const isExpanded = useBuilderState((s) => s.expanded.has(id));
  const isDragSource = useBuilderState((s) => s.drag?.kind === "move-block" && s.drag.blockId === id);

  const ref = useRef<HTMLDivElement>(null);
  const [ instruction, setInstruction ] = useState<Instruction | null>(null);

  const definition = registry.getDefinition(node?.type ?? "");
  const label = (node && definition?.getDisplayName?.(node.props)) ?? (node && t.blocks[node.type]?.label) ?? definition?.label ?? node?.type ?? "";
  const canDrag = Boolean(location) && definition?.canDrag !== false;

  // Icon tint matches the block's palette tile (shared assignment, ./tints.ts).
  const tintMap = useMemo(() => tintByCategory(registry), [ registry ]);
  const tint = definition ? tintMap.get(definition.category ?? "Blocks") : undefined;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const cleanups = [];
    if (canDrag) {
      cleanups.push(
        draggable({
          element,
          getInitialData: () => makeMoveBlockDrag(instanceId, id),
          onGenerateDragPreview: ({ nativeSetDragImage }) => setChipDragPreview(nativeSetDragImage, label),
        }),
      );
    }
    cleanups.push(
      dropTargetForElements({
        element,
        canDrop: ({ source }) => {
          if (!isBuilderDrag(source.data, instanceId)) return false;
          const { document } = store.getState();
          const operations = computeOperations(document, registry, source.data, id, location);
          return Object.values(operations).some((availability) => availability === "available");
        },
        getData: ({ input, element: el }) => {
          const { document, drag } = store.getState();
          const operations = drag
            ? computeOperations(document, registry, drag, id, location)
            : ({
              "reorder-before": "not-available",
              "reorder-after": "not-available",
              combine: "not-available"
            } as const);
          return attachInstruction({ targetKind: "layer-row", blockId: id }, { input, element: el, operations });
        },
        onDrag: ({ self }) => {
          const next = extractInstruction(self.data);
          setInstruction((current) => (current?.operation === next?.operation ? current : next));
        },
        onDragLeave: () => setInstruction(null),
        onDrop: ({ self }) => {
          setInstruction(null);
          // Dropping into a row reveals what just landed there
          if (extractInstruction(self.data)?.operation === "combine") actions.setExpanded(id, true);
        },
      }),
    );
    return combine(...cleanups);
    // location captured per render; re-binding on its parts is intended
  }, [ store, registry, instanceId, actions, id, canDrag, label, location?.parentId, location?.container, location?.index ]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!node) return null;

  const childEntries = Object.entries(node.children).filter(([ , ids ]) => ids.length > 0);
  const hasChildren = childEntries.length > 0;
  const Icon = definition?.icon;
  const isRoot = !location;

  // Selection highlight fills the full row width; depth lives inside as padding
  // so a nested selected row still reads edge-to-edge.
  const rowStyle: CSSProperties = {
    paddingLeft: ROW_PAD_LEFT + depth * INDENT_PX,
    ...(isSelected
      ? { backgroundColor: "var(--mat-builder-color-layer-row-selected-bg)" }
      : isHovered
        ? { backgroundColor: "var(--mat-builder-color-layer-row-hover-bg)" }
        : undefined),
  };

  const labelColor = isSelected
    ? "var(--mat-builder-color-layer-row-selected-fg)"
    : "var(--mat-builder-color-panel-fg)";
  // Unselected icons take the same tint as their palette tile; blocks without a
  // tile (root/hidden) fall back to the neutral panel-icon gray.
  const iconColor = isSelected
    ? "var(--mat-builder-color-layer-row-selected-fg)"
    : tint
      ? tintCssVar(tint, "fg")
      : "var(--color-input-icon-button-icon)";
  const mutedColor = isSelected
    ? "color-mix(in srgb, var(--mat-builder-color-layer-row-selected-fg) 75%, transparent)"
    : "var(--mat-builder-color-panel-muted-fg)";

  return (
    <div className={ isDragSource ? "mat:opacity-40" : undefined }>
      { /* The row IS the select target: clicking anywhere but the chevron
           selects; the chevron only toggles expansion. */ }
      <div
        ref={ ref }
        data-layer-id={ id }
        role="button"
        aria-selected={ isSelected }
        className="mat:relative mat:my-px mat:flex mat:h-8 mat:cursor-pointer mat:items-center mat:rounded-(--border-radius-menu-item) mat:pr-2 mat:font-normal mat:font-(family-name:--font-family-base) mat:text-sm mat:transition-colors mat:duration-(--control-transition-duration) mat:select-none"
        style={ { ...rowStyle, columnGap: GAP_PX } }
        onClick={ (event) => {
          event.stopPropagation();
          actions.select(id);
          // Picking a row is navigation — bring the block it names into view.
          // Selection only repaints chrome (an overlay), so the block's box is
          // already final and this needs no frame to wait for.
          scrollBlockIntoView(canvasRef.current, id);
        } }
        onPointerOver={ (event) => {
          event.stopPropagation();
          actions.hover(id);
        } }
        onPointerOut={ (event) => {
          event.stopPropagation();
          actions.hover(null);
        } }
      >
        { hasChildren ? (
          <button
            type="button"
            aria-label={ isExpanded ? t.layers.collapse : t.layers.expand }
            className="mat:flex mat:shrink-0 mat:cursor-pointer mat:items-center mat:justify-center mat:bg-transparent mat:p-0"
            style={ { width: GLYPH_PX, height: GLYPH_PX } }
            onClick={ (event) => {
              event.stopPropagation();
              actions.toggleExpanded(id);
            } }
          >
            <IconChevronRight
              className={ `mat:size-4 mat:transition-transform ${ isExpanded ? "mat:rotate-90" : "" }` }
              style={ { color: mutedColor } }
            />
          </button>
        ) : (
          <span className="mat:shrink-0" style={ { width: GLYPH_PX, height: GLYPH_PX } } aria-hidden/>
        ) }
        { Icon && <Icon className="mat:size-4 mat:shrink-0" style={ { color: iconColor } }/> }
        <span className="mat:min-w-0 mat:flex-1 mat:truncate mat:font-medium" style={ { color: labelColor } }>{ label }</span>
        { /* A block that only renders for some recipients looks identical to
             every other one on the canvas — the tree is where that reads. */ }
        { features.visibility && hasVisibilityRules(node.visibility) && (
          <IconFilter
            className="mat:size-3.5 mat:shrink-0"
            style={ { color: isSelected ? mutedColor : "var(--mat-builder-color-conditional-fg)" } }
            aria-label={ t.layers.shownConditionally }
          />
        ) }
        { isRoot && (
          <span className="mat:shrink-0 mat:text-xs mat:mr-1" style={ { color: mutedColor } }>{ t.layers.root }</span>
        ) }
        { instruction && <InstructionIndicator instruction={ instruction } depth={ depth }/> }
      </div>

      { isExpanded &&
        childEntries.map(([ containerName, childIds ]) => (
          <Fragment key={ containerName }>
            { childEntries.length > 1 && (
              <p
                className="mat:py-0.5 mat:text-[10px] mat:font-medium mat:uppercase mat:tracking-wide"
                style={ {
                  paddingLeft: ROW_PAD_LEFT + (depth + 1) * INDENT_PX + GLYPH_PX + GAP_PX,
                  color: "var(--mat-builder-color-panel-muted-fg)",
                  fontFamily: "var(--mat-builder-font-family-eyebrow)",
                } }
              >
                { t.blocks[node.type]?.containers?.[containerName]?.label ?? definition?.containers?.find((c) => c.name === containerName)?.label ?? containerName }
              </p>
            ) }
            { childIds.map((childId, index) => (
              <LayerRow
                key={ childId }
                id={ childId }
                depth={ depth + 1 }
                location={ { parentId: id, container: containerName, index } }
              />
            )) }
          </Fragment>
        )) }
    </div>
  );
}

function InstructionIndicator({ instruction, depth }: { instruction: Instruction; depth: number }) {
  const color = "var(--mat-builder-color-drop-indicator)";
  const thickness = "var(--mat-builder-drop-indicator-thickness)";
  const left = ROW_PAD_LEFT + depth * INDENT_PX;

  if (instruction.operation === "combine") {
    return (
      <div
        className="mat:pointer-events-none mat:absolute mat:inset-0 mat:rounded-(--border-radius-menu-item)"
        style={ { boxShadow: `inset 0 0 0 ${ thickness } ${ color }` } }
      />
    );
  }
  const edge = instruction.operation === "reorder-before" ? { top: `calc(${ thickness } / -2)` } : { bottom: `calc(${ thickness } / -2)` };
  return (
    <div
      className="mat:pointer-events-none mat:absolute mat:z-10 mat:rounded-full"
      style={ { ...edge, left, right: 0, height: thickness, backgroundColor: color } }
    />
  );
}
