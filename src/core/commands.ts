import { produce } from "immer";
import { nanoid } from "nanoid";
import { migrateDocument, validateDocument } from "./document.ts";
import { materializeBlock } from "./materialize.ts";
import { containerAccepts, type BlockRegistry } from "./registry.ts";
import { findAncestors, findLocation, isDescendant } from "./traversal.ts";
import type { BlockId, BlockLocation, BuilderDocument, NewBlockSpec } from "./types.ts";
import type { BlockVisibility } from "./visibility.ts";

/*
 * Command layer — see docs/03-architecture.md §3.
 *
 * The only code allowed to touch the document. Each command is a pure
 * function over the immutable document (immer gives structural sharing);
 * invalid payloads throw with a descriptive reason. `insertBlock` and
 * `duplicateBlock` additionally return the created block's id so callers
 * (store, DnD) can select it.
 */

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Why placing a block of `childType` at `at` is rejected, or null when
 * allowed. Pass `movingId` for moves — adds root/canDrag/cycle checks and
 * excludes the block itself from `maxChildren` counting. Unknown parent
 * types are tolerated: only container keys already present on the node
 * are usable.
 */
export function getDropError(
    document: BuilderDocument,
    registry: BlockRegistry,
    childType: string,
    at: BlockLocation,
    movingId?: BlockId,
): string | null {
    const parent = document.blocks[at.parentId];
    if (!parent) return `parent block "${at.parentId}" does not exist`;

    const parentDef = registry.getDefinition(parent.type);
    if (parentDef) {
        const containerDef = parentDef.containers?.find((c) => c.name === at.container);
        if (!containerDef) {
            return `container "${at.container}" does not exist on type "${parent.type}"`;
        }
        const ctx = { document, parentId: at.parentId, container: at.container };
        if (!containerAccepts(containerDef, childType, ctx)) {
            return `container "${at.container}" of "${parent.type}" does not accept type "${childType}"`;
        }
        if (containerDef.maxChildren !== undefined) {
            const existing = parent.children[at.container] ?? [];
            const count =
                movingId !== undefined && existing.includes(movingId) ? existing.length - 1 : existing.length;
            if (count >= containerDef.maxChildren) {
                return `container "${at.container}" of "${parent.type}" is full (maxChildren: ${containerDef.maxChildren})`;
            }
        }
    } else if (!(at.container in parent.children)) {
        return `container "${at.container}" does not exist on block "${at.parentId}" (unknown type "${parent.type}")`;
    }

    if (movingId !== undefined) {
        if (movingId === document.rootId) return "cannot move the root block";
        const moving = document.blocks[movingId];
        if (!moving) return `block "${movingId}" does not exist`;
        if (registry.getDefinition(moving.type)?.canDrag === false) {
            return `block type "${moving.type}" cannot be moved`;
        }
        if (at.parentId === movingId || isDescendant(document, movingId, at.parentId)) {
            return "cannot move a block into its own subtree";
        }
    }
    return null;
}

/** Predicate form of `getDropError` — what the DnD layer uses to gate drop targets. */
export function canDropAt(
    document: BuilderDocument,
    registry: BlockRegistry,
    childType: string,
    at: BlockLocation,
    movingId?: BlockId,
): boolean {
    return getDropError(document, registry, childType, at, movingId) === null;
}

/**
 * Where a click-to-add insert of `type` should land: the end of the nearest
 * accepting container walking up from `fromId` (usually the selection) to the
 * root; null when nothing in the chain accepts it. Used by the Palette.
 */
export function findInsertLocation(
    document: BuilderDocument,
    registry: BlockRegistry,
    type: string,
    fromId?: BlockId | null,
): BlockLocation | null {
    const candidates =
        fromId && document.blocks[fromId] ? [fromId, ...findAncestors(document, fromId)] : [document.rootId];
    for (const parentId of candidates) {
        const node = document.blocks[parentId];
        const definition = node && registry.getDefinition(node.type);
        for (const container of definition?.containers ?? []) {
            const at = { parentId, container: container.name, index: (node.children[container.name] ?? []).length };
            if (canDropAt(document, registry, type, at)) return at;
        }
    }
    return null;
}

