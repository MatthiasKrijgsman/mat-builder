import { motion, useReducedMotion } from "motion/react";
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
 *
 * The frame stays hidden until that first fit lands and fades in from there,
 * so mount never flashes the pre-clamp size.
 */

export interface ArtboardProps extends HTMLAttributes<HTMLDivElement> {
    /** Initial frame width in px (email default: 600), or "fill" to size to
     * 80% of the surface — the frame keeps tracking the surface on window
     * resize until the user drags a size of their own. */
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
/** "fill" sizes the frame to this fraction of the surface, not edge-to-edge */
const FILL_FRACTION = 0.8;
/** The visible drag bar on each frame edge */
const HANDLE_BAR = { length: 40, thickness: 5 };
/** Gap between the frame edge and the bar's near edge */
const HANDLE_GAP = 14;
/** Invisible pointer target centred on the bar. A 5px bar is a miserable thing
 * to aim at, so the target that takes the cursor and the drag is much larger —
 * the bar is only the affordance. Keep `length/2 + gap` under ARTBOARD_MARGIN or
 * the target spills outside the surface. */
const HANDLE_HIT = { length: 64, thickness: 22 };
/* The bar answers the pointer: it swells and darkens under the cursor, then
 * again — into the active colour — for as long as the drag runs. Both grow the
 * *rest* bar symmetrically about its centre, so the gap to the frame closes
 * evenly and the bar stays inside HANDLE_HIT. Sizes animate (not transforms),
 * so the pill keeps its stadium ends at every step. */
const HANDLE_STATES = {
    rest: { length: 0, thickness: 0, color: "var(--mat-builder-color-resize-handle)" },
    hover: { length: 8, thickness: 2, color: "var(--mat-builder-color-resize-handle-hover)" },
    drag: { length: 16, thickness: 3, color: "var(--mat-builder-color-resize-handle-active)" },
} as const;
/** Snappy with a hint of overshoot — the same tactile register as ChromePill */
const HANDLE_TRANSITION = {
    default: { type: "spring", stiffness: 520, damping: 30, mass: 0.6 },
    backgroundColor: { duration: 0.15, ease: "easeOut" },
} as const;
/** Space kept between the frame and the surface edge — must match the p-6 wrapper padding, and is what keeps the resize handles' pointer targets inside the surface. */
const ARTBOARD_MARGIN = 24;
/* Reveal, once the mount-time fit has settled the frame's real size. Opacity
 * lands early on a plain decelerate while the scale keeps easing out to rest
 * on the iOS sheet curve — a long tail with no overshoot, so a surface this
 * large arrives settled instead of springing. */
const REVEAL_SCALE_FROM = 0.97;
const REVEAL_EASE_OUT = [0.32, 0.72, 0, 1] as const;
const REVEAL_TRANSITION = {
    opacity: { duration: 0.28, ease: "easeOut" },
    scale: { duration: 0.55, ease: REVEAL_EASE_OUT },
} as const;
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
    /** False until the mount-time fit below has run — the frame is invisible
     * until then, so the pre-clamp size never paints. */
    const [fitted, setFitted] = useState(false);
    // Reduce Motion drops the zoom; the frame still fades rather than popping
    const reduceMotion = useReducedMotion();

