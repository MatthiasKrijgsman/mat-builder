import { findAncestors, walkDocument } from "../core/index.ts";
import type { BlockId, BuilderDocument } from "../core/types.ts";

/*
 * The layers tree as a flat list of the rows currently ON SCREEN — what ↑/↓
 * step through (docs/04 §Keyboard).
 *
 * Order comes from `walkDocument`, which is the same depth-first, container-
 * order walk `LayerRow` renders with, pruned at collapsed blocks. `expanded`
 * is store state rather than a document concept, so this lives here and not
 * in core.
 */

/** Every layer row the panel is currently showing, top to bottom. */
export function visibleLayerRows(document: BuilderDocument, expanded: ReadonlySet<BlockId>): BlockId[] {
    const rows: BlockId[] = [];
    walkDocument(document, (node) => {
        rows.push(node.id);
        // Returning false prunes the subtree — exactly a collapsed row
        return expanded.has(node.id);
    });
    return rows;
}

/**
 * The row one step up or down the visible list, or null at either end (a tree
 * doesn't wrap: ↓ on the last row should feel like the end of the list, not
 * like a jump back to the top).
 *
 * A selection whose row is hidden — collapse an ancestor while a descendant is
 * selected and it is — steps from its nearest visible ancestor instead, which
 * is the row standing in for it on screen.
 */
export function adjacentVisibleRow(
    document: BuilderDocument,
    expanded: ReadonlySet<BlockId>,
    from: BlockId,
    delta: 1 | -1,
): BlockId | null {
    const rows = visibleLayerRows(document, expanded);
    let index = rows.indexOf(from);
    if (index === -1) {
        const visibleAncestor = findAncestors(document, from).find((id) => rows.includes(id));
        if (!visibleAncestor) return null;
        index = rows.indexOf(visibleAncestor);
    }
    return rows[index + delta] ?? null;
}
