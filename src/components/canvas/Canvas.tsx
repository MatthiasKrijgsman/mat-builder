import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { AnimatePresence } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { isBuilderDrag } from "../../dnd/drag-data.ts";
import { useBuilderContext } from "../../react/context.ts";
import { useBuilderState } from "../../react/hooks.ts";
import { useBuilderKeyboard } from "../../react/keyboard.ts";
import { pressStartedInInlineEditor, trackPressOrigin } from "../inline/focus.ts";
import { Artboard } from "./Artboard.tsx";
import { BlockView } from "./BlockView.tsx";
import { ChromeOverlay } from "./ChromeOverlay.tsx";
import { ChromePill } from "./ChromePill.tsx";

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
    /** Initial artboard width in px (email default: 600), or "fill" to size
     * to 80% of the surface until the user drags a size */
    artboardWidth?: number | "fill";
    /** Initial artboard height in px, or "fill" */
    artboardHeight?: number | "fill";
}

export function Canvas({ className, artboardWidth = 600, artboardHeight = 720 }: CanvasProps) {
    const { store, registry, instanceId, canvasRef } = useBuilderContext();
    const rootId = useBuilderState((s) => s.document.rootId);
    const rootNode = useBuilderState((s) => s.document.blocks[s.document.rootId]);
    const isRootSelected = useBuilderState((s) => s.selectedId === s.document.rootId);
    const actions = useBuilderState((s) => s.actions);
    const onKeyDown = useBuilderKeyboard();
    const scrollRef = useRef<HTMLDivElement>(null);
    // Mount-time read (no subscription — the Artboard owns its size while
    // mounted): a size the user dragged on another surface carries over.
    const [persistedSize] = useState(() => store.getState().artboardSize);

    // Publish the scroller for panels that read rendered block DOM (context.ts):
    // a layout effect, so a field measuring on its own first paint finds it.
    useLayoutEffect(() => {
        canvasRef.current = scrollRef.current;
        return () => {
            canvasRef.current = null;
        };
    }, [canvasRef]);

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
            className={`mat-builder-canvas mat-ui mat:outline-none ${className ?? ""}`}
            initialWidth={artboardWidth}
            initialHeight={artboardHeight}
            size={persistedSize}
            onSizeChange={(size) => actions.setArtboardSize(size)}
            // Focusable so keyboard shortcuts are active exactly while the canvas has focus;
            // clicking anywhere inside focuses it natively.
            tabIndex={-1}
            onKeyDown={onKeyDown}
            onPointerDownCapture={(event) => trackPressOrigin(event.target)}
            // Blocks stop propagation, so this is empty-area only — except a
            // text drag released outside its editor, whose click lands on the
            // common ancestor (the guard keeps it from ending the session).
            onClick={() => {
                if (!pressStartedInInlineEditor()) actions.select(null);
            }}
            // Root chrome stays on the frame itself (selecting the root IS selecting
            // the artboard); the transition is always present so the ring/glow animate
            // in AND out with the same spring as block chrome
            frameStyle={{
                // The root paints the artboard itself (a page background) — without
                // this the frame's own colour stays visible in the scrollbar gutter,
                // which the root's editRender can't reach from inside the scroller.
                ...(rootNode && registry.getDefinition(rootNode.type)?.getArtboardStyle?.(rootNode.props)),
                transition:
                    "box-shadow var(--mat-builder-duration-shadow) var(--mat-builder-ease-spring)",
                ...(isRootSelected
                    ? {
                          boxShadow:
                              "0 0 0 2px var(--mat-builder-color-selection), var(--mat-builder-chrome-shadow-selected)",
                      }
                    : undefined),
            }}
            decoration={
                <>
                    {/* Root name tag — same spring-animated pill as every other block
                        (ChromeOverlay), but anchored to the artboard frame since
                        selecting the root IS selecting the artboard. */}
                    <AnimatePresence>
                        {isRootSelected && rootNode && (
                            <ChromePill
                                label={
                                    registry.getDefinition(rootNode.type)?.getDisplayName?.(rootNode.props) ??
                                    registry.getDefinition(rootNode.type)?.label ??
                                    rootNode.type
                                }
                                Icon={registry.getDefinition(rootNode.type)?.icon}
                            />
                        )}
                    </AnimatePresence>
                    {/* All non-root block chrome — outside the rounded clipping frame */}
                    <ChromeOverlay scrollerRef={scrollRef} />
                </>
            }
        >
            <div ref={scrollRef} className="mat-builder-artboard-scroll mat:h-full mat:overflow-y-auto">
                <BlockView id={rootId} />
            </div>
        </Artboard>
    );
}
