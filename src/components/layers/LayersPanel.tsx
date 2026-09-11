import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { isBuilderDrag } from "../../dnd/drag-data.ts";
import { scrollBlockIntoView } from "../../react/canvas-scroll.ts";
import { useBuilderContext } from "../../react/context.ts";
import { useBuilderState } from "../../react/hooks.ts";
import { useBuilderKeyboard } from "../../react/keyboard.ts";
import { LayerRow } from "./LayerRow.tsx";

/*
 * LayersPanel — see docs/04 §LayersPanel. Hierarchy tree with selection and
 * hover bidirectionally synced to the canvas; selecting on canvas expands the
 * tree and scrolls the row into view, and selecting in the tree scrolls the
 * canvas to the block (a row can name something far off screen). Rows are
 * draggable/droppable (docs/05 §2, list-item hitbox) — drops resolve through
 * the same provider monitor.
 */

export interface LayersPanelProps {
    className?: string;
}

export function LayersPanel({ className }: LayersPanelProps) {
    const { store, instanceId, canvasRef } = useBuilderContext();
    const rootId = useBuilderState((s) => s.document.rootId);
    const selectedId = useBuilderState((s) => s.selectedId);
    const handleKeyDown = useBuilderKeyboard({ surface: "layers" });
    const scrollRef = useRef<HTMLDivElement>(null);

    // ↑/↓ walks the tree, which is a selection made in this panel just as much
    // as a click is (LayerRow reveals its own) — so the canvas follows along.
    const onKeyDown = (event: KeyboardEvent) => {
        const before = store.getState().selectedId;
        handleKeyDown(event);
        const after = store.getState().selectedId;
        if (after && after !== before) scrollBlockIntoView(canvasRef.current, after);
    };

    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;
        return autoScrollForElements({
            element,
            canScroll: ({ source }) => isBuilderDrag(source.data, instanceId),
        });
    }, [instanceId]);

    // Canvas → tree sync: reveal the selection and scroll its row into view
    useEffect(() => {
        if (!selectedId) return;
        store.getState().actions.revealBlock(selectedId);
        requestAnimationFrame(() => {
            scrollRef.current
                ?.querySelector(`[data-layer-id="${selectedId}"]`)
                ?.scrollIntoView({ block: "nearest" });
        });
    }, [selectedId, store]);

    return (
        <div className={`mat-builder-layers mat-ui mat:flex mat:flex-col mat:gap-1 mat:p-2 ${className ?? ""}`}>
            <div
                ref={scrollRef}
                tabIndex={-1}
                onKeyDown={onKeyDown}
                className="mat:min-h-0 mat:flex-1 mat:overflow-y-auto mat:p-1 mat:outline-none"
            >
                <LayerRow id={rootId} depth={0} />
            </div>
        </div>
    );
}
