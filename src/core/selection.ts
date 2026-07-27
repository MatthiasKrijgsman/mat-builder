import type { BlockId } from "./types.ts";

/*
 * Group selection — see docs/04 §Selection.
 *
 * A composite block whose parts are themselves blocks (the data table: rows
 * and cells) is otherwise unreachable on the canvas. Every click lands on the
 * innermost block, so a cell always wins and the table can only be picked in
 * the layers tree — and never dragged, because the cell's own draggable
 * captures the gesture first.
 *
 * Blocks marked `selectsAsGroup` behave as ONE unit until you enter them
 * (Figma's group model): a click anywhere inside selects the group; a second
 * click — the selection now being inside it — selects whatever is actually
 * under the pointer, so anything is two clicks away. Escape walks back out
 * (the existing parent-selection shortcut). Dragging follows the same line,
 * making the whole rule "you can drag exactly what a click would select".
 *
 * Drop targets are deliberately NOT gated: dropping content into a cell should
 * work whether or not the table has been entered.
 *
 * The group is threaded DOWN the render tree rather than derived by walking up
 * from each block, because an ancestor walk is O(document) and would run for
 * every block on every store change.
 */

export interface GroupContext {
    /** The outermost enclosing group block. */
    id: BlockId;
    /** True once the selection is that group or sits inside it. */
    entered: boolean;
}

/**
 * The group context to hand this block's children. The OUTERMOST group wins —
 * a group nested in a group is just part of its parent until that one is
 * entered, which is what keeps "one unit" true at every level.
 */
export function descendGroup(
    inherited: GroupContext | undefined,
    id: BlockId,
    isGroupRoot: boolean,
    entered: boolean,
): GroupContext | undefined {
    if (inherited) return inherited;
    return isGroupRoot ? { id, entered } : undefined;
}

/** What clicking (or hovering) this block selects. */
export function groupSelectionTarget(id: BlockId, group: GroupContext | undefined): BlockId {
    return group && !group.entered ? group.id : id;
}

/**
 * Whether this block may register as a draggable. Same rule as selection, so a
 * drag started inside an un-entered group finds no draggable until the browser
 * reaches the group's own wrapper — which is precisely the block we want to
 * move. Refusing the drag through Pragmatic's `canDrag` would NOT do this: it
 * calls preventDefault() on the dragstart and cancels the gesture outright.
 */
export function isDragReachable(id: BlockId, group: GroupContext | undefined): boolean {
    return groupSelectionTarget(id, group) === id;
}