export interface InsertBlockPayload {
    type: string;
    at: BlockLocation;
    /** Overrides on top of the definition's defaultProps */
    props?: Record<string, unknown>;
    /**
     * Container name → child specs, materialized recursively with the block
     * itself. This is what lets a whole subtree be inserted in one command —
     * a pattern stamping out its tree (docs/08 §7). Beats the definition's own
     * `onCreate` children, same precedence rule as `materializeBlock`.
     */
    children?: Record<string, NewBlockSpec[]>;
    /** Conditional visibility for the new block */
    visibility?: BlockVisibility;
    /** Fixed id for the new block (tests, collaborative echo); defaults to a fresh nanoid */
    id?: BlockId;
}

export function insertBlock(
    document: BuilderDocument,
    payload: InsertBlockPayload,
    registry: BlockRegistry,
): { document: BuilderDocument; blockId: BlockId } {
    const error = getDropError(document, registry, payload.type, payload.at);
    if (error) throw new Error(`insertBlock: ${error}`);

    const spec: NewBlockSpec = {
        type: payload.type,
        props: payload.props,
        children: payload.children,
        visibility: payload.visibility,
    };
    const { rootId, nodes } = materializeBlock(document, registry, spec, payload.at, payload.id);

    const next = produce(document, (draft) => {
        for (const node of nodes) {
            draft.blocks[node.id] = node;
        }
        const parent = draft.blocks[payload.at.parentId];
        const list = (parent.children[payload.at.container] ??= []);
        list.splice(clamp(payload.at.index, 0, list.length), 0, rootId);
    });
    return { document: next, blockId: rootId };
}

/**
 * `to.index` is expressed in the pre-move list (matching what DnD hitboxes
 * compute while the block is still in place); moving forward within the
 * same container adjusts for the removal.
 */
export function moveBlock(
    document: BuilderDocument,
    payload: { id: BlockId; to: BlockLocation },
    registry: BlockRegistry,
): BuilderDocument {
    const node = document.blocks[payload.id];
    if (!node) throw new Error(`moveBlock: block "${payload.id}" does not exist`);
    const from = findLocation(document, payload.id);
    if (!from) throw new Error(`moveBlock: block "${payload.id}" has no parent`);
    const error = getDropError(document, registry, node.type, payload.to, payload.id);
    if (error) throw new Error(`moveBlock: ${error}`);

    return produce(document, (draft) => {
        draft.blocks[from.parentId].children[from.container].splice(from.index, 1);

        const target = draft.blocks[payload.to.parentId];
        const list = (target.children[payload.to.container] ??= []);
        const sameList = from.parentId === payload.to.parentId && from.container === payload.to.container;
        const index = sameList && from.index < payload.to.index ? payload.to.index - 1 : payload.to.index;
        list.splice(clamp(index, 0, list.length), 0, payload.id);
    });
}

/** Shallow merge only — history coalescing lives in history.ts, wired by the store. */
export function updateProps(
    document: BuilderDocument,
    payload: { id: BlockId; patch: Record<string, unknown> },
): BuilderDocument {
    if (!document.blocks[payload.id]) throw new Error(`updateProps: block "${payload.id}" does not exist`);
    return produce(document, (draft) => {
        Object.assign(draft.blocks[payload.id].props, payload.patch);
    });
}

/**
 * Replaces a block's conditional visibility (core/visibility.ts) — a node
 * field, not a prop, so it needs its own command. Pass `undefined` to clear
 * it, which is how a document stays free of the default.
 */
