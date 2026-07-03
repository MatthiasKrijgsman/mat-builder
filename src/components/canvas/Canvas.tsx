import { useBuilderState } from "../../react/hooks.ts";
import { useBuilderKeyboard } from "../../react/keyboard.ts";
import { BlockView } from "./BlockView.tsx";

/*
 * Canvas — see docs/04 §Canvas. A focusable scroll container with a centered
 * artboard rendering the root block recursively (editRender only). Phase 2
 * scope: render + click-to-select + keyboard; DnD attaches in phase 3.
 */

export interface CanvasProps {
    className?: string;
    /** Width of the centered artboard in px (email default: 600) */
    artboardWidth?: number;
}

export function Canvas({ className, artboardWidth = 600 }: CanvasProps) {
    const rootId = useBuilderState((s) => s.document.rootId);
    const actions = useBuilderState((s) => s.actions);
    const onKeyDown = useBuilderKeyboard();

    return (
        <div
            // Focusable so keyboard shortcuts are active exactly while the canvas has focus;
            // clicking anywhere inside focuses it natively.
            tabIndex={-1}
            onKeyDown={onKeyDown}
            onClick={() => actions.select(null)} // blocks stop propagation, so this is empty-area only
            className={`mat-builder-canvas relative h-full overflow-auto p-8 outline-none ${className ?? ""}`}
            style={{ backgroundColor: "var(--mat-builder-color-canvas-bg)" }}
        >
            <div
                className="mx-auto min-h-24 shadow-sm"
                style={{ width: artboardWidth, backgroundColor: "var(--mat-builder-color-artboard-bg)" }}
            >
                <BlockView id={rootId} />
            </div>
        </div>
    );
}
