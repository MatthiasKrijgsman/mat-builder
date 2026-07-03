import type { BlockId } from "../core/types.ts";

/*
 * Drag payloads & drop-target data — see docs/05-drag-and-drop.md §1-2.
 *
 * Every piece of drag data is branded with the provider's per-instance
 * `instanceId` symbol so multiple builders (and unrelated DnD features) on
 * one page never react to each other's drags. Type-guard helpers gate every
 * canDrop / canMonitor.
 */

/** A drag from the palette — a new node is created on drop. */
export interface NewBlockDrag {
    instanceId: symbol;
    kind: "new-block";
    blockType: string;
    [key: string | symbol]: unknown;
}

/** A drag of an existing block — from the canvas or a layers row. */
export interface MoveBlockDrag {
    instanceId: symbol;
    kind: "move-block";
    blockId: BlockId;
    [key: string | symbol]: unknown;
}

export type BuilderDrag = NewBlockDrag | MoveBlockDrag;

export function makeNewBlockDrag(instanceId: symbol, blockType: string): NewBlockDrag {
    return { instanceId, kind: "new-block", blockType };
}

export function makeMoveBlockDrag(instanceId: symbol, blockId: BlockId): MoveBlockDrag {
    return { instanceId, kind: "move-block", blockId };
}

export function isBuilderDrag(data: Record<string | symbol, unknown>, instanceId: symbol): data is BuilderDrag {
    return data.instanceId === instanceId && (data.kind === "new-block" || data.kind === "move-block");
}

/* ─────────────────────────────────────────────────────────────
 * Drop-target data (attached via getData on each target)
 * ───────────────────────────────────────────────────────────── */

/** A rendered block: resolves to "insert before/after me" via the closest edge. */
export interface SiblingTargetData {
    targetKind: "sibling";
    blockId: BlockId;
    [key: string | symbol]: unknown;
}

/** A container slot: resolves to "insert into me" (at the end). */
export interface ContainerTargetData {
    targetKind: "container";
    parentId: BlockId;
    container: string;
    [key: string | symbol]: unknown;
}

/** A layers-panel row: resolves via the list-item instruction (reorder/combine). */
export interface LayerRowTargetData {
    targetKind: "layer-row";
    blockId: BlockId;
    [key: string | symbol]: unknown;
}

export type BuilderDropTargetData = SiblingTargetData | ContainerTargetData | LayerRowTargetData;

export function isBuilderDropTarget(data: Record<string | symbol, unknown>): data is BuilderDropTargetData {
    return data.targetKind === "sibling" || data.targetKind === "container" || data.targetKind === "layer-row";
}
