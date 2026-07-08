/*
 * Pure geometry for the ChromeOverlay (docs/04 §BlockFrame): converts a
 * block's viewport rect into overlay-relative frame placement, plus the
 * vertical clip that trims chrome scrolled out of the artboard viewport
 * and the "pill flips inside" decision. Kept DOM-free so it unit-tests.
 */

/** The subset of DOMRect the math needs — tests pass plain objects. */
export interface RectLike {
    top: number;
    left: number;
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
    /** Vertical clip-path insets (px trimmed off the frame's own box); 0 = no clip */
    clipTop: number;
    clipBottom: number;
    /** Pill flips inside the block's corner when too close to the visible top */
    pillInside: boolean;
}

/**
 * Chrome the ring paints outside the block box (offset 3px + strong width
 * 2px, rounded up) — clipping starts only past this allowance so the ring
 * survives intact for blocks flush with the artboard viewport edge.
 */
export const RING_ALLOWANCE = 6;

/** Room the pill needs above the block: it spans from top -30px down to -6px (24px tall), plus a small margin. */
export const PILL_CLEARANCE = 34;

export function computeChromeGeometry(block: RectLike, overlay: RectLike, scroller: RectLike): ChromeGeometry {
    return {
        x: block.left - overlay.left,
        y: block.top - overlay.top,
        width: block.width,
        height: block.height,
        clipTop: Math.max(0, scroller.top - RING_ALLOWANCE - block.top),
        clipBottom: Math.max(0, block.bottom - (scroller.bottom + RING_ALLOWANCE)),
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
        a.clipBottom !== b.clipBottom ||
        a.pillInside !== b.pillInside
    );
}
