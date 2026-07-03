import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { useEffect, useRef } from "react";
import { isBuilderDrag } from "../../dnd/drag-data.ts";
import { useBuilderContext } from "../../react/context.ts";
import { useBuilderState } from "../../react/hooks.ts";
import { useBuilderKeyboard } from "../../react/keyboard.ts";
import { Artboard } from "./Artboard.tsx";
import { BlockView } from "./BlockView.tsx";

/*
 * Canvas — see docs/04 §Canvas. The editing surface: a focusable Artboard
 * whose frame renders the root block (editRender only). Content taller than
 * the frame scrolls INSIDE it; that inner scroller is the DnD auto-scroll
 * target (docs/05 §6). Selecting the root selects the artboard itself —
 * its chrome (ring + name tag) is drawn on the frame, outside the rounded
 * clipping context.
 */

export interface CanvasProps {
    className?: string;
    /** Initial artboard width in px (email default: 600) */
    artboardWidth?: number;
    /** Initial artboard height in px */
    artboardHeight?: number;
}

export function Canvas({ className, artboardWidth = 600, artboardHeight = 720 }: CanvasProps) {
    const { registry, instanceId } = useBuilderContext();
    const rootId = useBuilderState((s) => s.document.rootId);
    const rootNode = useBuilderState((s) => s.document.blocks[s.document.rootId]);
    const isRootSelected = useBuilderState((s) => s.selectedId === s.document.rootId);
    const actions = useBuilderState((s) => s.actions);
    const onKeyDown = useBuilderKeyboard();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;
        return autoScrollForElements({
            element,
            canScroll: ({ source }) => isBuilderDrag(source.data, instanceId),
        });
    }, [instanceId]);

    return (
        <Artboard
            className={`mat-builder-canvas outline-none ${className ?? ""}`}
            initialWidth={artboardWidth}
            initialHeight={artboardHeight}
            // Focusable so keyboard shortcuts are active exactly while the canvas has focus;
            // clicking anywhere inside focuses it natively.
            tabIndex={-1}
            onKeyDown={onKeyDown}
            onClick={() => actions.select(null)} // blocks stop propagation, so this is empty-area only
            frameStyle={
                isRootSelected ? { boxShadow: "0 0 0 2px var(--mat-builder-color-selection)" } : undefined
            }
            decoration={
                isRootSelected && rootNode ? (
                    <span
                        className="absolute -top-6 left-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none"
                        style={{
                            backgroundColor: "var(--mat-builder-color-selection)",
                            color: "var(--mat-builder-color-chrome-tag-fg)",
                        }}
                    >
                        {registry.getDefinition(rootNode.type)?.label ?? rootNode.type}
                    </span>
                ) : null
            }
        >
            <div ref={scrollRef} className="mat-builder-artboard-scroll h-full overflow-y-auto">
                <BlockView id={rootId} />
            </div>
        </Artboard>
    );
}
