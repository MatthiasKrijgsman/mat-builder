import { canDropAt, findLocation } from "../core/index.ts";
import type { BlockRegistry } from "../core/registry.ts";
import type { BlockId, BlockLocation, BuilderDocument } from "../core/types.ts";

/*
 * Keyboard block moving — docs/04 §Keyboard. The DnD surfaces move blocks
 * with the pointer; these four directions are the same moves without one,
 * so the tree is editable from the keyboard alone:
 *
 *   up / down   swap with the previous / next sibling
 *   out         leave the parent: land right after it, in the grandparent
 *   in          enter the previous sibling: its first container, last place
 *
 * Pure: (document, selection, direction) → the `moveBlock` target, or null
 * when the move does not exist or the destination refuses the block. The
 * keyboard handler calls this and hands the result to the store.
 */

export type MoveDirection = "up" | "down" | "out" | "in";

export function moveTargetFor(
    document: BuilderDocument,
    registry: BlockRegistry,
    id: BlockId,
    direction: MoveDirection,
): BlockLocation | null {
    const node = document.blocks[id];
    const from = findLocation(document, id);
    if (!node || !from) return null; // the root does not move
    const siblings = document.blocks[from.parentId].children[from.container];

    let to: BlockLocation | null = null;
    switch (direction) {
        case "up":
            // `to.index` is read against the pre-move list (core/commands.ts)
            if (from.index > 0) to = { parentId: from.parentId, container: from.container, index: from.index - 1 };
            break;
        case "down":
            if (from.index < siblings.length - 1) {
                to = { parentId: from.parentId, container: from.container, index: from.index + 2 };
            }
            break;
        case "out": {
            const parentLocation = findLocation(document, from.parentId);
            if (parentLocation) {
                to = { parentId: parentLocation.parentId, container: parentLocation.container, index: parentLocation.index + 1 };
            }
            break;
        }
        case "in": {
            const previous = from.index > 0 ? document.blocks[siblings[from.index - 1]] : undefined;
            const container = previous && registry.getDefinition(previous.type)?.containers?.[0];
            if (previous && container) {
                to = { parentId: previous.id, container: container.name, index: (previous.children[container.name] ?? []).length };
            }
            break;
        }
    }
    return to && canDropAt(document, registry, node.type, to, id) ? to : null;
}
