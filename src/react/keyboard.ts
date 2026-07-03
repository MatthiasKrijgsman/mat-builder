import { useCallback, type KeyboardEvent } from "react";
import { findLocation } from "../core/index.ts";
import { useBuilderContext } from "./context.ts";

/*
 * Keyboard shortcuts — see docs/04 §Keyboard. Returned as an onKeyDown
 * handler that focusable builder surfaces attach (the Canvas in phase 2,
 * the LayersPanel in phase 3), so shortcuts are active exactly when focus
 * is inside the builder. Editable targets (inspector inputs) are left
 * alone — Cmd/Ctrl+Z there is the field's own text undo.
 */

function isEditableTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
    );
}

export function useBuilderKeyboard(): (event: KeyboardEvent) => void {
    const { store } = useBuilderContext();

    return useCallback(
        (event: KeyboardEvent) => {
            if (isEditableTarget(event.target)) return;
            const { document, selectedId, actions } = store.getState();
            const meta = event.metaKey || event.ctrlKey;
            const key = event.key.toLowerCase();

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
            }
        },
        [store],
    );
}