export function setVisibility(
    document: BuilderDocument,
    payload: { id: BlockId; visibility: BlockVisibility | undefined },
): BuilderDocument {
    if (!document.blocks[payload.id]) throw new Error(`setVisibility: block "${payload.id}" does not exist`);
    if (payload.id === document.rootId) throw new Error("setVisibility: the root block is always visible");
    return produce(document, (draft) => {
        if (payload.visibility) draft.blocks[payload.id].visibility = payload.visibility;
        else delete draft.blocks[payload.id].visibility;
    });
}

export function removeBlock(
    document: BuilderDocument,
    payload: { id: BlockId },
    registry: BlockRegistry,
): BuilderDocument {
    const node = document.blocks[payload.id];
    if (!node) throw new Error(`removeBlock: block "${payload.id}" does not exist`);
    if (payload.id === document.rootId) throw new Error("removeBlock: cannot remove the root block");
    if (registry.getDefinition(node.type)?.canDelete === false) {
        throw new Error(`removeBlock: block type "${node.type}" cannot be deleted`);
    }

    const location = findLocation(document, payload.id);
    return produce(document, (draft) => {
        if (location) {
            draft.blocks[location.parentId].children[location.container].splice(location.index, 1);
        }
        for (const id of collectSubtreeIds(document, payload.id)) {
            delete draft.blocks[id];
        }
    });
}

export function duplicateBlock(
    document: BuilderDocument,
    payload: { id: BlockId },
    registry: BlockRegistry,
): { document: BuilderDocument; blockId: BlockId } {
    const node = document.blocks[payload.id];
    if (!node) throw new Error(`duplicateBlock: block "${payload.id}" does not exist`);
    const location = findLocation(document, payload.id);
    if (!location) throw new Error(`duplicateBlock: block "${payload.id}" has no parent`);

    const at = { ...location, index: location.index + 1 };
    const error = getDropError(document, registry, node.type, at);
    if (error) throw new Error(`duplicateBlock: ${error}`);

    // Deep-clone the subtree with fresh ids
    const idMap = new Map<BlockId, BlockId>();
    for (const id of collectSubtreeIds(document, payload.id)) {
        idMap.set(id, nanoid());
    }
    const cloneId = (id: BlockId) => idMap.get(id) as BlockId;

    const next = produce(document, (draft) => {
        for (const [sourceId, newId] of idMap) {
            const source = document.blocks[sourceId];
            draft.blocks[newId] = {
                id: newId,
                type: source.type,
                props: structuredClone(source.props),
                children: Object.fromEntries(
                    Object.entries(source.children).map(([name, ids]) => [
                        name,
                        ids.filter((id) => idMap.has(id)).map(cloneId),
                    ]),
                ),
                // Rebuilt field by field rather than spread, so every node
                // field has to be listed here — a copy keeps its conditions.
                ...(source.visibility ? { visibility: structuredClone(source.visibility) } : undefined),
            };
        }
        draft.blocks[at.parentId].children[at.container].splice(at.index, 0, cloneId(payload.id));
    });
    return { document: next, blockId: cloneId(payload.id) };
}

/** Load/replace: runs the migration chain, then rejects documents with integrity errors. */
export function setDocument(next: BuilderDocument, registry: BlockRegistry): BuilderDocument {
    const migrated = migrateDocument(next);
    const errors = validateDocument(migrated, registry).filter((issue) => issue.severity === "error");
    if (errors.length > 0) {
        throw new Error(
            `setDocument: document failed validation:\n${errors.map((issue) => `- ${issue.message}`).join("\n")}`,
        );
    }
    return migrated;
}

function collectSubtreeIds(document: BuilderDocument, id: BlockId): BlockId[] {
    const ids: BlockId[] = [];
    const visit = (blockId: BlockId) => {
        const node = document.blocks[blockId];
        if (!node) return;
        ids.push(blockId);
        for (const childIds of Object.values(node.children)) {
            childIds.forEach(visit);
        }
    };
    visit(id);
    return ids;
}
