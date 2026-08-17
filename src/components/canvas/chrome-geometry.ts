/*
 * Pure geometry for the ChromeOverlay (docs/04 §BlockFrame): converts a
 * block's viewport rect into overlay-relative frame placement, plus the
 * clip-path insets that confine ALL chrome painting (ring, shadows, pill)
 * to the artboard viewport, and the name tag's placement decision. Kept
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

/**
 * Where the name tag sits relative to its block: above the top edge (the
 * default), flipped below the bottom edge when the top is against the visible
 * frame top, or — only when the block spans the whole viewport, so neither
 * edge has room — inside its top-left corner, over the block's own content.
 */
export type PillPlacement = "above" | "below" | "inside";

export interface ChromeGeometry {
    /** Frame position/size, relative to the overlay (= artboard frame box) */
    x: number;
    y: number;
    width: number;
    height: number;
    /**
     * clip-path inset() values relative to the frame's own box, always
     * applied: the chrome may paint up to the artboard viewport edge (plus
     * the ring allowance where the block's own edge is still inside it), and
     * no further. Negative values grant the paint slack outside the box
     * (ring, shadows, pill); positive values trim a block scrolled past the
     * viewport so its ring dies exactly at the sheet boundary instead of
     * dangling over the frame border.
     */
    clipTop: number;
    clipRight: number;
    clipBottom: number;
    clipLeft: number;
    /** Which side of the block hosts the name tag (see PillPlacement) */
    pillPlacement: PillPlacement;
    /**
     * Distance from the frame's top edge down to an "inside" pill, in px —
     * written to a custom property the pill's CSS reads. Normally the corner
     * inset; it grows to hold the pill just inside the visible frame top when
     * the block's own top has scrolled above it, since a viewport-spanning
     * block (the only kind placed inside) would otherwise carry its pill
     * off-screen and the clip-path would cut it away entirely.
     */
    pillOffset: number;
}

/**
 * Paint slack beyond the ring offset: the corner handles overhang the ring
 * line by half their size (8px handle → 4px), which exceeds the strong ring
 * width (2px); plus 2px slop. The caller adds the live outline-offset so
 * retheming the offset token keeps edge-flush rings and handles unclipped.
 * (Keep --mat-builder-chrome-handle-size ≤ 2 × (RING_SLACK − 2px).)
 */
export const RING_SLACK = 6;

/** Room the pill needs outside the block: it stands 32px off the edge (26px tall + a 6px gap), plus a small margin. */
export const PILL_CLEARANCE = 36;

/** Corner inset of an "inside" pill — matches the `top`/`left` in chrome.css. */
export const PILL_INSET = 6;

/**
 * Picks the side of the block the name tag hangs off, preferring the block's
 * own top edge and never covering the block unless it has to: a block pressed
 * against the visible frame top (a short one at the head of the email, say)
 * flips its pill under its bottom edge rather than parking it on top of the
 * content it names. Only a block spanning the whole viewport — no clearance at
 * either end — falls back to sitting inside the corner.
 */
function choosePillPlacement(block: RectLike, scroller: RectLike): PillPlacement {
    if (block.top - scroller.top >= PILL_CLEARANCE) return "above";
    if (scroller.bottom - block.bottom >= PILL_CLEARANCE) return "below";
    return "inside";
}

/**
 * One side's clip inset, from how far the block's edge sits *past* the
 * artboard viewport edge (negative while it is still inside).
 *
 * The ring allowance is granted only to an edge that is still inside: that
 * slack exists for a ring drawn AROUND a block edge, and a block running past
 * the fold has no edge there — just content the sheet cuts. Forgiving it
 * anyway let the ring rails of a scrolled block paint a few px onto the work
 * surface below the sheet, reading as chrome escaping the artboard.
 */
function clipInset(past: number, ringAllowance: number): number {
    return past > 0 ? past : past - ringAllowance;
}

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
        clipTop: clipInset(scroller.top - block.top, ringAllowance),
        clipRight: clipInset(block.right - scroller.right, ringAllowance),
        clipBottom: clipInset(block.bottom - scroller.bottom, ringAllowance),
        clipLeft: clipInset(scroller.left - block.left, ringAllowance),
        pillPlacement: choosePillPlacement(block, scroller),
        pillOffset: Math.max(PILL_INSET, scroller.top - block.top + PILL_INSET),
    };
}

/** Badge box (px) and how far it sits from the block's top-right corner. */
export const MARKER_SIZE = 18;
export const MARKER_INSET = 6;

export interface MarkerGeometry {
    /** Top-left of the badge, relative to the overlay */
    x: number;
    y: number;
    /**
     * The badge is a persistent mark on an unselected block, so it cannot be
     * clipped mid-glyph the way a ring can — it is shown only while it fits
     * entirely inside the artboard viewport, and hidden the moment its block
     * scrolls far enough that it wouldn't.
     */
    visible: boolean;
}

/**
 * Places the conditional badge in a block's top-right corner (ChromeOverlay).
 *
 * The inset collapses on blocks too small to host it — a 1px divider centers
 * the badge on its line instead of hanging it below — so the mark stays
 * attached to what it describes at any block size.
 */
export function computeMarkerGeometry(block: RectLike, overlay: RectLike, scroller: RectLike): MarkerGeometry {
    const inset = (extent: number) => Math.min(MARKER_INSET, (extent - MARKER_SIZE) / 2);
    const left = block.right - MARKER_SIZE - inset(block.width);
    const top = block.top + inset(block.height);
    return {
        x: left - overlay.left,
        y: top - overlay.top,
        visible:
            top >= scroller.top &&
            top + MARKER_SIZE <= scroller.bottom &&
            left >= scroller.left &&
            left + MARKER_SIZE <= scroller.right,
    };
}

export function markerChanged(a: MarkerGeometry, b: MarkerGeometry): boolean {
    return a.x !== b.x || a.y !== b.y || a.visible !== b.visible;
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
        a.pillPlacement !== b.pillPlacement ||
        a.pillOffset !== b.pillOffset
    );
}
