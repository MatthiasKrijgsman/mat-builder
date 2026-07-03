import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { isBuilderDrag } from "../../dnd/drag-data.ts";
import { useBuilderContext } from "../../react/context.ts";
import { useBuilderState } from "../../react/hooks.ts";
import { useBuilderKeyboard } from "../../react/keyboard.ts";
import { BlockView } from "./BlockView.tsx";

/*
 * Canvas — see docs/04 §Canvas. A focusable surface with a centered, rounded
 * artboard that renders the root block (editRender only). The artboard has a
 * fixed, draggable size: rounded bars on each edge resize it symmetrically on
 * that axis (the artboard is centered, so growing keeps it centered), and
 * content taller than the artboard scrolls INSIDE it — the scroll container
 * is clipped by the rounded frame so corners stay round. Edge auto-scroll
 * during drags attaches to that inner scroller (docs/05 §6).
 */

export interface CanvasProps {
    className?: string;
    /** Initial artboard width in px (email default: 600) */
    artboardWidth?: number;
    /** Initial artboard height in px */
    artboardHeight?: number;
}

const WIDTH_RANGE = { min: 320, max: 1400 };
const HEIGHT_RANGE = { min: 240, max: 2400 };
/** Space kept between the artboard and the canvas edge — must match the p-10 wrapper padding, and is what keeps the resize bars (14px outside the artboard) inside the canvas. */
const ARTBOARD_MARGIN = 40;
const clamp = (value: number, range: { min: number; max: number }) =>
    Math.min(Math.max(value, range.min), range.max);

