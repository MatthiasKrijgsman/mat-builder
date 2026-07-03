import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
    attachClosestEdge,
    extractClosestEdge,
    type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { IconCopy, IconTrash } from "@tabler/icons-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { canDropAt } from "../../core/commands.ts";
import type { BlockId, BlockLocation, ContainerDef } from "../../core/types.ts";
import { isBuilderDrag, makeMoveBlockDrag } from "../../dnd/drag-data.ts";
import { setChipDragPreview } from "../../dnd/preview.ts";
import { dragBlockType } from "../../dnd/resolve.ts";
import { useBuilderContext } from "../../react/context.ts";
import { useBlockNode, useBuilderState } from "../../react/hooks.ts";
import { ContainerSlot } from "./ContainerSlot.tsx";

/*
 * BlockView + chrome — the per-block wrapper (docs/04 §BlockFrame).
 * Selection/hover chrome is an absolutely-positioned overlay SIBLING of the
 * editRender, never wrapper styles on the block itself: the chrome must not
 * change the block's box or the edit render drifts from reality.
 *
 * DnD (docs/05): the whole frame is a draggable (v1 — no inline text editing
 * yet, so no drag handle needed) and a "sibling" drop target resolving to
 * insert-before/after-me via the closest-edge hitbox; the parent container's
 * layout picks the allowed edges. Drop targets only render indicators — the
 * provider's monitor performs the actual mutation.
 */

export interface BlockViewProps {
    id: BlockId;
    /** Where this block sits — absent only for the root (rendered by Canvas) */
    location?: BlockLocation;
    /** Parent container's layout — decides the drop-edge axis */
    layout?: ContainerDef["layout"];
}

export function BlockView({ id, location, layout = "vertical" }: BlockViewProps) {
    const { store, registry, instanceId } = useBuilderContext();
    const node = useBlockNode(id);
    const actions = useBuilderState((s) => s.actions);
    const isSelected = useBuilderState((s) => s.selectedId === id);
    const isHovered = useBuilderState((s) => s.hoveredId === id);
    const isRoot = useBuilderState((s) => s.document.rootId === id);
    const isDragSource = useBuilderState((s) => s.drag?.kind === "move-block" && s.drag.blockId === id);

    const ref = useRef<HTMLDivElement>(null);
    const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

    const definition = registry.getDefinition(node?.type ?? "");
    const label = (node && definition?.getDisplayName?.(node.props)) ?? definition?.label ?? node?.type ?? "";
    const canDrag = Boolean(location) && definition?.canDrag !== false;

    useEffect(() => {
        const element = ref.current;
        if (!element || !location) return; // the root is neither draggable nor a sibling target

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
                onDrag: ({ self }) => {
                    const edge = extractClosestEdge(self.data);
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
            />
        );
    }

    return (
        <div
            ref={ref}
            className={`relative ${isDragSource ? "opacity-40" : ""}`}
            data-block-id={id}
            // stopPropagation everywhere: the innermost block under the pointer wins
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
            {definition ? (
                <definition.editRender id={id} props={node.props} containers={containers} isSelected={isSelected} />
            ) : (
                <MissingBlock type={node.type} />
            )}
            {(isSelected || (isHovered && !isRoot)) && !isDragSource && (
                <BlockChrome
                    label={label}
                    selected={isSelected}
                    onDuplicate={location ? () => actions.duplicateBlock(id) : undefined}
                    onDelete={!isRoot && definition?.canDelete !== false ? () => actions.removeBlock(id) : undefined}
                />
            )}
            {closestEdge && <EdgeIndicator edge={closestEdge} />}
        </div>
    );
}

interface BlockChromeProps {
    label: string;
    selected: boolean;
    onDuplicate?: () => void;
    onDelete?: () => void;
}

/**
 * Selection/hover overlay. When selected, the name tag grows into a small
 * action bar (docs/04 §BlockFrame): label + duplicate + delete. The overlay
 * itself is pointer-transparent; only the bar accepts clicks.
 */
function BlockChrome({ label, selected, onDuplicate, onDelete }: BlockChromeProps) {
    const color = selected ? "var(--mat-builder-color-selection)" : "var(--mat-builder-color-hover)";
    return (
        <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{ boxShadow: `inset 0 0 0 ${selected ? 2 : 1}px ${color}` }}
        >
            {selected && (
                <span
                    className="pointer-events-auto absolute left-0 top-0 flex -translate-y-full items-stretch rounded-t text-[10px] font-medium leading-none"
                    style={{ backgroundColor: color, color: "var(--mat-builder-color-chrome-tag-fg)" }}
                >
                    <span className="px-1.5 py-0.5">{label}</span>
                    {onDuplicate && (
                        <ChromeButton label="Duplicate block" onClick={onDuplicate}>
                            <IconCopy className="size-3" />
                        </ChromeButton>
                    )}
                    {onDelete && (
                        <ChromeButton label="Delete block" onClick={onDelete}>
                            <IconTrash className="size-3" />
                        </ChromeButton>
                    )}
                </span>
            )}
        </div>
    );
}

function ChromeButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className="flex cursor-pointer items-center px-1 hover:bg-white/20"
            onClick={(event) => {
                event.stopPropagation();
                onClick();
            }}
        >
            {children}
        </button>
    );
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
