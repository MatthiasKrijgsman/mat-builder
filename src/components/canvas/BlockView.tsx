import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
    attachClosestEdge,
    extractClosestEdge,
    type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { canDropAt } from "../../core/commands.ts";
import { descendGroup, groupSelectionTarget, isDragReachable, type GroupContext } from "../../core/selection.ts";
import { isDescendant } from "../../core/traversal.ts";
import type { BlockId, BlockLocation, ContainerDef } from "../../core/types.ts";
import { isBuilderDrag, makeMoveBlockDrag } from "../../dnd/drag-data.ts";
import { setChipDragPreview } from "../../dnd/preview.ts";
import { dragBlockType } from "../../dnd/resolve.ts";
import { useBuilderContext } from "../../react/context.ts";
import { useBlockNode, useBuilderState } from "../../react/hooks.ts";
import { pressStartedInInlineEditor } from "../inline/focus.ts";
import { ContainerSlot } from "./ContainerSlot.tsx";

/*
 * BlockView — the per-block wrapper (docs/04 §BlockFrame).
 * Selection/hover chrome (ring, shadows, label pill) is NOT rendered here: it
 * lives in the ChromeOverlay layer above the artboard, drawn from measured
 * rects, so it never clips against the rounded overflow-hidden frame and
 * never changes the block's box (or the edit render drifts from reality).
 * The wrapper only exposes state via data attributes — chrome.css uses them
 * for the lift-in-place drag treatment (scale on the real block) and cursors.
 *
 * DnD (docs/05): the whole frame is a draggable (v1 — no inline text editing
 * yet, so no drag handle needed) and a "sibling" drop target resolving to
 * insert-before/after-me via the closest-edge hitbox; the parent container's
 * layout picks the allowed edges. Drop targets only render indicators — the
 * provider's monitor performs the actual mutation.
 *
 * The wrapper is a `<div>` unless the definition sets `wrapperAs` (blocks that
 * ARE table structure need `<tr>`/`<td>` — see CanvasTag), and `getWrapperProps`
 * lets such a block style that element, since it has no inner box to style.
 */

export interface BlockViewProps {
    id: BlockId;
    /** Where this block sits — absent only for the root (rendered by Canvas) */
    location?: BlockLocation;
    /** Parent container's layout — decides the drop-edge axis */
    layout?: ContainerDef["layout"];
    /** The enclosing `selectsAsGroup` block, threaded down the tree (core/selection.ts) */
    group?: GroupContext;
}