export function Canvas({ className, artboardWidth = 600, artboardHeight = 720 }: CanvasProps) {
    const { registry, instanceId } = useBuilderContext();
    const rootId = useBuilderState((s) => s.document.rootId);
    const rootNode = useBuilderState((s) => s.document.blocks[s.document.rootId]);
    const isRootSelected = useBuilderState((s) => s.selectedId === s.document.rootId);
    const actions = useBuilderState((s) => s.actions);
    const onKeyDown = useBuilderKeyboard();
    const canvasRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [size, setSize] = useState({ width: artboardWidth, height: artboardHeight });
    const sizeRef = useRef(size);
    sizeRef.current = size;
    /** The size the user last chose by dragging — what we restore toward when the window grows back */
    const preferredRef = useRef(size);

    // Keep the artboard within the canvas as the window resizes: shrink to fit,
    // and grow back toward the user's preferred size when space returns.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const observer = new ResizeObserver(() => {
            const maxWidth = Math.max(WIDTH_RANGE.min, canvas.clientWidth - ARTBOARD_MARGIN * 2);
            const maxHeight = Math.max(HEIGHT_RANGE.min, canvas.clientHeight - ARTBOARD_MARGIN * 2);
            setSize((current) => {
                const width = Math.min(preferredRef.current.width, maxWidth);
                const height = Math.min(preferredRef.current.height, maxHeight);
                return width === current.width && height === current.height ? current : { width, height };
            });
        });
        observer.observe(canvas); // also fires once on mount → initial fit
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;
        return autoScrollForElements({
            element,
            canScroll: ({ source }) => isBuilderDrag(source.data, instanceId),
        });
    }, [instanceId]);

    /** Pointer-drag resize; `direction` is the sign of the edge along its axis. */
    const startResize = (axis: "x" | "y", direction: 1 | -1) => (event: ReactPointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const handle = event.currentTarget;
        const startCoord = axis === "x" ? event.clientX : event.clientY;
        const startSize = axis === "x" ? sizeRef.current.width : sizeRef.current.height;
        handle.setPointerCapture(event.pointerId);

        // Never exceed the visible canvas (minus the margin that keeps the bars inside)
        const canvas = canvasRef.current;
        const range = (base: { min: number; max: number }, available?: number) => ({
            min: base.min,
            max: Math.max(base.min, Math.min(base.max, available ?? base.max)),
        });
        const widthRange = range(WIDTH_RANGE, canvas ? canvas.clientWidth - ARTBOARD_MARGIN * 2 : undefined);
        const heightRange = range(HEIGHT_RANGE, canvas ? canvas.clientHeight - ARTBOARD_MARGIN * 2 : undefined);

        const onMove = (move: PointerEvent) => {
            // The artboard is centered, so moving one edge by d changes the size by 2d
            const delta = ((axis === "x" ? move.clientX : move.clientY) - startCoord) * direction * 2;
            setSize((current) => {
                const next =
                    axis === "x"
                        ? { ...current, width: clamp(startSize + delta, widthRange) }
                        : { ...current, height: clamp(startSize + delta, heightRange) };
                preferredRef.current = next; // dragging sets the new preferred size
                return next;
            });
        };
        const onUp = () => {
            handle.removeEventListener("pointermove", onMove);
            handle.removeEventListener("pointerup", onUp);
            handle.removeEventListener("pointercancel", onUp);
        };
        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", onUp);
        handle.addEventListener("pointercancel", onUp);
    };

    return (
        <div
            ref={canvasRef}
            // Focusable so keyboard shortcuts are active exactly while the canvas has focus;
            // clicking anywhere inside focuses it natively.
            tabIndex={-1}
            onKeyDown={onKeyDown}
            onClick={() => actions.select(null)} // blocks stop propagation, so this is empty-area only
            className={`mat-builder-canvas relative overflow-auto outline-none ${className ?? ""}`}
            style={{ backgroundColor: "var(--mat-builder-color-canvas-bg)" }}
        >
            <div className="grid min-h-full place-items-center p-10">
                <div className="relative">
                    <div
                        className="overflow-hidden rounded-lg shadow-sm"
                        style={{
                            width: size.width,
                            height: size.height,
                            backgroundColor: "var(--mat-builder-color-artboard-bg)",
                            // Selecting the root selects the artboard itself: the ring lives on the
                            // frame (outside the clipping context), never inside the scroller.
                            boxShadow: isRootSelected ? "0 0 0 2px var(--mat-builder-color-selection)" : undefined,
                        }}
                    >
                        <div ref={scrollRef} className="mat-builder-artboard-scroll h-full overflow-y-auto">
                            <BlockView id={rootId} />
                        </div>
                    </div>
                    {isRootSelected && rootNode && (
                        <span
                            className="absolute -top-6 left-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none"
                            style={{
                                backgroundColor: "var(--mat-builder-color-selection)",
                                color: "var(--mat-builder-color-chrome-tag-fg)",
                            }}
                        >
                            {registry.getDefinition(rootNode.type)?.label ?? rootNode.type}
                        </span>
                    )}
                    <ResizeHandle position="top" onPointerDown={startResize("y", -1)} />
                    <ResizeHandle position="bottom" onPointerDown={startResize("y", 1)} />
                    <ResizeHandle position="left" onPointerDown={startResize("x", -1)} />
                    <ResizeHandle position="right" onPointerDown={startResize("x", 1)} />
                </div>
            </div>
        </div>
    );
}

function ResizeHandle(props: {
    position: "top" | "bottom" | "left" | "right";
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
    const { position, onPointerDown } = props;
    const horizontal = position === "top" || position === "bottom"; // a horizontal bar resizing the y axis
    const style: CSSProperties = {
        [position]: -14,
        ...(horizontal
            ? { left: "50%", transform: "translateX(-50%)", width: 40, height: 5, cursor: "ns-resize" }
            : { top: "50%", transform: "translateY(-50%)", width: 5, height: 40, cursor: "ew-resize" }),
        backgroundColor: "var(--mat-builder-color-resize-handle)",
        touchAction: "none",
    };
    return (
        <div
            role="separator"
            aria-label={horizontal ? "Resize height" : "Resize width"}
            className="absolute rounded-full"
            style={style}
            onPointerDown={onPointerDown}
            onClick={(event) => event.stopPropagation()}
        />
    );
}
