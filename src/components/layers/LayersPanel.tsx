import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { IconListTree } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { isBuilderDrag } from "../../dnd/drag-data.ts";
import { useBuilderContext } from "../../react/context.ts";
import { useBuilderState } from "../../react/hooks.ts";
import { useBuilderKeyboard } from "../../react/keyboard.ts";
import { PanelHeader } from "../panel/PanelHeader.tsx";
import { LayerRow } from "./LayerRow.tsx";

/*
 * LayersPanel — see docs/04 §LayersPanel. Hierarchy tree with selection and
 * hover bidirectionally synced to the canvas; selecting on canvas expands the
 * tree and scrolls the row into view. Rows are draggable/droppable (docs/05
 * §2, list-item hitbox) — drops resolve through the same provider monitor.
 */

export interface LayersPanelProps {
    className?: string;
}

export function LayersPanel({ className }: LayersPanelProps) {
    const { store, instanceId } = useBuilderContext();
    const rootId = useBuilderState((s) => s.document.rootId);
    const selectedId = useBuilderState((s) => s.selectedId);
    const onKeyDown = useBuilderKeyboard({ surface: "layers" });
    const scrollRef = useRef<HTMLDivElement>(null);

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
        <div className={`mat-builder-layers flex flex-col gap-1 p-2 ${className ?? ""}`}>
            <PanelHeader Icon={IconListTree} title="Layers" />
            <div
                ref={scrollRef}
                tabIndex={-1}
                onKeyDown={onKeyDown}
                className="min-h-0 flex-1 overflow-y-auto p-1 outline-none"
            >
                <LayerRow id={rootId} depth={0} />
            </div>
        </div>
    );
}