export function BlockView({ id, location, layout = "vertical", group }: BlockViewProps) {
    const { store, registry, instanceId } = useBuilderContext();
    const node = useBlockNode(id);
    const actions = useBuilderState((s) => s.actions);
    const isSelected = useBuilderState((s) => s.selectedId === id);
    const isRoot = useBuilderState((s) => s.document.rootId === id);
    const isDragSource = useBuilderState((s) => s.drag?.kind === "move-block" && s.drag.blockId === id);
    const isEditing = useBuilderState((s) => s.editing?.blockId === id);

    const update = useCallback((patch: Record<string, unknown>) => actions.updateProps(id, patch), [actions, id]);

    const ref = useRef<HTMLElement>(null);
    const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

    const definition = registry.getDefinition(node?.type ?? "");
    const label = (node && definition?.getDisplayName?.(node.props)) ?? definition?.label ?? node?.type ?? "";

    // Group selection (core/selection.ts). A group root asks whether the
    // selection is inside it — derived to a BOOLEAN so the ancestor walk only
    // re-renders this subtree when the group is entered or left, not on every
    // selection change. Non-group blocks short-circuit to false.
    const isGroupRoot = definition?.selectsAsGroup === true;
    const groupEntered = useBuilderState((s) => {
        if (!isGroupRoot) return false;
        const selected = s.selectedId;
        return selected === id || (selected !== null && isDescendant(s.document, id, selected));
    });
    const childGroup = descendGroup(group, id, isGroupRoot, groupEntered);
    // Clicking, hovering and dragging all resolve through the same rule.
    const selectionTarget = groupSelectionTarget(id, group);
    const canDrag = Boolean(location) && definition?.canDrag !== false && isDragReachable(id, group);

    useEffect(() => {
        const element = ref.current;
        if (!element || !location) return; // the root is neither draggable nor a sibling target

        const cleanups = [];
        if (canDrag) {
            cleanups.push(
                draggable({
                    element,
                    // Inline editing owns the pointer (text selection) — checked
                    // live at drag start so no effect re-run is needed
                    canDrag: () => store.getState().editing?.blockId !== id,
                    getInitialData: () => makeMoveBlockDrag(instanceId, id),
                    onGenerateDragPreview: ({ nativeSetDragImage }) => setChipDragPreview(nativeSetDragImage, label),
                }),
            );
        }

        const allowedEdges: Edge[] =
            layout === "horizontal" ? ["left", "right"]
            : layout === "grid" ? ["top", "bottom", "left", "right"]
            : ["top", "bottom"];

        cleanups.push(
            dropTargetForElements({
                element,
                canDrop: ({ source }) => {
                    if (!isBuilderDrag(source.data, instanceId)) return false;
                    // The source itself never lights up (its descendants are caught by the cycle check)
                    if (source.data.kind === "move-block" && source.data.blockId === id) return false;
                    const { document } = store.getState();
                    const type = dragBlockType(document, source.data);
                    if (!type) return false;
                    const movingId = source.data.kind === "move-block" ? source.data.blockId : undefined;
                    return canDropAt(document, registry, type, location, movingId);
                },
                getIsSticky: () => true, // hold selection across the gaps between blocks
                getData: ({ input, element: el }) =>
                    attachClosestEdge({ targetKind: "sibling", blockId: id }, { input, element: el, allowedEdges }),
                onDrag: ({ self, location }) => {
                    // Only the INNERMOST target receives the drop (the monitor
                    // takes dropTargets[0]). Every ancestor block is a sibling
                    // target too and would otherwise draw a second line at its
                    // own edge — a line the drop would never honour.
                    const isInnermost = location.current.dropTargets[0]?.element === self.element;
                    const edge = isInnermost ? extractClosestEdge(self.data) : null;
                    setClosestEdge((current) => (current === edge ? current : edge));
                },
                onDragLeave: () => setClosestEdge(null),
                onDrop: () => setClosestEdge(null),
            }),
        );
        return combine(...cleanups);
        // location/label captured per render; re-binding on their change is intended
    }, [store, registry, instanceId, id, canDrag, label, layout, location?.parentId, location?.container, location?.index]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!node) return null;

    const containers: Record<string, ReactNode> = {};
    for (const container of definition?.containers ?? []) {
        containers[container.name] = (
            <ContainerSlot
                key={container.name}
                parentId={id}
                container={container}
                childIds={node.children[container.name] ?? []}
                gap={container.getGap?.(node.props) ?? 0}
                layout={container.getLayout?.(node.props) ?? container.layout}
                slotStyle={container.getSlotStyle?.(node.props)}
                group={childGroup}
            />
        );
    }

    const Wrapper = definition?.wrapperAs ?? "div";
    // Read straight from the store rather than subscribing: a context-styled
    // block re-renders anyway, because any change to an ancestor re-renders
    // this subtree top-down. Subscribing to the whole document here would
    // re-render every block on the canvas on every keystroke.
    const { style: wrapperStyle, ...wrapperAttrs } =
        definition?.getWrapperProps?.(node.props, {
            document: store.getState().document,
            location: location ?? null,
            siblingCount: location
                ? (store.getState().document.blocks[location.parentId]?.children[location.container]?.length ?? 1)
                : 1,
        }) ?? {};
    // Row-group tags take no flow content, so the absolutely-positioned edge
    // indicator (a div) would be hoisted out of the table — they draw the drop
    // edge as an inset shadow on themselves instead.
    const canHostOverlay = !ROW_GROUP_TAGS.has(Wrapper);

    return (
        <Wrapper
            ref={ref as never}
            {...wrapperAttrs}
            style={
                closestEdge && !canHostOverlay
                    ? { ...wrapperStyle, boxShadow: edgeInsetShadow(closestEdge) }
                    : wrapperStyle
            }
            // The root is the page: it stretches to fill the artboard so its background
            // paints the whole frame (taller content still grows and scrolls).
            className={`mat-builder-block relative ${isRoot ? "flex min-h-full flex-col *:grow" : ""}`}
            data-block-id={id}
            data-selected={isSelected && !isRoot ? "" : undefined}
            data-drag-source={isDragSource ? "" : undefined}
            // stopPropagation everywhere: the innermost block under the pointer wins
            onClick={(event) => {
                event.stopPropagation();
                // A text drag released over this block clicks the common
                // ancestor — selecting here would end the editing session
                if (!pressStartedInInlineEditor()) actions.select(selectionTarget);
            }}
            onPointerOver={(event) => {
                event.stopPropagation();
                // Hover the same block a click would select, so the highlight
                // always previews what you are about to get
                actions.hover(selectionTarget);
            }}
            onPointerOut={(event) => {
                event.stopPropagation();
                actions.hover(null);
            }}
        >
            {definition ? (
                <definition.editRender
                    id={id}
                    props={node.props}
                    containers={containers}
                    isSelected={isSelected}
                    isEditing={isEditing}
                    update={update}
                />
            ) : (
                <MissingBlock type={node.type} />
            )}
            {closestEdge && canHostOverlay && <EdgeIndicator edge={closestEdge} />}
        </Wrapper>
    );
}

