import type { BlockId, BlockLocation, BlockNode, BuilderDocument } from "./types.ts";

/*
 * Traversal utilities over the flat, id-keyed document — pure and server-safe.
 */

export interface WalkContext {
    /** null for the root block */
    parentId: BlockId | null;
    /** null for the root block */
    container: string | null;
    index: number;
    depth: number;
}

export type WalkVisitor = (node: BlockNode, ctx: WalkContext) => boolean | void;

/**
 * Depth-first walk from the root. Return `false` from the visitor to prune
 * that block's subtree. Dangling child ids are skipped defensively —
 * `validateDocument` is where they get reported.
 */
export function walkDocument(document: BuilderDocument, visitor: WalkVisitor): void {
    const root = document.blocks[document.rootId];
    if (!root) return;

    const visit = (node: BlockNode, ctx: WalkContext): void => {
        if (visitor(node, ctx) === false) return;
        for (const [container, childIds] of Object.entries(node.children)) {
            childIds.forEach((childId, index) => {
                const child = document.blocks[childId];
                if (!child) return;
                visit(child, { parentId: node.id, container, index, depth: ctx.depth + 1 });
            });
        }
    };
    visit(root, { parentId: null, container: null, index: 0, depth: 0 });
}

/** Where a block sits in its parent, or null for the root / unparented blocks. */
export function findLocation(document: BuilderDocument, id: BlockId): BlockLocation | null {
    for (const parent of Object.values(document.blocks)) {
        for (const [container, childIds] of Object.entries(parent.children)) {
            const index = childIds.indexOf(id);
            if (index !== -1) return { parentId: parent.id, container, index };
        }
    }
    return null;
}

/** Ancestor chain of a block, nearest parent first, ending at the root. */
export function findAncestors(document: BuilderDocument, id: BlockId): BlockId[] {
    const ancestors: BlockId[] = [];
    let location = findLocation(document, id);
    while (location) {
        // Guard against a corrupt document with a parent cycle
        if (ancestors.includes(location.parentId)) break;
        ancestors.push(location.parentId);
        location = findLocation(document, location.parentId);
    }
    return ancestors;
}

/** True when `id` sits strictly inside `ancestorId`'s subtree (a block is not its own descendant). */
export function isDescendant(document: BuilderDocument, ancestorId: BlockId, id: BlockId): boolean {
    return findAncestors(document, id).includes(ancestorId);
}
