import { useCallback, type KeyboardEvent } from "react";
import { findLocation } from "../core/index.ts";
import { useBuilderContext } from "./context.ts";
import { moveTargetFor, type MoveDirection } from "./keyboard-move.ts";
import { adjacentVisibleRow } from "./layer-tree.ts";

/** Alt + arrow → the move it stands for (keyboard-move.ts). */
const MOVE_KEYS: Record<string, MoveDirection> = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "out",
    ArrowRight: "in",
};

/*
 * Keyboard shortcuts — see docs/04 §Keyboard. Returned as an onKeyDown
 * handler that focusable builder surfaces attach (Canvas and LayersPanel),
 * so shortcuts are active exactly when focus is inside the builder.
 * Editable targets (inspector inputs) are left alone — Cmd/Ctrl+Z there is
 * the field's own text undo.
 */

export interface BuilderKeyboardOptions {
    /**
     * The layers surface additionally handles ←/→ collapse/expand, and reads
     * ↑/↓ as "the next row in the tree" rather than the next sibling.
     */
    surface?: "canvas" | "layers";
}

function isEditableTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
    );
}

export function useBuilderKeyboard(options?: BuilderKeyboardOptions): (event: KeyboardEvent) => void {
    const { store, registry } = useBuilderContext();
    const surface = options?.surface ?? "canvas";

    return useCallback(
        (event: KeyboardEvent) => {
            if (isEditableTarget(event.target)) return;
            const { document, selectedId, expanded, actions } = store.getState();
            const meta = event.metaKey || event.ctrlKey;
            const key = event.key.toLowerCase();

            // Alt + arrows move the selected block — the keyboard's drag and
            // drop, on both surfaces alike. A move that does not exist is a
            // no-op rather than a fallthrough to selection, so the key means
            // one thing.
            if (event.altKey && !meta && selectedId && event.key in MOVE_KEYS) {
                event.preventDefault();
                const to = moveTargetFor(document, registry, selectedId, MOVE_KEYS[event.key]);
                if (to) actions.moveBlock(selectedId, to);
                return;
            }

            if (meta && key === "z") {
                event.preventDefault();
                if (event.shiftKey) actions.redo();
                else actions.undo();
                return;
            }
            if (meta && key === "d") {
                event.preventDefault();
                if (selectedId) actions.duplicateBlock(selectedId);
                return;
            }
            if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
                event.preventDefault();
                actions.removeBlock(selectedId); // no-op for the root / canDelete: false
                return;
            }
            if (event.key === "Escape") {
                event.preventDefault();
                // Walk up: child → parent → … → root → none
                actions.select(selectedId ? (findLocation(document, selectedId)?.parentId ?? null) : null);
                return;
            }
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                if (!selectedId) {
                    actions.select(document.rootId);
                    return;
                }
                const delta = event.key === "ArrowDown" ? 1 : -1;
                if (surface === "layers") {
                    // A tree steps through the rows you can SEE, in and out of
                    // nesting levels — sibling-only navigation dead-ends on an
                    // only child, which is most of a real document
                    const next = adjacentVisibleRow(document, expanded, selectedId, delta);
                    if (next) actions.select(next);
                    return;
                }
                // Canvas: stay at one level, Figma-style — Escape goes up
                const location = findLocation(document, selectedId);
                if (!location) return; // the root has no siblings
                const siblings = document.blocks[location.parentId].children[location.container];
                const next = siblings[location.index + delta];
                if (next) actions.select(next);
                return;
            }
            if (surface === "layers" && (event.key === "ArrowLeft" || event.key === "ArrowRight") && selectedId) {
                event.preventDefault();
                actions.setExpanded(selectedId, event.key === "ArrowRight");
            }
        },
        [store, registry, surface],
    );
}
