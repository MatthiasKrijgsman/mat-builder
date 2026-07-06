import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
    attachInstruction,
    extractInstruction,
    type Availability,
    type Instruction,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item";
import { IconChevronRight } from "@tabler/icons-react";
import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { canDropAt } from "../../core/commands.ts";
import type { BlockRegistry } from "../../core/registry.ts";
import type { BlockId, BlockLocation, BuilderDocument } from "../../core/types.ts";
import { isBuilderDrag, makeMoveBlockDrag } from "../../dnd/drag-data.ts";
import { setChipDragPreview } from "../../dnd/preview.ts";
import { dragBlockType, resolveCombineLocation, type DragLike } from "../../dnd/resolve.ts";
import { useBuilderContext } from "../../react/context.ts";
import { useBlockNode, useBuilderState } from "../../react/hooks.ts";

/*
 * LayerRow — one tree row (docs/04 §LayersPanel, docs/05 §2). Uses the
 * list-item hitbox (Atlassian's current recommendation for trees):
 * reorder-before / reorder-after / combine zones per row, where combine
 * means "append to this row's first container". Availability is computed
 * from the live drag via the store, and re-checked by the commands on drop.
 */

const INDENT_PX = 14;
const ROW_BASE_PADDING = 6;

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
    const { store, registry, instanceId } = useBuilderContext();
    const node = useBlockNode(id);
    const actions = useBuilderState((s) => s.actions);
    const isSelected = useBuilderState((s) => s.selectedId === id);
    const isHovered = useBuilderState((s) => s.hoveredId === id);
    const isExpanded = useBuilderState((s) => s.expanded.has(id));
    const isDragSource = useBuilderState((s) => s.drag?.kind === "move-block" && s.drag.blockId === id);

    const ref = useRef<HTMLDivElement>(null);
    const [instruction, setInstruction] = useState<Instruction | null>(null);

    const definition = registry.getDefinition(node?.type ?? "");
    const label = (node && definition?.getDisplayName?.(node.props)) ?? definition?.label ?? node?.type ?? "";
    const canDrag = Boolean(location) && definition?.canDrag !== false;

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
                        : ({ "reorder-before": "not-available", "reorder-after": "not-available", combine: "not-available" } as const);
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
    }, [store, registry, instanceId, actions, id, canDrag, label, location?.parentId, location?.container, location?.index]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!node) return null;

    const childEntries = Object.entries(node.children).filter(([, ids]) => ids.length > 0);
    const hasChildren = childEntries.length > 0;
    const Icon = definition?.icon;

    const rowBackground: CSSProperties | undefined = isSelected
        ? { backgroundColor: "color-mix(in srgb, var(--mat-builder-color-selection) 15%, transparent)" }
        : isHovered
          ? { backgroundColor: "color-mix(in srgb, var(--mat-builder-color-selection) 7%, transparent)" }
          : undefined;

    return (
        <div className={isDragSource ? "opacity-40" : undefined}>
            <div
                ref={ref}
                data-layer-id={id}
                className="relative flex cursor-pointer items-center gap-2 rounded-lg py-2 pr-3 font-medium select-none"
                style={{ paddingLeft: ROW_BASE_PADDING + depth * INDENT_PX, ...rowBackground }}
                onClick={(event) => {
                    event.stopPropagation();
                    actions.select(id);
                }}
                onPointerOver={(event) => {
                    event.stopPropagation();
                    actions.hover(id);
                }}
                onPointerOut={(event) => {
                    event.stopPropagation();
                    actions.hover(null);
                }}
            >
                {hasChildren ? (
                    <button
                        type="button"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                        className="flex size-4 shrink-0 items-center justify-center rounded hover:bg-black/5"
                        onClick={(event) => {
                            event.stopPropagation();
                            actions.toggleExpanded(id);
                        }}
                    >
                        <IconChevronRight
                            className={`size-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        />
                    </button>
                ) : (
                    <span className="size-4 shrink-0" />
                )}
                {Icon && <Icon className="size-4 text-stone-400 shrink-0" />}
                <span className="truncate">{label}</span>
                {instruction && <InstructionIndicator instruction={instruction} depth={depth} />}
            </div>

            {isExpanded &&
                childEntries.map(([containerName, childIds]) => (
                    <Fragment key={containerName}>
                        {childEntries.length > 1 && (
                            <p
                                className="py-0.5 text-[10px] font-medium uppercase tracking-wide"
                                style={{
                                    paddingLeft: ROW_BASE_PADDING + (depth + 1) * INDENT_PX,
                                    color: "var(--mat-builder-color-panel-muted-fg)",
                                }}
                            >
                                {definition?.containers?.find((c) => c.name === containerName)?.label ?? containerName}
                            </p>
                        )}
                        {childIds.map((childId, index) => (
                            <LayerRow
                                key={childId}
                                id={childId}
                                depth={depth + 1}
                                location={{ parentId: id, container: containerName, index }}
                            />
                        ))}
                    </Fragment>
                ))}
        </div>
    );
}

function InstructionIndicator({ instruction, depth }: { instruction: Instruction; depth: number }) {
    const color = "var(--mat-builder-color-drop-indicator)";
    const thickness = "var(--mat-builder-drop-indicator-thickness)";
    const left = ROW_BASE_PADDING + depth * INDENT_PX;

    if (instruction.operation === "combine") {
        return (
            <div
                className="pointer-events-none absolute inset-0 rounded"
                style={{ boxShadow: `inset 0 0 0 ${thickness} ${color}` }}
            />
        );
    }
    const edge = instruction.operation === "reorder-before" ? { top: `calc(${thickness} / -2)` } : { bottom: `calc(${thickness} / -2)` };
    return (
        <div
            className="pointer-events-none absolute z-10 rounded-full"
            style={{ ...edge, left, right: 0, height: thickness, backgroundColor: color }}
        />
    );
}
