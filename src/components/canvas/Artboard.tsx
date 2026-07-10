import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type HTMLAttributes,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from "react";

/*
 * Artboard — the react-email-preview-style frame shared by the editing
 * Canvas and preview surfaces (e.g. EmailPreview): a dotted work surface
 * with a centered rounded frame whose size the user drags via rounded bars
 * on each edge (symmetric per axis, since the frame is centered). Resizing
 * clamps to the visible surface, a ResizeObserver re-fits on window resize
 * and restores toward the last user-dragged size when space returns.
 */

export interface ArtboardProps extends HTMLAttributes<HTMLDivElement> {
    /** Initial frame width in px (email default: 600), or "fill" to fit the
     * surface — the frame keeps filling on window resize until the user drags
     * a size of their own. */
    initialWidth?: number | "fill";
    /** Initial frame height in px, or "fill" (see initialWidth) */
    initialHeight?: number | "fill";
    /** Mount-time frame size — overrides initialWidth/Height when set (e.g. a
     * persisted user-dragged size); later prop changes are ignored, the
     * artboard owns its size while mounted. */
    size?: { width: number; height: number } | null;
    /** Fires with the user's new preferred size on drag-resize (not on
     * shrink-to-fit clamps) — pair with `size` to persist across remounts. */
    onSizeChange?: (size: { width: number; height: number }) => void;
    /** Merged onto the frame element (e.g. a selection ring) */
    frameStyle?: CSSProperties;
    /** Rendered in the frame's relative wrapper, alongside the resize handles */
    decoration?: ReactNode;
    /** Frame content — clipped by the rounded overflow-hidden frame */
    children: ReactNode;
}

const WIDTH_RANGE = { min: 320, max: 1400 };
const HEIGHT_RANGE = { min: 240, max: 2400 };
/** Space kept between the frame and the surface edge — must match the p-6 wrapper padding, and is what keeps the resize bars (14px outside the frame) inside the surface. */
const ARTBOARD_MARGIN = 24;
const clamp = (value: number, range: { min: number; max: number }) =>
    Math.min(Math.max(value, range.min), range.max);

export function Artboard(props: ArtboardProps) {
    const {
        className,
        initialWidth = 600,
        initialHeight = 720,
        size: persistedSize,
        onSizeChange,
        frameStyle,
        decoration,
        children,
        style,
        ...rest
    } = props;
    const surfaceRef = useRef<HTMLDivElement>(null);

    const [size, setSize] = useState(
        persistedSize ?? {
            // "fill" paints one frame at the range max, then the mount-time
            // ResizeObserver fit (before paint) clamps it to the surface.
            width: initialWidth === "fill" ? WIDTH_RANGE.max : initialWidth,
            height: initialHeight === "fill" ? HEIGHT_RANGE.max : initialHeight,
        },
    );
    const sizeRef = useRef(size);
    sizeRef.current = size;
    /** The size the user last chose by dragging — what we restore toward when
     * the window grows back. Infinity ("fill" with no drag yet) always fits
     * the surface, so the frame tracks window resizes until a drag pins it. */
    const preferredRef = useRef(
        persistedSize ?? {
            width: initialWidth === "fill" ? Infinity : initialWidth,
            height: initialHeight === "fill" ? Infinity : initialHeight,
        },
    );
    // Kept in a ref so the pointer handlers never close over a stale callback
    const onSizeChangeRef = useRef(onSizeChange);
    onSizeChangeRef.current = onSizeChange;

    // Keep the frame within the surface as the window resizes: shrink to fit,
    // and grow back toward the user's preferred size when space returns.
    useEffect(() => {
        const surface = surfaceRef.current;
        if (!surface) return;
        const observer = new ResizeObserver(() => {
            const maxWidth = Math.max(WIDTH_RANGE.min, surface.clientWidth - ARTBOARD_MARGIN * 2);
            const maxHeight = Math.max(HEIGHT_RANGE.min, surface.clientHeight - ARTBOARD_MARGIN * 2);
            setSize((current) => {
                const width = Math.min(preferredRef.current.width, maxWidth);
                const height = Math.min(preferredRef.current.height, maxHeight);
                return width === current.width && height === current.height ? current : { width, height };
            });
        });
        observer.observe(surface); // also fires once on mount → initial fit
        return () => observer.disconnect();
    }, []);

    /** Pointer-drag resize; `direction` is the sign of the edge along its axis. */
    const startResize = (axis: "x" | "y", direction: 1 | -1) => (event: ReactPointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const handle = event.currentTarget;
        const startCoord = axis === "x" ? event.clientX : event.clientY;
        const startSize = axis === "x" ? sizeRef.current.width : sizeRef.current.height;
        try {
            handle.setPointerCapture(event.pointerId);
        } catch {
            // No active pointer (synthetic events) — move listeners below still work on the handle itself
        }

        // Never exceed the visible surface (minus the margin that keeps the bars inside)
        const surface = surfaceRef.current;
        const range = (base: { min: number; max: number }, available?: number) => ({
            min: base.min,
            max: Math.max(base.min, Math.min(base.max, available ?? base.max)),
        });
        const widthRange = range(WIDTH_RANGE, surface ? surface.clientWidth - ARTBOARD_MARGIN * 2 : undefined);
        const heightRange = range(HEIGHT_RANGE, surface ? surface.clientHeight - ARTBOARD_MARGIN * 2 : undefined);

        const onMove = (move: PointerEvent) => {
            // The frame is centered, so moving one edge by d changes the size by 2d
            const delta = ((axis === "x" ? move.clientX : move.clientY) - startCoord) * direction * 2;
            setSize((current) => {
                const next =
                    axis === "x"
                        ? { ...current, width: clamp(startSize + delta, widthRange) }
                        : { ...current, height: clamp(startSize + delta, heightRange) };
                preferredRef.current = next; // dragging sets the new preferred size
                onSizeChangeRef.current?.(next);
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
            ref={surfaceRef}
            className={`relative overflow-auto ${className ?? ""}`}
            style={{
                backgroundColor: "var(--mat-builder-color-canvas-bg)",
                backgroundImage:
                    "radial-gradient(circle, var(--mat-builder-color-canvas-dot) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
                ...style,
            }}
            {...rest}
        >
            <div className="grid min-h-full place-items-center p-6">
                <div className="relative">
                    <div
                        className="mat-builder-artboard-frame overflow-hidden rounded-lg shadow-lg shadow-gray-200/50 border border-stone-200"
                        style={{
                            width: size.width,
                            height: size.height,
                            backgroundColor: "var(--mat-builder-color-artboard-bg)",
                            ...frameStyle,
                        }}
                    >
                        {children}
                    </div>
                    {decoration}
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
