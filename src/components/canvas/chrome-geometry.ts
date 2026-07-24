/*
 * Pure geometry for the ChromeOverlay (docs/04 §BlockFrame): converts a
 * block's viewport rect into overlay-relative frame placement, plus the
 * clip-path insets that confine ALL chrome painting (ring, shadows, pill)
 * to the artboard viewport, and the "pill flips inside" decision. Kept
 * DOM-free so it unit-tests.
 */

/** The subset of DOMRect the math needs — tests pass plain objects. */
export interface RectLike {
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}

export interface ChromeGeometry {
    /** Frame position/size, relative to the overlay (= artboard frame box) */
    x: number;
    y: number;
    width: number;
    height: number;
    /**
     * clip-path inset() values relative to the frame's own box, always
     * applied: the chrome may paint up to the artboard viewport edge plus
     * the ring allowance, and no further. Negative values grant the paint
     * slack outside the box (ring, shadows, pill); positive values trim a
     * block scrolled past the viewport so its ring dies exactly at the
     * sheet boundary instead of dangling over the frame border.
     */
    clipTop: number;
    clipRight: number;
    clipBottom: number;
    clipLeft: number;
    /** Pill flips inside the block's corner when too close to the visible top */
    pillInside: boolean;
}

/**
 * Paint slack beyond the ring offset: the corner handles overhang the ring
 * line by half their size (8px handle → 4px), which exceeds the strong ring
 * width (2px); plus 2px slop. The caller adds the live outline-offset so
 * retheming the offset token keeps edge-flush rings and handles unclipped.
 * (Keep --mat-builder-chrome-handle-size ≤ 2 × (RING_SLACK − 2px).)
 */
export const RING_SLACK = 6;

/** Room the pill needs above the block: it spans from top -32px down to -6px (26px tall), plus a small margin. */
export const PILL_CLEARANCE = 36;

export function computeChromeGeometry(
    block: RectLike,
    overlay: RectLike,
    scroller: RectLike,
    ringAllowance: number,
): ChromeGeometry {
    return {
        x: block.left - overlay.left,
        y: block.top - overlay.top,
        width: block.width,
        height: block.height,
        clipTop: scroller.top - ringAllowance - block.top,
        clipRight: block.right - (scroller.right + ringAllowance),
        clipBottom: block.bottom - (scroller.bottom + ringAllowance),
        clipLeft: scroller.left - ringAllowance - block.left,
        pillInside: block.top - scroller.top < PILL_CLEARANCE,
    };
}

export function geometryChanged(a: ChromeGeometry, b: ChromeGeometry): boolean {
    return (
        a.x !== b.x ||
        a.y !== b.y ||
        a.width !== b.width ||
        a.height !== b.height ||
        a.clipTop !== b.clipTop ||
        a.clipRight !== b.clipRight ||
        a.clipBottom !== b.clipBottom ||
        a.clipLeft !== b.clipLeft ||
        a.pillInside !== b.pillInside
    );
}
