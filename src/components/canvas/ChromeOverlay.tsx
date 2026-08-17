import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { BlockId } from "../../core/types.ts";
import { useBuilderContext } from "../../react/context.ts";
import { useBlockNode, useBuilderState } from "../../react/hooks.ts";
import { computeChromeGeometry, geometryChanged, RING_SLACK, type ChromeGeometry } from "./chrome-geometry.ts";
import { ChromePill } from "./ChromePill.tsx";
import { ConditionalMarkers } from "./ConditionalMarkers.tsx";

/*
 * ChromeOverlay — the per-block selection/hover chrome layer (docs/04
 * §BlockFrame). Rendered in the artboard frame's relative wrapper (via the
 * Artboard `decoration` slot), OUTSIDE the rounded overflow-hidden scroller,
 * so rings/shadows/pills never clip — the "dedicated overlay layer" the docs
 * describe. All frames draw from measured block rects, Figma-style.
 *
 * Motion split: rect placement is written imperatively by a rAF measure loop
 * (instant — a spring-lagged ring during scroll would feel broken); only
 * outline-color/box-shadow (CSS transitions in chrome.css) and the pill
 * (motion/react) animate. The loop also tracks the drag lift/settle scale on
 * the block, which ResizeObserver can't see (transforms don't change layout).
 */

type ChromeState = "hover" | "selected" | "dragging";

export function ChromeOverlay({ scrollerRef }: { scrollerRef: RefObject<HTMLDivElement | null> }) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const rootId = useBuilderState((s) => s.document.rootId);
    const selectedId = useBuilderState((s) => s.selectedId);
    const hoveredId = useBuilderState((s) => s.hoveredId);
    const drag = useBuilderState((s) => s.drag);

    const dragSourceId = drag?.kind === "move-block" ? drag.blockId : null;
    // Keyed by blockId so hover → selected → dragging on one block morphs a
    // single element and the CSS transitions carry ring/shadow between states.
    // Root is skipped: its chrome lives on the artboard frame (Canvas).
    const frames: { id: BlockId; state: ChromeState }[] = [];
    const push = (id: BlockId | null, state: ChromeState) => {
        if (id && id !== rootId && !frames.some((frame) => frame.id === id)) frames.push({ id, state });
    };
    push(dragSourceId, "dragging");
    push(selectedId, "selected");
    // Hover paints above a selected ancestor's frame; the store clears hover
    // during drags, so the gate here is just against hovering the selection
    if (!drag) push(hoveredId !== selectedId ? hoveredId : null, "hover");

    return (
        // overflow-hidden contains LAYOUT: frames are sized to measured block
        // rects, which can be far taller than the artboard (long text blocks) —
        // clip-path confines painting only, and without containment those boxes
        // grow the work surface's scroll area. Bounds are expanded by the ring
        // allowance so edge-flush rings still paint; the clip-path trims at the
        // same boundary, so nothing visible changes.
        <div
            ref={overlayRef}
            className="pointer-events-none absolute z-20 overflow-hidden"
            style={{ inset: `calc(-1 * (var(--mat-builder-chrome-ring-offset) + ${RING_SLACK}px))` }}
        >
            <AnimatePresence>
                {frames.map((frame) => (
                    <ChromeFrame
                        key={frame.id}
                        id={frame.id}
                        state={frame.state}
                        overlayRef={overlayRef}
                        scrollerRef={scrollerRef}
                    />
                ))}
            </AnimatePresence>
            {/* Persistent, not interaction-driven: one badge per conditional
                block, under the interaction frames so a selection ring and its
                handles always win the corner. */}
            <ConditionalMarkers scrollerRef={scrollerRef} />
        </div>
    );
}

interface ChromeFrameProps {
    id: BlockId;
    state: ChromeState;
    overlayRef: RefObject<HTMLDivElement | null>;
    scrollerRef: RefObject<HTMLDivElement | null>;
}

function ChromeFrame({ id, state, overlayRef, scrollerRef }: ChromeFrameProps) {
    const { registry } = useBuilderContext();
    const frameRef = useRef<HTMLDivElement>(null);
    const node = useBlockNode(id);
    const isEditing = useBuilderState((s) => s.editing?.blockId === id);
    const [pillInside, setPillInside] = useState(false);
    // Hidden until the first successful measure — never flash at 0,0
    const [attached, setAttached] = useState(false);

    useLayoutEffect(() => {
        const overlay = overlayRef.current;
        const scroller = scrollerRef.current;
        const frame = frameRef.current;
        if (!overlay || !scroller || !frame) return;

        // Chrome may paint this far outside the artboard viewport — enough for
        // the ring (live offset token + width), so edge-flush rings survive
        // while shadows/rails are cut exactly at the sheet boundary
        const ringAllowance = (parseFloat(getComputedStyle(frame).outlineOffset) || 0) + RING_SLACK;

        let raf = 0;
        let last: ChromeGeometry | null = null;
        const tick = () => {
            const target = scroller.querySelector(`[data-block-id="${CSS.escape(id)}"]`);
            if (target instanceof HTMLElement) {
                const geometry = computeChromeGeometry(
                    target.getBoundingClientRect(),
                    overlay.getBoundingClientRect(),
                    scroller.getBoundingClientRect(),
                    ringAllowance,
                );
                if (!last || geometryChanged(last, geometry)) {
                    // Placement is instant by design — only colors/shadows/pill animate
                    frame.style.transform = `translate(${geometry.x}px, ${geometry.y}px)`;
                    frame.style.width = `${geometry.width}px`;
                    frame.style.height = `${geometry.height}px`;
                    // Always confine painting to the artboard viewport (all four
                    // sides): glows never bleed onto the work surface, and the
                    // ring of a block scrolled out dies at the frame edge
                    frame.style.clipPath = `inset(${geometry.clipTop}px ${geometry.clipRight}px ${geometry.clipBottom}px ${geometry.clipLeft}px)`;
                    if (geometry.pillInside !== last?.pillInside) setPillInside(geometry.pillInside);
                    last = geometry;
                }
                setAttached(true);
            }
            raf = requestAnimationFrame(tick);
        };
        tick();
        return () => cancelAnimationFrame(raf);
    }, [id, overlayRef, scrollerRef]);

    // Deleted while chromed: render nothing — the store reselects the parent,
    // which mounts its own frame
    if (!node) return null;

    const definition = registry.getDefinition(node.type);
    const label = definition?.getDisplayName?.(node.props) ?? definition?.label ?? node.type;
    // The name-tag action bar yields to the pinned floating toolbar while
    // inline-editing (both sit at the block's top edge); ring stays
    const showPill = state === "selected" && !isEditing;

    return (
        <motion.div
            ref={frameRef}
            className="mat-builder-chrome-frame absolute left-0 top-0"
            data-state={state}
            style={{ visibility: attached ? "visible" : "hidden" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
        >
            {/* Corner handles fade in via CSS only while selected — always
                mounted so the hover ⇄ selected morph transitions them */}
            {(["tl", "tr", "bl", "br"] as const).map((corner) => (
                <span key={corner} className="mat-builder-chrome-handle" data-corner={corner} aria-hidden />
            ))}
            <AnimatePresence>
                {showPill && <ChromePill label={label} Icon={definition?.icon} inside={pillInside} />}
            </AnimatePresence>
        </motion.div>
    );
}