    // Keep the frame within the surface as the window resizes: shrink to fit,
    // and grow back toward the user's preferred size when space returns.
    useEffect(() => {
        const surface = surfaceRef.current;
        if (!surface) {
            setFitted(true); // nothing to measure against — don't stay hidden
            return;
        }
        const observer = new ResizeObserver(() => {
            const maxWidth = Math.max(WIDTH_RANGE.min, surface.clientWidth - ARTBOARD_MARGIN * 2);
            const maxHeight = Math.max(HEIGHT_RANGE.min, surface.clientHeight - ARTBOARD_MARGIN * 2);
            // "fill" (Infinity preferred) targets a fraction of the surface;
            // user-dragged sizes only clamp to what fits.
            const fill = (surfaceSize: number, max: number, range: { min: number; max: number }) =>
                Math.max(range.min, Math.min(surfaceSize * FILL_FRACTION, max));
            setSize((current) => {
                const width =
                    preferredRef.current.width === Infinity
                        ? fill(surface.clientWidth, maxWidth, WIDTH_RANGE)
                        : Math.min(preferredRef.current.width, maxWidth);
                const height =
                    preferredRef.current.height === Infinity
                        ? fill(surface.clientHeight, maxHeight, HEIGHT_RANGE)
                        : Math.min(preferredRef.current.height, maxHeight);
                return width === current.width && height === current.height ? current : { width, height };
            });
            // Same commit as the size above, so the fade starts from the fitted size
            setFitted(true);
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
                // The provisional frame can overflow the surface, so scrollbars
                // would flash alongside it — and they'd shrink clientWidth/Height,
                // fitting the frame to a surface it's about to stop scrolling.
                ...(fitted ? null : { overflow: "hidden" }),
            }}
            {...rest}
        >
            <div className="grid min-h-full place-items-center p-6">
                <motion.div
                    className="relative"
                    initial={false}
                    animate={
                        fitted
                            ? { opacity: 1, scale: 1 }
                            : { opacity: 0, scale: reduceMotion ? 1 : REVEAL_SCALE_FROM }
                    }
                    transition={REVEAL_TRANSITION}
                >
                    <div
                        className="mat-builder-artboard-frame overflow-hidden rounded-lg shadow-lg border"
                        style={{
                            width: size.width,
                            height: size.height,
                            backgroundColor: "var(--mat-builder-color-artboard-bg)",
                            // The frame AROUND the paper is chrome, so it follows the
                            // colour scheme even though the paper itself never does.
                            borderColor: "var(--mat-builder-color-artboard-border)",
                            boxShadow: "var(--mat-builder-color-artboard-shadow)",
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
                </motion.div>
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
    // Offset the target so the bar inside it lands exactly HANDLE_GAP off the frame
    const offset = -(HANDLE_GAP + (HANDLE_HIT.thickness - HANDLE_BAR.thickness) / 2);
    const hitStyle: CSSProperties = {
        [position]: offset,
        ...(horizontal
            ? {
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: HANDLE_HIT.length,
                  height: HANDLE_HIT.thickness,
                  cursor: "ns-resize",
              }
            : {
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: HANDLE_HIT.thickness,
                  height: HANDLE_HIT.length,
                  cursor: "ew-resize",
              }),
        touchAction: "none",
    };
    // Drag outlives the pointer leaving the handle, so the state is ours to keep
    // — a `whileTap`/`:active` would drop the moment the cursor moved away.
    const [hovered, setHovered] = useState(false);
    const [dragging, setDragging] = useState(false);
    const state = dragging ? HANDLE_STATES.drag : hovered ? HANDLE_STATES.hover : HANDLE_STATES.rest;
    const length = HANDLE_BAR.length + state.length;
    const thickness = HANDLE_BAR.thickness + state.thickness;

    const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        setDragging(true);
        const end = () => {
            setDragging(false);
            window.removeEventListener("pointerup", end);
            window.removeEventListener("pointercancel", end);
        };
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
        onPointerDown(event);
    };

    return (
        <div
            role="separator"
            aria-label={horizontal ? "Resize height" : "Resize width"}
            className="absolute grid place-items-center"
            style={hitStyle}
            onPointerDown={startDrag}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            onClick={(event) => event.stopPropagation()}
        >
            <motion.div
                className="rounded-full"
                initial={false}
                animate={{
                    width: horizontal ? length : thickness,
                    height: horizontal ? thickness : length,
                    backgroundColor: state.color,
                }}
                transition={HANDLE_TRANSITION}
            />
        </div>
    );
}
