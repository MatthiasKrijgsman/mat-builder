import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { extractInstruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item";
import { canDropAt } from "../core/commands.ts";
import { findLocation } from "../core/traversal.ts";
import type { BlockRegistry } from "../core/registry.ts";
import type { BlockId, BlockLocation, BuilderDocument } from "../core/types.ts";
import type { BuilderDropTargetData } from "./drag-data.ts";

/** The store's DragState and the branded drag payloads both satisfy this. */
export type DragLike = { kind: "new-block"; blockType: string } | { kind: "move-block"; blockId: BlockId };

/*
 * Drop resolution — see docs/05-drag-and-drop.md §4.
 *
 * Turns the innermost drop target's data into a BlockLocation. Sibling and
 * layer-row indexes are expressed in PRE-move coordinates (the dragged block
 * still in place) — exactly what `moveBlock` expects; it owns the
 * same-container adjustment, so no `getReorderDestinationIndex` here.
 */

export function resolveDropLocation(
    document: BuilderDocument,
    registry: BlockRegistry,
    target: BuilderDropTargetData,
    drag?: DragLike,
): BlockLocation | null {
    switch (target.targetKind) {
        case "container": {
            const parent = document.blocks[target.parentId];
            if (!parent) return null;
            return {
                parentId: target.parentId,
                container: target.container,
                index: (parent.children[target.container] ?? []).length,
            };
        }
        case "sibling": {
            // Recompute the location at drop time — mid-drag document changes
            // (or stale indexes) must not corrupt the drop.
            const location = findLocation(document, target.blockId);
            if (!location) return null;
            const edge = extractClosestEdge(target);
            const after = edge === "bottom" || edge === "right";
            return { ...location, index: location.index + (after ? 1 : 0) };
        }
        case "layer-row": {
            const instruction = extractInstruction(target);
            if (!instruction || instruction.blocked) return null;
            if (instruction.operation === "combine") {
                return resolveCombineLocation(document, registry, target.blockId, drag);
            }
            const location = findLocation(document, target.blockId);
            if (!location) return null;
            const after = instruction.operation === "reorder-after";
            return { ...location, index: location.index + (after ? 1 : 0) };
        }
    }
}

/**
 * "Make child of this row": append to the row's first container that accepts
 * the drag (or the plain first container when no drag is given).
 */
export function resolveCombineLocation(
    document: BuilderDocument,
    registry: BlockRegistry,
    parentId: BlockId,
    drag?: DragLike,
): BlockLocation | null {
    const parent = document.blocks[parentId];
    const containers = parent && registry.getDefinition(parent.type)?.containers;
    if (!parent || !containers || containers.length === 0) return null;

    const type = drag ? dragBlockType(document, drag) : null;
    const movingId = drag?.kind === "move-block" ? drag.blockId : undefined;
    for (const container of containers) {
        const at = { parentId, container: container.name, index: (parent.children[container.name] ?? []).length };
        if (!type || canDropAt(document, registry, type, at, movingId)) return at;
    }
    return null;
}

/** The block type a drag would place — palette type, or the moved node's type. */
export function dragBlockType(document: BuilderDocument, drag: DragLike): string | null {
    if (drag.kind === "new-block") return drag.blockType;
    return document.blocks[drag.blockId]?.type ?? null;
}