/** Tags that may only contain `<tr>` (or, for `tr`, only cells) — no overlay div. */
const ROW_GROUP_TAGS = new Set(["tr", "tbody", "thead", "tfoot"]);

/** The drop edge as an inset shadow, for wrappers that can't host the indicator. */
function edgeInsetShadow(edge: Edge): string {
    const thickness = "var(--mat-builder-drop-indicator-thickness)";
    const color = "var(--mat-builder-color-drop-indicator)";
    const offset =
        edge === "top" ? `0 ${thickness}`
        : edge === "bottom" ? `0 calc(-1 * ${thickness})`
        : edge === "left" ? `${thickness} 0`
        : `calc(-1 * ${thickness}) 0`;
    return `inset ${offset} 0 0 ${color}`;
}

/** 2px accent line on the extracted edge — mounted only while an edge is present. */
function EdgeIndicator({ edge }: { edge: Edge }) {
    const thickness = "var(--mat-builder-drop-indicator-thickness)";
    const offset = `calc(${thickness} / -2)`;
    const position =
        edge === "top" ? { top: offset, left: 0, right: 0, height: thickness }
        : edge === "bottom" ? { bottom: offset, left: 0, right: 0, height: thickness }
        : edge === "left" ? { left: offset, top: 0, bottom: 0, width: thickness }
        : { right: offset, top: 0, bottom: 0, width: thickness };
    return (
        <div
            className="pointer-events-none absolute z-20 rounded-full"
            style={{ ...position, backgroundColor: "var(--mat-builder-color-drop-indicator)" }}
        />
    );
}

/** Unknown block types render this instead of crashing (docs/03 §2). */
function MissingBlock({ type }: { type: string }) {
    return (
        <div
            className="rounded border border-dashed p-3 text-xs"
            style={{
                borderColor: "var(--mat-builder-color-missing-border)",
                backgroundColor: "var(--mat-builder-color-missing-bg)",
                color: "var(--mat-builder-color-missing-fg)",
            }}
        >
            Missing block type &ldquo;{type}&rdquo;
        </div>
    );
}
